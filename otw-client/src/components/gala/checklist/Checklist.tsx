'use client';

/**
 * Checklist tab. Reference: src/proto2.js views.checklist (+ proto3 chk / chk-f / chk-del / claim /
 * save-item), checklist-*.png. Data is the mock checklist slice (lib/otw/mock/checklist.ts).
 * TODO(backend): checklist CRUD with version (see checklist.ts); realtime checklist.* on room:{roomId}.
 */
import { useState } from 'react';
import { Button, Card, Icon, PageHead, ProgressBar, SegmentedControl } from '@/components/otw';
import { burst, toast } from '@/lib/otw/feedback';
import { useGala } from '@/lib/otw/gala-store';
import { mockUserId, useSlice } from '@/lib/otw/mock';
import { addItem, checklist, claimItem, deleteItem, toggleDone } from '@/lib/otw/mock/checklist';
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

export function Checklist({ code }: { code: string }) {
  const { members, me, viewState, liveState, setViewState, retry } = useGala();
  // Same rule as the dashboard: the dev switcher wins, otherwise the live query state.
  const state = viewState !== 'default' ? viewState : liveState;

  const [items] = useSlice(checklist, code);
  const [filter, setFilter] = useState<Filter>('all');
  const [adding, setAdding] = useState(false);
  const myId = mockUserId(me);

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
        onRetry={() => {
          setViewState('default');
          return retry();
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
                    onToggle={() => {
                      if (toggleDone(code, it.id, myId)) burstMid();
                    }}
                    onClaim={() => {
                      claimItem(code, it.id, myId);
                      toast("It's yours now.");
                    }}
                    onDelete={() => {
                      deleteItem(code, it.id);
                      toast('Item removed.');
                    }}
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
          onAdd={(label, assignedTo) => {
            addItem(code, label, assignedTo);
            setAdding(false);
            toast('Item added to the checklist.');
          }}
        />
      )}
    </>
  );
}
