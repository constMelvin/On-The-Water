'use client';

/**
 * Gastos (budget estimator) tab. Reference: src/proto2.js views.budget + updBud, budget-*.png.
 * Data is the mock budget slice (lib/otw/mock/budget.ts): every edit writes to it, so the
 * total, per person and split bar recompute live and other tabs stay in sync.
 * TODO(backend): PUT /rooms/{id}/budget (the slice's save() is where it goes).
 *
 * States (reference data.js budget row):
 * - loading: result cards skeleton.
 * - empty: "No estimates yet." while the room has never saved an estimate; the button opens the form.
 * - error: "Couldn't save your estimate." shows ABOVE the form, so the numbers really do stay on screen.
 * - offline: the shaky-connection bar above the (still editable) form.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { PageHead, Tag } from '@/components/otw';
import { toast } from '@/lib/otw/feedback';
import { useGala } from '@/lib/otw/gala-store';
import { useSlice } from '@/lib/otw/mock';
import { budget, setBudgetAmount, stepBudgetPeople, type BudgetCategory } from '@/lib/otw/mock/budget';
import { Empty, ErrorState, Offline } from '../States';
import { BudgetSkeleton } from './BudgetSkeleton';
import { CostInputs } from './CostInputs';
import { BudgetResults } from './BudgetResults';
import s from './budget.module.css';

/** One "Budget updated." per burst of edits, not one per keystroke or stepper tap. */
const TOAST_DELAY_MS = 600;

export function Budget({ code }: { code: string }) {
  const { viewState, liveState, setViewState, retry } = useGala();
  // Same rule as the dashboard: the dev switcher wins, otherwise the live query state.
  const state = viewState !== 'default' ? viewState : liveState;
  const [value] = useSlice(budget, code);

  // The empty slice is stamped with the epoch; any saved edit moves updatedAt, so clearing
  // every amount back to 0 later keeps the form instead of bouncing to the empty state.
  const neverSaved = Date.parse(value.updatedAt) === 0;
  // "Add an estimate" opens the form for this visit (and focuses Transportation) without saving anything.
  const [started, setStarted] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const updated = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => toast('Budget updated.'), TOAST_DELAY_MS);
  }, []);

  const onAmount = (category: BudgetCategory, pesos: number) => {
    if (setBudgetAmount(code, category, pesos)) updated();
  };
  const onStep = (delta: number) => {
    if (stepBudgetPeople(code, delta)) updated();
  };

  const showEmpty = state === 'empty' || (state === 'default' && neverSaved && !started);

  let body;
  if (state === 'loading') {
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
        {/* TODO(backend): also show this when PUT /rooms/{id}/budget fails; "Try again" re-sends the current numbers. */}
        {state === 'error' && (
          <ErrorState
            kind="budget"
            onRetry={() => {
              setViewState('default');
              return retry();
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
