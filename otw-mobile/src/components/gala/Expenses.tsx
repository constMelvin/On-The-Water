import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Empty, StateGate } from '@/components/States';
import { Button, Card, ChoiceChips, Fab, Field, IconBlob, PageHead, Tag } from '@/components/ui';
import { createExpense, recordPayment } from '@/lib/api/gala';
import type { ExpenseCategory, ExpenseVM, SettlementPaymentVM } from '@/lib/api/types';
import { peso, type Member, type Tone } from '@/lib/otw/data';
import { CATEGORY_LABEL, explainDebt, pesoExact, type Debt, type DebtSource, type NewExpense } from '@/lib/otw/expenses';
import { burst, toast } from '@/lib/otw/feedback';
import { failed, upsertIn, useExpenses, useSettlement, useTabState } from '@/lib/otw/gala-queries';
import { useGala } from '@/lib/otw/gala-store';
import { featureKey } from '@/lib/otw/live';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { GalaPage } from './GalaShell';

/**
 * Ambagan (port of otw-client/src/components/gala/expenses/*). GET .../expenses plus the server-computed
 * GET .../expenses/settlement (transfers, payments and my four tiles). All money maths is the server's.
 */
const TZ = 'Asia/Manila';
const fmtDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: TZ });
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  return fmtDay.format(d) === fmtDay.format(new Date()) && Math.abs(Date.now() - d.getTime()) < 36 * 3600_000 ? 'Today' : fmtDay.format(d);
};
const money = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export function Expenses() {
  const { members, memberRows, nameOf, toneOf, roomId, myUserId, setViewState } = useGala();
  const qc = useQueryClient();
  const expensesQ = useExpenses();
  const settlementQ = useSettlement();
  const state = useTabState(expensesQ, settlementQ);
  const [adding, setAdding] = useState(false);
  const myId = myUserId ?? '';
  const items = expensesQ.data ?? [];
  const st = settlementQ.data;

  const people = useMemo(() => memberRows.map((m) => ({ id: m.userId, going: m.rsvpStatus === 'GOING' })), [memberRows]);
  const debts = useMemo<Debt[]>(
    () => [
      ...(st?.transfers ?? []).map((t) => ({ key: `t:${t.fromUserId}>${t.toUserId}`, from: t.fromUserId, to: t.toUserId, amount: t.amount })),
      ...(st?.payments ?? []).map((p) => ({ key: `p:${p.id}`, from: p.fromUserId, to: p.toUserId, amount: p.amount, paymentId: p.id })),
    ],
    [st],
  );

  const total = st?.totalExpenses ?? 0;
  const share = st?.me?.share ?? 0;
  const youPaid = st?.me?.paid ?? 0;
  const owed = st?.me?.remaining ?? 0;
  const expensesKey = featureKey(roomId, 'expenses');
  const keys = [expensesKey, featureKey(roomId, 'settlement'), featureKey(roomId, 'summary')];
  const refresh = () => keys.slice(1).forEach((k) => void qc.invalidateQueries({ queryKey: k }));
  const openAdd = () => setAdding(true);

  const onAdd = async (input: NewExpense) => {
    if (!(input.amount > 0)) return toast('Add an amount first.', 'err');
    if (input.splitWith.length === 0) return toast('Pick at least one person.', 'err');
    if (!roomId) return;
    try {
      const row = await createExpense(roomId, {
        description: input.description.trim() || 'Expense',
        amount: Math.round(input.amount * 100) / 100,
        paidBy: input.paidBy,
        category: input.category,
        splitWithUserIds: input.splitWith,
      });
      upsertIn(qc, expensesKey, row);
      refresh();
      setAdding(false);
      toast('Expense added and split.');
      burst();
    } catch (e) {
      failed(qc, keys, e, "Couldn't add that expense.");
    }
  };

  const onPaid = async (d: Debt) => {
    if (!roomId) return;
    try {
      await recordPayment(roomId, d.from, d.to);
      toast('Marked as paid.');
      const outstanding = debts.filter((x) => !x.paymentId);
      if (outstanding.length === 1 && outstanding[0].key === d.key) burst();
      refresh();
    } catch (e) {
      failed(qc, keys, e, "Couldn't mark that as paid.");
    }
  };

  const tile = (amount: number, label: string, bg: string, fg: string, sh: string) => (
    <View style={styles.tileCell}>
      <View style={[styles.tileShadow, { backgroundColor: sh }]} />
      <View style={[styles.tile, { backgroundColor: bg }]}>
        <Text style={[styles.tileNum, { color: fg }]}>{peso(amount)}</Text>
        <Text style={[styles.tileLbl, { color: fg }]}>{label}</Text>
      </View>
    </View>
  );
  const { colors } = useTheme();

  return (
    <GalaPage overlay={<Fab label="Add expense" onPress={openAdd} />}>
      <PageHead title="Okay, sino nag-abono?" sub="Track what was actually spent and who still owes whom." tag={<Tag icon="wallet">Ambagan</Tag>} />
      <StateGate
        state={state}
        kind="expenses"
        onAction={() => {
          setViewState('default');
          openAdd();
        }}
        onRetry={async () => {
          setViewState('default');
          const [a, b] = await Promise.all([expensesQ.refetch(), settlementQ.refetch()]);
          return a.isSuccess && b.isSuccess;
        }}>
        {items.length === 0 ? (
          <Empty kind="expenses" onAction={openAdd} />
        ) : (
          <>
            <View style={styles.tiles}>
              {tile(total, 'Total spent', colors.surface, colors.text, colors.line)}
              {tile(share, 'Your share', brand.blossom, brand.tealDark, brand.rosy)}
              {tile(youPaid, "You've paid", brand.zest, brand.tealDark, brand.zestDark)}
              {tile(Math.abs(owed), `Remaining · ${owed > 0 ? "you're owed" : owed < 0 ? 'you owe' : 'all clear'}`, brand.teal, brand.cream, brand.tealDark)}
            </View>
            <ExpenseList items={items} members={members} nameOf={nameOf} onAdd={openAdd} />
            <WhoOwes
              debts={debts}
              settled={!!st?.settled}
              myId={myId}
              members={members}
              nameOf={nameOf}
              expenses={items}
              payments={st?.payments ?? []}
              onPaid={onPaid}
            />
          </>
        )}
      </StateGate>
      {adding ? (
        <AddExpenseSheet people={people} nameOf={nameOf} toneOf={toneOf} defaultPaidBy={myId} onAdd={onAdd} onClose={() => setAdding(false)} />
      ) : null}
    </GalaPage>
  );
}

