'use client';

/**
 * Checklist tab. Reference: src/proto2.js views.checklist (+ proto3 chk / chk-f / chk-del / claim /
 * save-item), checklist-*.png. Data is GET /rooms/{roomId}/checklist; every write sends the item's
 * version (a stale one is a 409: toast + refetch). Other members' edits arrive over realtime.
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Icon, PageHead, ProgressBar, SegmentedControl } from '@/components/otw';
import { burst, toast } from '@/lib/otw/feedback';
import { useGala } from '@/lib/otw/gala-store';
import { featureKey } from '@/lib/otw/live';
import { failed, removeFrom, upsertIn, useChecklist, useTabState } from '@/lib/otw/gala-queries';
import {
  claimChecklistItem,
  createChecklistItem,
  deleteChecklistItem,
  updateChecklistItem,
} from '@/lib/api/gala';
import type { ChecklistItemVM } from '@/lib/api/types';
import { Empty, StateGate } from '../States';
import { ChecklistRow } from './ChecklistRow';
import { AddItemSheet } from './AddItemSheet';
import s from './checklist.module.css';

type Filter = 'all' | 'mine' | 'done';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'Mine' },
  { value: 'done', label: 'Done' },
];

/** Reference burstMid(): the sparkle burst from the middle of the screen. */
const burstMid = () => burst(window.innerWidth / 2, window.innerHeight / 2);

/** The room comes from the gala context (GalaProvider in the /gala/[code] layout). */
export function Checklist() {
  const { members, nameOf, roomId, myUserId, setViewState } = useGala();
  const qc = useQueryClient();
  const q = useChecklist();
  const state = useTabState(q);
  const key = featureKey(roomId, 'checklist');
  const summaryKey = featureKey(roomId, 'summary');

  const items = q.data ?? [];
  const [filter, setFilter] = useState<Filter>('all');
  const [adding, setAdding] = useState(false);
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
    write(it, { isDone, doneBy: isDone ? myId : null }, () =>
      updateChecklistItem(roomId!, it.id, { isDone, version: it.version })
    );
    // Checking the last open item finishes the list.
    if (isDone && items.every((x) => x.id === it.id || x.isDone)) burstMid();
  };

  const onClaim = (it: ChecklistItemVM) => {
    write(it, { assignedTo: myId }, () => claimChecklistItem(roomId!, it.id, it.version));
    toast("It's yours now.");
  };

  const onDelete = (it: ChecklistItemVM) => {
    if (!roomId) return;
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
  const shown = items.filter(
    (it) => filter === 'all' || (filter === 'mine' && it.assignedTo === myId) || (filter === 'done' && it.isDone)
  );

  const openAdd = () => setAdding(true);

  // Phase 3 (states + polish) is a follow-up. A room with no items yet gets the empty state;
  // the dev switcher's loading / empty / error / offline go through StateGate.
  return (
    <>
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
        }}
      >
        {items.length === 0 ? (
          <Empty kind="checklist" onAction={openAdd} />
        ) : (
          <>
            <Card className={s.prog}>
              <div className="rh">
                <b>
                  {packed} of {items.length} packed
                </b>
                <span>{pct}%</span>
              </div>
              <ProgressBar value={pct} label={`${packed} of ${items.length} packed`} />
              {allPacked && <p className="fine">All packed. Walang naiwan.</p>}
            </Card>

            <div className={s.toolbar}>
              <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} label="Show" />
              <Button className="hide-m" onClick={openAdd}>
                <Icon name="plus" size={20} /> Add to Checklist
              </Button>
            </div>

            <ul className={s.clist}>
              {shown.length ? (
                shown.map((it) => (
                  <ChecklistRow
                    key={it.id}
                    item={it}
                    members={members}
                    who={it.assignedTo ? nameOf(it.assignedTo) : null}
                    onToggle={() => onToggle(it)}
                    onClaim={() => onClaim(it)}
                    onDelete={() => onDelete(it)}
                  />
                ))
              ) : (
                <li className="fine">Nothing in this view.</li>
              )}
            </ul>
          </>
        )}
      </StateGate>

      <button type="button" className={s.fab} onClick={openAdd} aria-label="Add to Checklist">
        <Icon name="plus" size={30} />
      </button>

      {adding && (
        <AddItemSheet
          members={members}
          onClose={() => setAdding(false)}
          onAdd={onAdd}
        />
      )}
    </>
  );
}
