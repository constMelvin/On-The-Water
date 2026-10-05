'use client';

/**
 * Gastos (budget estimator) tab. Reference: src/proto2.js views.budget + updBud, budget-*.png.
 * Data is GET /rooms/{roomId}/budget. Edits update a local draft right away (totals, per person
 * and the split bar recompute live), then one PUT per burst of edits saves the whole estimate.
 * Other members' saves arrive over realtime (budget.updated).
 *
 * States (reference data.js budget row):
 * - loading: result cards skeleton.
 * - empty: "No estimates yet." while the room has never saved an estimate; the button opens the form.
 * - error: "Couldn't save your estimate." shows ABOVE the form, so the numbers really do stay on screen.
 * - offline: the shaky-connection bar above the (still editable) form.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHead, Tag } from '@/components/otw';
import { toast } from '@/lib/otw/feedback';
import { useGala } from '@/lib/otw/gala-store';
import { featureKey } from '@/lib/otw/live';
import { useBudget, useTabState } from '@/lib/otw/gala-queries';
import { MAX_PEOPLE, MIN_PEOPLE, toCents, withTotals, type BudgetCategory } from '@/lib/otw/budget';
import { saveBudget } from '@/lib/api/gala';
import { isApiError } from '@/lib/api/client';
import type { BudgetVM } from '@/lib/api/types';
import { Empty, ErrorState, Offline } from '../States';
import { BudgetSkeleton } from './BudgetSkeleton';
import { CostInputs } from './CostInputs';
import { BudgetResults } from './BudgetResults';
import s from './budget.module.css';

/** One save (and one "Budget updated.") per burst of edits, not one per keystroke or stepper tap. */
const SAVE_DELAY_MS = 600;

export function Budget({ code }: { code: string }) {
  const { roomId, setViewState } = useGala();
  const qc = useQueryClient();
  const q = useBudget();
  const tabState = useTabState(q);
  const key = featureKey(roomId, 'budget');

  // My unsaved numbers. null = show the server's estimate.
  const [draft, setDraft] = useState<BudgetVM | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const value = draft ?? q.data;

  // The room has no estimate until someone saves one (BudgetDto.empty has no updatedBy). Clearing
  // every amount back to 0 later keeps the form instead of bouncing to the empty state.
  const neverSaved = !draft && !!q.data && q.data.updatedBy === null;
  // "Add an estimate" opens the form for this visit (and focuses Transportation) without saving anything.
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
      qc.setQueryData(key, saved);
      void qc.invalidateQueries({ queryKey: featureKey(roomId, 'summary') });
      // Only drop the draft if nothing was typed while this save was in flight.
      if (latest.current === next) {
        latest.current = null;
        setDraft(null);
      }
      setSaveFailed(false);
      toast('Budget updated.');
      return true;
    } catch (e) {
      if (isApiError(e) && e.status === 403) {
        // The Gala Leader turned off "Edit the plan": drop my numbers, show the saved ones.
        latest.current = null;
        setDraft(null);
        toast(e.message || 'Only the Gala Leader can edit the budget right now.', 'err');
        return false;
      }
      setSaveFailed(true);
      return false;
    }
    // key is stable for a room id; roomId covers it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // A failed save is the "error" state; a failed load with nothing on screen is too.
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
    body = <BudgetSkeleton />;
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
    body = (
      <>
        {state === 'offline' && <Offline />}
        {/* "Try again" re-sends the numbers still on screen (or reloads when nothing was typed). */}
        {state === 'error' && (
          <ErrorState
            kind="budget"
            onRetry={async () => {
              setViewState('default');
              if (latest.current) return save();
              return (await q.refetch()).isSuccess;
            }}
          />
        )}
        <div className={s.cols}>
          <CostInputs value={value} onAmount={onAmount} onStep={onStep} autoFocus={started} />
          <BudgetResults value={value} code={code} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Let's talk gastos."
        sub="Estimate the budget before anyone starts saying, “Magkano ba kailangan?”"
        tag={<Tag icon="calc">Before the gala</Tag>}
      />
      {body}
    </>
  );
}