function ExpenseList({ items, members, nameOf, onAdd }: { items: ExpenseVM[]; members: Member[]; nameOf: (id: string) => string; onAdd: () => void }) {
  const { colors } = useTheme();
  return (
    <Card>
      <View style={styles.rh}>
        <Text style={[styles.h3, { color: colors.text }]}>Expenses</Text>
        <Button sm fw={false} icon="plus" label="Add expense" onPress={onAdd} />
      </View>
      {items.map((e) => {
        const who = nameOf(e.paidBy);
        return (
          <View key={e.id} style={[styles.erow, { borderTopColor: colors.line }]}>
            <Avatar name={who} tone={members.find((m) => m.id === e.paidBy)?.c} size={34} userId={e.paidBy} />
            <View style={styles.eb}>
              <Text style={[styles.eName, { color: colors.text }]}>{e.description}</Text>
              <Tag variant="blossom">{CATEGORY_LABEL[e.category]}</Tag>
              <Text style={[styles.eSub, { color: colors.text }]}>
                Paid by {who} · {dayLabel(e.createdAt)} · split {e.shares.length} ways
              </Text>
            </View>
            <Text style={[styles.ea, { color: colors.text }]}>{peso(e.amount)}</Text>
          </View>
        );
      })}
    </Card>
  );
}

function caption(sources: DebtSource[]): string {
  const named = sources.filter((x) => x.kind === 'expense');
  if (!named.length) return 'Netted with the rest of the group';
  const top = [...named]
    .sort((a, b) => b.cents - a.cents)
    .slice(0, 2)
    .map((x) => x.label);
  const more = named.length - top.length;
  return top.join(' · ') + (more > 0 ? ` +${more}` : '');
}

