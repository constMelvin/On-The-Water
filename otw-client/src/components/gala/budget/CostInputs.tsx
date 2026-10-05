'use client';

import { useState } from 'react';
import { Card, Icon } from '@/components/otw';
import type { BudgetCategory } from '@/lib/otw/budget';
import type { BudgetVM } from '@/lib/api/types';
import { CATS } from './categories';
import s from './budget.module.css';

export interface CostInputsProps {
  value: BudgetVM;
  onAmount: (category: BudgetCategory, pesos: number) => void;
  onStep: (delta: number) => void;
  /** Focus Transportation on mount (after "Add an estimate": "Start with transportation."). */
  autoFocus?: boolean;
}

/** "Estimated costs" card: the five category inputs and the people stepper (reference views.budget). */
export function CostInputs({ value, onAmount, onStep, autoFocus }: CostInputsProps) {
  return (
    <Card>
      <h3>Estimated costs</h3>
      <div className={s.rows}>
        {CATS.map(([k, label, icon], i) => (
          <label key={k} className={s.row}>
            <span className="ico sm">
              <Icon name={icon} size={20} />
            </span>
            <span className={s.label}>{label}</span>
            <span className={s.peso}>
              <i aria-hidden="true">₱</i>
              <AmountInput
                label={label}
                value={value[k]}
                onChange={(pesos) => onAmount(k, pesos)}
                autoFocus={autoFocus && i === 0}
              />
            </span>
          </label>
        ))}
      </div>
      <div className={`${s.row} ${s.people}`}>
        <span className="ico sm">
          <Icon name="users" size={20} />
        </span>
        <span className={s.label} id="bud-people">
          How many people?
        </span>
        <div className={s.stepper} role="group" aria-labelledby="bud-people">
          <button type="button" className="ibtn" aria-label="Fewer people" onClick={() => onStep(-1)}>
            <Icon name="chevl" size={18} />
          </button>
          <b aria-live="polite">{value.participantCount}</b>
          <button type="button" className="ibtn" aria-label="More people" onClick={() => onStep(1)}>
            <Icon name="chevr" size={18} />
          </button>
        </div>
      </div>
    </Card>
  );
}

/**
 * Number input that writes through on every change. While focused it shows what was typed
 * (so clearing the field doesn't snap to "0"); on blur it shows the stored value again.
 */
function AmountInput({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: number;
  onChange: (pesos: number) => void;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      autoFocus={autoFocus}
      className="in num"
      type="number"
      min={0}
      step={100}
      inputMode="numeric"
      aria-label={`${label} estimate`}
      value={draft ?? String(value)}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(Number(e.target.value));
      }}
      onBlur={() => setDraft(null)}
    />
  );
}
