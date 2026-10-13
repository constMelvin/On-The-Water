import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Sheet } from '@/components/Sheet';
import { Empty, StateGate } from '@/components/States';
import { Button, Card, CheckBox, ChoiceChips, Fab, Field, IconButton, PageHead, ProgressBar, SegmentedControl } from '@/components/ui';
import { claimChecklistItem, createChecklistItem, deleteChecklistItem, updateChecklistItem } from '@/lib/api/gala';
import type { ChecklistItemVM } from '@/lib/api/types';
import type { Member } from '@/lib/otw/data';
import { burst, toast } from '@/lib/otw/feedback';
import { failed, removeFrom, upsertIn, useChecklist, useTabState } from '@/lib/otw/gala-queries';
import { useGala } from '@/lib/otw/gala-store';
import { featureKey } from '@/lib/otw/live';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { GalaPage } from './GalaShell';

/**
 * Checklist tab (port of otw-client/src/components/gala/checklist/*). GET /rooms/{roomId}/checklist; every write
 * sends the item's version (a stale one is a 409: toast + refetch). Other members' edits arrive over realtime.
 */
type Filter = 'all' | 'mine' | 'done';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'Mine' },
  { value: 'done', label: 'Done' },
];

export function Checklist() {
  const { members, nameOf, roomId, myUserId, setViewState } = useGala();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const q = useChecklist();
  const state = useTabState(q);
  const key = featureKey(roomId, 'checklist');
  const summaryKey = featureKey(roomId, 'summary');
  const items = q.data ?? [];
  const [filter, setFilter] = useState<Filter>('all');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<ChecklistItemVM | null>(null);
  const myId = myUserId ?? '';

  /** Shows the change right away, then swaps in the server's row (or rolls back on failure). */
  const write = (it: ChecklistItemVM, local: Partial<ChecklistItemVM>, send: () => Promise<ChecklistItemVM>) => {
    if (!roomId) return;
    upsertIn(qc, key, { ...it, ...local });
    send()
      .then((row) => {
        upsertIn(qc, key, row);
        void qc.invalidateQueries({ queryKey: summaryKey });
      })
      .catch((e: unknown) => failed(qc, [key], e, "Couldn't update the checklist."));
  };

  const onToggle = (it: ChecklistItemVM) => {
    const isDone = !it.isDone;
    write(it, { isDone, doneBy: isDone ? myId : null }, () => updateChecklistItem(roomId!, it.id, { isDone, version: it.version }));
    // Checking the last open item finishes the list.
    if (isDone && items.every((x) => x.id === it.id || x.isDone)) burst();
  };

  const onClaim = (it: ChecklistItemVM) => {
    write(it, { assignedTo: myId }, () => claimChecklistItem(roomId!, it.id, it.version));
    toast("It's yours now.");
  };

  const onDelete = (it: ChecklistItemVM) => {
    if (!roomId) return;
    setDeleting(null);
    removeFrom(qc, key, it.id);
    deleteChecklistItem(roomId, it.id)
      .then(() => {
        toast('Item removed.');
        void qc.invalidateQueries({ queryKey: summaryKey });
      })
      .catch((e: unknown) => failed(qc, [key], e, "Couldn't remove that item."));
  };

  const onAdd = async (label: string, assignedTo: string | null) => {
    if (!roomId) return;
    try {
      const row = await createChecklistItem(roomId, label.trim() || 'New item', assignedTo);
      upsertIn(qc, key, row);
      void qc.invalidateQueries({ queryKey: summaryKey });
      setAdding(false);
      toast('Item added to the checklist.');
    } catch (e) {
      failed(qc, [key], e, "Couldn't add that item.");
    }
  };

  const packed = items.filter((it) => it.isDone).length;
  const pct = items.length ? Math.round((packed / items.length) * 100) : 0;
  const allPacked = items.length > 0 && packed === items.length;
  const shown = items.filter((it) => filter === 'all' || (filter === 'mine' && it.assignedTo === myId) || (filter === 'done' && it.isDone));
  const openAdd = () => setAdding(true);

  return (
    <GalaPage overlay={<Fab label="Add to Checklist" onPress={openAdd} />}>
      <PageHead title="Don't forget the important stuff." sub="Because someone always forgets the charger." />
      <StateGate
        state={state}
        kind="checklist"
        onAction={() => {
          setViewState('default');
          openAdd();
        }}
        onRetry={async () => {
          setViewState('default');
          return (await q.refetch()).isSuccess;
        }}>
        {items.length === 0 ? (
          <Empty kind="checklist" onAction={openAdd} />
        ) : (
          <>
            <Card>
              <View style={styles.rh}>
                <Text style={[styles.b, { color: colors.text }]}>
                  {packed} of {items.length} packed
                </Text>
                <Text style={[styles.b, { color: colors.text }]}>{pct}%</Text>
              </View>
              <ProgressBar value={pct} label={`${packed} of ${items.length} packed`} />
              {allPacked ? <Text style={[styles.fine, { color: colors.text }]}>All packed. Walang naiwan.</Text> : null}
            </Card>
            <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} label="Show" />
            {shown.length ? (
              shown.map((it) => (
                <ChecklistRow
                  key={it.id}
                  item={it}
                  members={members}
                  who={it.assignedTo ? nameOf(it.assignedTo) : null}
                  onToggle={() => onToggle(it)}
                  onClaim={() => onClaim(it)}
                  onDelete={() => setDeleting(it)}
                />
              ))
            ) : (
              <Text style={[styles.fine, { color: colors.text }]}>Nothing in this view.</Text>
            )}
          </>
        )}
      </StateGate>
      {adding ? <AddItemSheet members={members} onClose={() => setAdding(false)} onAdd={onAdd} /> : null}
      {deleting ? (
        <ConfirmSheet
          title="Delete this item?"
          body={`“${deleting.label}” will be removed from the checklist for everyone.`}
          confirm="Delete item"
          onClose={() => setDeleting(null)}
          onConfirm={() => onDelete(deleting)}
        />
      ) : null}
    </GalaPage>
  );
}