function WhoOwes({
  debts,
  settled,
  myId,
  members,
  nameOf,
  expenses,
  payments,
  onPaid,
}: {
  debts: Debt[];
  settled: boolean;
  myId: string;
  members: Member[];
  nameOf: (id: string) => string;
  expenses: ExpenseVM[];
  payments: SettlementPaymentVM[];
  onPaid: (d: Debt) => void | Promise<void>;
}) {
  const { colors } = useTheme();
  const mine = debts.filter((d) => d.to === myId || d.from === myId);
  const others = debts.filter((d) => !(d.to === myId || d.from === myId));
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setOpen((cur) => {
      const next = new Set(cur);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const row = (d: Debt) => {
    const done = !!d.paymentId;
    const from = nameOf(d.from);
    const to = nameOf(d.to);
    const sources = done ? [] : explainDebt(d, expenses, payments);
    const isOpen = open.has(d.key);
    return (
      <View key={d.key} style={[styles.dwrap, { backgroundColor: colors.surface2 }, done && { opacity: 0.7 }]}>
        <View style={styles.drow}>
          <Avatar name={from} tone={members.find((m) => m.id === d.from)?.c} size={30} userId={d.from} />
          <Text style={[styles.dt, { color: colors.text }]}>
            {d.from === myId ? 'You owe' : `${from} owes`} <Text style={{ fontFamily: font.bodyHeavy }}>{d.to === myId ? 'you' : to}</Text>
          </Text>
          <Text style={[styles.da, { color: colors.text }]}>{peso(d.amount)}</Text>
        </View>
        <View style={styles.dact}>
          {done ? (
            <Tag variant="st-g" icon="check">
              Paid
            </Tag>
          ) : (
            <Button sm fw={false} variant="teal" label="Mark paid" onPress={() => void onPaid(d)} />
          )}
        </View>
        {sources.length > 0 ? (
          <>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={() => toggle(d.key)} style={styles.why}>
              <Text style={[styles.whyText, { color: colors.text }]}>Galing sa: {caption(sources)}</Text>
              <Icon name={isOpen ? 'chevu' : 'chevd'} size={16} color={colors.text} />
            </Pressable>
            {isOpen
              ? sources.map((x) => (
                  <View key={x.key} style={styles.sline}>
                    {x.category ? (
                      <Tag variant="blossom">{CATEGORY_LABEL[x.category]}</Tag>
                    ) : x.kind === 'payment' ? (
                      <Tag variant="st-g" icon="check">
                        Paid
                      </Tag>
                    ) : (
                      <Tag variant="cream">Netted</Tag>
                    )}
                    <Text style={[styles.sl, { color: colors.text }]} numberOfLines={1}>
                      {x.label}
                    </Text>
                    <Text style={[styles.sa, { color: x.cents < 0 ? colors.rosyInk : colors.text }]}>
                      {x.cents < 0 ? '−' : ''}
                      {pesoExact(x.cents)}
                    </Text>
                  </View>
                ))
              : null}
          </>
        ) : null}
      </View>
    );
  };

  return (
    <Card>
      <Text style={[styles.h3, { color: colors.text }]}>Who owes whom</Text>
      {settled ? (
        <View style={styles.settled}>
          <IconBlob name="burst" index={4} size={80} iconSize={40} />
          <Text style={[styles.h3, { color: colors.text, textAlign: 'center' }]}>All settled. Walang may habol.</Text>
        </View>
      ) : null}
      <Text style={[styles.sh, { color: colors.text }]}>With you</Text>
      {mine.length ? mine.map(row) : <Text style={[styles.fine, { color: colors.text }]}>Nothing between you and anyone.</Text>}
      {others.length > 0 ? (
        <>
          <Text style={[styles.sh, { color: colors.text }]}>Everyone else</Text>
          {others.map(row)}
        </>
      ) : null}
    </Card>
  );
}

function AddExpenseSheet({
  people,
  nameOf,
  toneOf,
  defaultPaidBy,
  onAdd,
  onClose,
}: {
  people: { id: string; going: boolean }[];
  nameOf: (id: string) => string;
  toneOf: (id: string) => Tone | undefined;
  defaultPaidBy: string;
  onAdd: (input: NewExpense) => Promise<void>;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(defaultPaidBy);
  const [category, setCategory] = useState<ExpenseCategory>('FOOD');
  const [shared, setShared] = useState<Set<string>>(() => new Set(people.map((p) => p.id)));
  const [busy, setBusy] = useState(false);
  const count = shared.size;
  const typed = Number(amount) || 0;
  const goingIds = people.filter((p) => p.going).map((p) => p.id);
  const toggle = (id: string) =>
    setShared((cur) => {
      const next = new Set(cur);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const submit = async () => {
    if (busy || count === 0) return;
    setBusy(true);
    try {
      await onAdd({
        description,
        amount: Math.max(0, typed),
        paidBy,
        category,
        splitWith: people.filter((p) => shared.has(p.id)).map((p) => p.id),
      });
    } finally {
      setBusy(false);
    }
  };
  const payerName = paidBy === defaultPaidBy ? 'mo' : `ni ${nameOf(paidBy)}`;

  return (
    <Sheet
      title="Add an expense"
      onClose={onClose}
      footer={
        <>
          <Button label="Add expense" onPress={() => void submit()} busy={busy} disabled={count === 0} />
          <Button variant="ghost" label="Cancel" onPress={onClose} />
        </>
      }>
      <Field label="What was it?" placeholder="Jeepney, dinner, entrance fee…" value={description} onChangeText={setDescription} />
      <Field label="Amount" placeholder="₱0" keyboardType="decimal-pad" value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))} />
      <ChoiceChips label="Paid by" value={paidBy} onChange={setPaidBy} options={people.map((p) => ({ value: p.id, label: nameOf(p.id) }))} />
      <ChoiceChips
        label="Category"
        value={category}
        onChange={setCategory}
        options={(Object.keys(CATEGORY_LABEL) as ExpenseCategory[]).map((k) => ({ value: k, label: CATEGORY_LABEL[k] }))}
      />
      <Text style={[styles.legend, { color: colors.text }]}>Sino-sino ang mag-aambagan?</Text>
      <View style={styles.quick}>
        <Button sm fw={false} variant="cream" label="Everyone" onPress={() => setShared(new Set(people.map((p) => p.id)))} />
        <Button sm fw={false} variant="cream" label="Only the G's" disabled={goingIds.length === 0} onPress={() => setShared(new Set(goingIds))} />
      </View>
      <View style={styles.pchips}>
        {people.map((p) => {
          const on = shared.has(p.id);
          return (
            <Pressable
              key={p.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggle(p.id)}
              style={[styles.pchip, on ? { backgroundColor: brand.teal, borderColor: brand.teal } : { borderColor: colors.line, backgroundColor: colors.surface }]}>
              <Avatar name={nameOf(p.id)} tone={toneOf(p.id)} size={24} userId={p.id} />
              <Text style={[styles.pchipText, { color: on ? brand.cream : colors.text }]}>
                {nameOf(p.id)}
                {p.id === defaultPaidBy ? ' (you)' : ''}
              </Text>
              {on ? <Icon name="check" size={16} color={brand.cream} /> : null}
            </Pressable>
          );
        })}
      </View>
      {count === 0 ? (
        <Text style={[styles.fine, { color: colors.rosyInk }]} accessibilityRole="alert">
          Pick at least one person.
        </Text>
      ) : (
        <Text style={[styles.fine, { color: colors.text }]} accessibilityLiveRegion="polite">
          Split equally between {count} {count === 1 ? 'person' : 'people'}
          {typed > 0 ? ` · about ₱${money.format(typed / count)} each` : ''}.
        </Text>
      )}
      {count > 0 && !shared.has(paidBy) ? <Text style={[styles.fine, { color: colors.text }]}>Libre {payerName} &apos;to. Not in the split.</Text> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  tileCell: { width: '50%', padding: 5, paddingBottom: 11 },
  tileShadow: { position: 'absolute', left: 5, right: 5, top: 11, bottom: 5, borderRadius: 22 },
  tile: { borderRadius: 22, padding: 14, minHeight: 88, justifyContent: 'center' },
  tileNum: { fontFamily: font.display, fontSize: 24 },
  tileLbl: { fontFamily: font.bodyHeavy, fontSize: 13 },
  rh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h3: { fontFamily: font.displaySemi, fontSize: 20 },
  erow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderTopWidth: 2, borderStyle: 'dashed', paddingTop: 10 },
  eb: { flex: 1, gap: 4 },
  eName: { fontFamily: font.bodyHeavy, fontSize: 16 },
  eSub: { fontFamily: font.bodyBold, fontSize: 13, opacity: 0.85 },
  ea: { fontFamily: font.display, fontSize: 18 },
  sh: { fontFamily: font.displaySemi, fontSize: 16, marginTop: 6 },
  fine: { fontFamily: font.body, fontSize: 14, opacity: 0.9 },
  settled: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  dwrap: { borderRadius: 18, padding: 10, gap: 8 },
  drow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dt: { flex: 1, fontFamily: font.bodyBold, fontSize: 15 },
  da: { fontFamily: font.display, fontSize: 17 },
  dact: { flexDirection: 'row', justifyContent: 'flex-end' },
  why: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  whyText: { flex: 1, fontFamily: font.bodyBold, fontSize: 13 },
  sline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sl: { flex: 1, fontFamily: font.bodyBold, fontSize: 13 },
  sa: { fontFamily: font.bodyHeavy, fontSize: 13 },
  legend: { fontFamily: font.bodyHeavy, fontSize: 15 },
  quick: { flexDirection: 'row', gap: 8 },
  pchips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pchip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 3, borderRadius: 999, paddingVertical: 4, paddingLeft: 4, paddingRight: 12 },
  pchipText: { fontFamily: font.bodyHeavy, fontSize: 14 },
});
