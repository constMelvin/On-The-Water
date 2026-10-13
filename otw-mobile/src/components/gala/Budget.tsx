import { useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { Empty, ErrorState, Offline, Sk } from '@/components/States';
import { Button, Card, IconButton, Lnk, PageHead, Tag } from '@/components/ui';
import { isApiError } from '@/lib/api/client';
import { saveBudget } from '@/lib/api/gala';
import type { BudgetVM } from '@/lib/api/types';
import { MAX_PEOPLE, MIN_PEOPLE, toCents, totalWithCustom, withTotals, type BudgetCategory } from '@/lib/otw/budget';
import { CUSTOM_ICONS, CUSTOM_MAX, DEFAULT_ICON, NAME_MAX, addCategory, removeCategory, updateCategory, useCustomCategories, type CustomCategory } from '@/lib/otw/budget-custom';
import { peso } from '@/lib/otw/data';
import { toast } from '@/lib/otw/feedback';
import { useBudget, useTabState } from '@/lib/otw/gala-queries';
import { useGala } from '@/lib/otw/gala-store';
import { featureKey } from '@/lib/otw/live';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { GalaPage } from './GalaShell';
import { galaHref } from './nav';

/**
 * Gastos (budget estimator), port of otw-client/src/components/gala/budget/*. Edits update a local draft right
 * away (totals, per person and the split bar recompute live), then one PUT per burst of edits saves the estimate.
 * Custom categories live on this phone only (lib/otw/budget-custom.ts), like on the web.
 */
const SAVE_DELAY_MS = 600;

const CATS: [key: BudgetCategory, label: string, icon: IconName, color: string][] = [
  ['transportAmount', 'Transportation', 'bus', brand.teal],
  ['stayAmount', 'Stay', 'home', brand.rosy],
  ['foodAmount', 'Food', 'food', brand.zest],
  ['activitiesAmount', 'Activities', 'flag', brand.blossom],
  ['otherAmount', 'Other', 'more', brand.tealDark],
];
const CUSTOM_COLORS = [brand.rosyDark, brand.zestDark, brand.teal, brand.rosy, brand.zest, brand.blossom, brand.tealDark];
const customColor = (tone: number) => CUSTOM_COLORS[tone % CUSTOM_COLORS.length];

interface BudgetLine {
  key: string;
  label: string;
  color: string;
  amount: number;
}

export function Budget() {
  const { roomId, setViewState } = useGala();
  const qc = useQueryClient();
  const q = useBudget();
  const tabState = useTabState(q);
  const [draft, setDraft] = useState<BudgetVM | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const value = draft ?? q.data;
  const neverSaved = !draft && !!q.data && q.data.updatedBy === null;
  const [started, setStarted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef<BudgetVM | null>(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const save = useCallback(async (): Promise<boolean> => {
    const next = latest.current;
    if (!roomId || !next) return false;
    try {
      const saved = await saveBudget(roomId, {
        transportAmount: next.transportAmount,
        stayAmount: next.stayAmount,
        foodAmount: next.foodAmount,
        activitiesAmount: next.activitiesAmount,
        otherAmount: next.otherAmount,
        participantCount: next.participantCount,
      });
      qc.setQueryData(featureKey(roomId, 'budget'), saved);
      void qc.invalidateQueries({ queryKey: featureKey(roomId, 'summary') });
      if (latest.current === next) {
        latest.current = null;
        setDraft(null);
      }
      setSaveFailed(false);
      toast('Budget updated.');
      return true;
    } catch (e) {
      if (isApiError(e) && e.status === 403) {
        latest.current = null;
        setDraft(null);
        toast(e.message || 'Only the Gala Leader can edit the budget right now.', 'err');
        return false;
      }
      setSaveFailed(true);
      return false;
    }
  }, [roomId, qc]);

  const edit = (change: (b: BudgetVM) => BudgetVM | null) => {
    if (!value) return;
    const next = change(value);
    if (!next) return;
    latest.current = next;
    setDraft(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), SAVE_DELAY_MS);
  };

  const onAmount = (category: BudgetCategory, pesos: number) =>
    edit((b) => {
      const amount = toCents(pesos) / 100;
      return b[category] === amount ? null : withTotals({ ...b, [category]: amount });
    });

  const onStep = (delta: number) =>
    edit((b) => {
      const n = Math.max(MIN_PEOPLE, Math.min(MAX_PEOPLE, b.participantCount + delta));
      return n === b.participantCount ? null : withTotals({ ...b, participantCount: n });
    });

  const customs = useCustomCategories(roomId);
  const onAddCustom = (label: string, icon: IconName): string | null => {
    if (!roomId) return "Couldn't add that yet. Try again in a moment.";
    const r = addCategory(roomId, label, icon);
    if (!r.ok) return r.error;
    toast('Category added.');
    return null;
  };
  const onEditCustom = (id: string, label: string, icon: IconName): string | null => {
    if (!roomId) return null;
    const error = updateCategory(roomId, id, { label, icon });
    if (!error) toast('Category updated.');
    return error;
  };

  const state = saveFailed && tabState === 'default' ? 'error' : tabState;
  const showEmpty = state === 'empty' || (state === 'default' && neverSaved && !started);

  let body;
  if (!value && state === 'error') {
    body = (
      <ErrorState
        kind="budget"
        title="The budget didn't load."
        body="Your estimate is safe. Try again."
        onRetry={async () => {
          setViewState('default');
          return (await q.refetch()).isSuccess;
        }}
      />
    );
  } else if (state === 'loading' || !value) {
    body = (
      <>
        <Sk height={360} />
        <Sk height={90} />
        <Sk height={90} />
      </>
    );
  } else if (showEmpty) {
    body = (
      <Empty
        kind="budget"
        onAction={() => {
          setStarted(true);
          setViewState('default');
        }}
      />
    );
  } else {
    const lines: BudgetLine[] = [
      ...CATS.map(([k, label, , color]) => ({ key: k, label, color, amount: value[k] })),
      ...customs.map((c) => ({ key: c.id, label: c.label, color: customColor(c.tone), amount: c.amount })),
    ];
    const totals = totalWithCustom(
      value,
      customs.map((c) => c.amount),
    );
    body = (
      <>
        {state === 'offline' ? <Offline /> : null}
        {state === 'error' ? (
          <ErrorState
            kind="budget"
            onRetry={async () => {
              setViewState('default');
              if (latest.current) return save();
              return (await q.refetch()).isSuccess;
            }}
          />
        ) : null}
        <CostInputs
          value={value}
          onAmount={onAmount}
          onStep={onStep}
          customs={customs}
          onCustomAmount={(id, pesos) => roomId && updateCategory(roomId, id, { amount: pesos })}
          onAddCustom={onAddCustom}
          onEditCustom={onEditCustom}
          onRemoveCustom={(id) => {
            if (!roomId) return;
            removeCategory(roomId, id);
            toast('Category removed.');
          }}
        />
        <Results lines={lines} total={totals.total} perPerson={totals.perPerson} />
      </>
    );
  }

  return (
    <GalaPage>
      <PageHead title="Let's talk gastos." sub="Estimate the budget before anyone starts saying, “Magkano ba kailangan?”" tag={<Tag icon="calc">Before the gala</Tag>} />
      {body}
    </GalaPage>
  );
}

function CostInputs({
  value,
  onAmount,
  onStep,
  customs,
  onCustomAmount,
  onAddCustom,
  onEditCustom,
  onRemoveCustom,
}: {
  value: BudgetVM;
  onAmount: (category: BudgetCategory, pesos: number) => void;
  onStep: (delta: number) => void;
  customs: CustomCategory[];
  onCustomAmount: (id: string, pesos: number) => void;
  onAddCustom: (label: string, icon: IconName) => string | null;
  onEditCustom: (id: string, label: string, icon: IconName) => string | null;
  onRemoveCustom: (id: string) => void;
}) {
  const { colors } = useTheme();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const ico = (icon: IconName) => (
    <View style={[styles.icoSm, { backgroundColor: colors.surface2 }]}>
      <Icon name={icon} size={20} color={brand.rosy} />
    </View>
  );

  return (
    <Card shadow={brand.tealDark}>
      <Text style={[styles.h3, { color: colors.text }]}>Estimated costs</Text>
      {CATS.map(([k, label, icon]) => (
        <View key={k} style={styles.row}>
          {ico(icon)}
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
          <AmountInput label={label} value={value[k]} onChange={(p) => onAmount(k, p)} />
        </View>
      ))}
      {customs.map((c) =>
        editingId === c.id ? (
          <CategoryForm
            key={c.id}
            initialName={c.label}
            initialIcon={c.icon}
            submitLabel="Save"
            onSubmit={(label, icon) => {
              const error = onEditCustom(c.id, label, icon);
              if (!error) setEditingId(null);
              return error;
            }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <View key={c.id} style={styles.row}>
            {ico(c.icon)}
            <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
              {c.label}
            </Text>
            <AmountInput label={c.label} value={c.amount} onChange={(p) => onCustomAmount(c.id, p)} />
            <IconButton icon="edit" size={16} label={`Rename ${c.label}`} onPress={() => (setAdding(false), setEditingId(c.id))} />
            <IconButton icon="x" size={16} label={`Remove ${c.label}`} onPress={() => onRemoveCustom(c.id)} />
          </View>
        ),
      )}
      {adding ? (
        <CategoryForm
          submitLabel="Add"
          onSubmit={(label, icon) => {
            const error = onAddCustom(label, icon);
            if (!error) setAdding(false);
            return error;
          }}
          onCancel={() => setAdding(false)}
        />
      ) : customs.length < CUSTOM_MAX ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => (setEditingId(null), setAdding(true))}
          style={[styles.addrow, { borderColor: colors.line }]}>
          <Icon name="plus" size={18} color={colors.text} />
          <Text style={[styles.addText, { color: colors.text }]}>Add a category</Text>
        </Pressable>
      ) : null}
      <View style={[styles.row, styles.people, { borderTopColor: colors.line }]}>
        {ico('users')}
        <Text style={[styles.label, { color: colors.text }]}>How many people?</Text>
        <View style={[styles.stepper, { backgroundColor: colors.surface2 }]}>
          <IconButton icon="chevl" size={18} label="Fewer people" onPress={() => onStep(-1)} />
          <Text style={[styles.stepNum, { color: colors.text }]} accessibilityLiveRegion="polite">
            {value.participantCount}
          </Text>
          <IconButton icon="chevr" size={18} label="More people" onPress={() => onStep(1)} />
        </View>
      </View>
    </Card>
  );
}

function CategoryForm({
  initialName = '',
  initialIcon = DEFAULT_ICON,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialName?: string;
  initialIcon?: IconName;
  submitLabel: string;
  onSubmit: (label: string, icon: IconName) => string | null;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState<IconName>(initialIcon);
  const [error, setError] = useState('');
  const submit = () => setError(onSubmit(name, icon) ?? '');
  return (
    <View style={[styles.cform, { backgroundColor: colors.surface2 }]}>
      <TextInput
        autoFocus
        value={name}
        maxLength={NAME_MAX}
        placeholder="Category name, e.g. Photographer"
        placeholderTextColor={colors.text + '80'}
        accessibilityLabel="Category name"
        onChangeText={(v) => (setName(v), setError(''))}
        onSubmitEditing={submit}
        style={[styles.in, { backgroundColor: colors.fieldBg, color: colors.text, borderColor: error ? brand.rosyDark : brand.teal }]}
      />
      <View style={styles.ipick} accessibilityRole="radiogroup" accessibilityLabel="Icon">
        {CUSTOM_ICONS.map((n) => {
          const on = icon === n;
          return (
            <Pressable
              key={n}
              accessibilityRole="radio"
              accessibilityLabel={n}
              accessibilityState={{ selected: on }}
              onPress={() => setIcon(n)}
              style={[styles.ipb, on ? { backgroundColor: brand.teal } : { backgroundColor: colors.surface }]}>
              <Icon name={n} size={18} color={on ? brand.cream : colors.text} />
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={[styles.cerr, { color: colors.rosyInk }]}>{error}</Text> : null}
      <View style={styles.cbtns}>
        <Button sm fw={false} label={submitLabel} onPress={submit} />
        <Button sm fw={false} variant="ghost" label="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
}

/** Number field that writes through on every change; shows what was typed while focused. */
function AmountInput({ label, value, onChange }: { label: string; value: number; onChange: (pesos: number) => void }) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <View style={[styles.peso, { backgroundColor: colors.fieldBg, borderColor: brand.teal }]}>
      <Text style={[styles.pesoSign, { color: colors.text }]}>₱</Text>
      <TextInput
        accessibilityLabel={`${label} estimate`}
        keyboardType="numeric"
        value={draft ?? String(value)}
        onChangeText={(v) => {
          const clean = v.replace(/[^0-9.]/g, '');
          setDraft(clean);
          onChange(Number(clean) || 0);
        }}
        onBlur={() => setDraft(null)}
        style={[styles.num, { color: colors.text }]}
      />
    </View>
  );
}

function Results({ lines, total, perPerson }: { lines: BudgetLine[]; total: number; perPerson: number }) {
  const { colors } = useTheme();
  const { roomId } = useGala();
  return (
    <>
      <View style={styles.bigRow}>
        <View style={styles.flex}>
          <Card bg={brand.zest} shadow={brand.zestDark}>
            <Text style={[styles.bigLabel, { color: brand.tealDark }]}>Estimated total</Text>
            <Text style={[styles.bigNum, { color: brand.tealDark }]}>{peso(total)}</Text>
          </Card>
        </View>
        <View style={styles.flex}>
          <Card bg={brand.rosy} shadow={brand.rosyDark}>
            <Text style={[styles.bigLabel, { color: brand.cream }]}>Estimated per person</Text>
            <Text style={[styles.bigNum, { color: brand.cream }]}>{peso(perPerson)}</Text>
          </Card>
        </View>
      </View>
      <Card shadow={brand.tealDark}>
        <View style={[styles.split, { backgroundColor: colors.surface2 }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {lines.map((l) => (
            <View key={l.key} style={{ width: `${total ? (l.amount / total) * 100 : 0}%`, backgroundColor: l.color }} />
          ))}
        </View>
        {lines.map((l) => (
          <View key={l.key} style={styles.legend}>
            <View style={[styles.swatch, { backgroundColor: l.color }]} />
            <Text style={[styles.lname, { color: colors.text }]} numberOfLines={1}>
              {l.label}
            </Text>
            <Text style={[styles.lamt, { color: colors.text }]}>{peso(l.amount)}</Text>
          </View>
        ))}
      </Card>
      <Lnk label="Ready to track real spending? Go to Ambagan" onPress={() => router.navigate(galaHref(roomId!, 'ambagan') as Href)} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  h3: { fontFamily: font.displaySemi, fontSize: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  icoSm: { width: 38, height: 38, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontFamily: font.bodyHeavy, fontSize: 15 },
  peso: { flexDirection: 'row', alignItems: 'center', borderWidth: 3, borderRadius: 16, paddingLeft: 10, width: 124 },
  pesoSign: { fontFamily: font.bodyHeavy, fontSize: 16 },
  num: { flex: 1, fontFamily: font.bodyBold, fontSize: 17, paddingVertical: 8, paddingHorizontal: 6, textAlign: 'right' },
  addrow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 3, borderStyle: 'dashed', borderRadius: 18, paddingVertical: 10, justifyContent: 'center' },
  addText: { fontFamily: font.bodyHeavy, fontSize: 15 },
  people: { borderTopWidth: 3, borderStyle: 'dashed', paddingTop: 12, marginTop: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 999 },
  stepNum: { fontFamily: font.display, fontSize: 20, minWidth: 28, textAlign: 'center' },
  cform: { borderRadius: 18, padding: 12, gap: 10 },
  in: { borderWidth: 3, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, fontFamily: font.bodyBold, fontSize: 16 },
  ipick: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ipb: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cerr: { fontFamily: font.bodyHeavy, fontSize: 14 },
  cbtns: { flexDirection: 'row', gap: 8 },
  bigRow: { flexDirection: 'row', gap: 10 },
  bigLabel: { fontFamily: font.bodyHeavy, fontSize: 13 },
  bigNum: { fontFamily: font.display, fontSize: 26 },
  split: { flexDirection: 'row', height: 22, borderRadius: 11, overflow: 'hidden', marginBottom: 6 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  lname: { flex: 1, fontFamily: font.bodyHeavy, fontSize: 14 },
  lamt: { fontFamily: font.bodyHeavy, fontSize: 14 },
});