/** One row: checkbox, label, assignee chip or Claim, delete. */
function ChecklistRow({
  item,
  members,
  who,
  onToggle,
  onClaim,
  onDelete,
}: {
  item: ChecklistItemVM;
  members: Member[];
  who: string | null;
  onToggle: () => void;
  onClaim: () => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const tone = item.assignedTo ? members.find((m) => m.id === item.assignedTo)?.c : undefined;
  return (
    <View style={[styles.crow, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <CheckBox checked={item.isDone} onPress={onToggle} label={item.label} />
      <Text style={[styles.ct, { color: colors.text }, item.isDone && styles.done]} numberOfLines={2}>
        {item.label}
      </Text>
      {who ? (
        <View style={[styles.asg, { backgroundColor: colors.surface2 }]}>
          <Avatar name={who} tone={tone} size={24} userId={item.assignedTo} />
          <Text style={[styles.asgText, { color: colors.text }]} numberOfLines={1}>
            {who}
          </Text>
        </View>
      ) : (
        <Button sm fw={false} variant="zest" label="Claim" onPress={onClaim} />
      )}
      <IconButton icon="trash" label={`Delete ${item.label}`} size={18} onPress={onDelete} />
    </View>
  );
}

/** "Add to Checklist" sheet: what + assign to. */
function AddItemSheet({ members, onAdd, onClose }: { members: Member[]; onAdd: (label: string, assignedTo: string | null) => Promise<void>; onClose: () => void }) {
  const [label, setLabel] = useState('');
  const [who, setWho] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onAdd(label, who || null);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      title="Add to Checklist"
      onClose={onClose}
      footer={
        <>
          <Button label="Add to Checklist" onPress={() => void submit()} busy={busy} />
          <Button variant="ghost" label="Cancel" onPress={onClose} />
        </>
      }>
      <Field label="What are we bringing?" placeholder="Power bank, umbrella, extra shirt…" value={label} onChangeText={setLabel} onSubmitEditing={() => void submit()} />
      <ChoiceChips
        label="Assign to"
        value={who}
        onChange={setWho}
        options={[{ value: '', label: 'Nobody yet' }, ...members.filter((m) => m.id).map((m) => ({ value: m.id!, label: m.n }))]}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  rh: { flexDirection: 'row', justifyContent: 'space-between' },
  b: { fontFamily: font.bodyHeavy, fontSize: 16 },
  fine: { fontFamily: font.body, fontSize: 14, opacity: 0.85 },
  crow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 3, borderRadius: 22, paddingVertical: 10, paddingLeft: 12, paddingRight: 4 },
  ct: { flex: 1, fontFamily: font.bodyHeavy, fontSize: 16 },
  done: { textDecorationLine: 'line-through', opacity: 0.6 },
  asg: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 3, paddingLeft: 3, paddingRight: 10, maxWidth: 120 },
  asgText: { fontFamily: font.bodyHeavy, fontSize: 13, flexShrink: 1 },
});
