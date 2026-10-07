'use client';

import { useState, type FormEvent } from 'react';
import { Button, Card, Icon } from '@/components/otw';
import type { BudgetCategory } from '@/lib/otw/budget';
import { CUSTOM_ICONS, CUSTOM_MAX, DEFAULT_ICON, NAME_MAX, type CustomCategory } from '@/lib/otw/budget-custom';
import type { IconName } from '@/lib/otw/icons';
import type { BudgetVM } from '@/lib/api/types';
import { CATS } from './categories';
import s from './budget.module.css';

export interface CostInputsProps {
  value: BudgetVM;
  onAmount: (category: BudgetCategory, pesos: number) => void;
  onStep: (delta: number) => void;
  /** Focus Transportation on mount (after "Add an estimate": "Start with transportation."). */
  autoFocus?: boolean;
  /** This device's custom categories (see lib/otw/budget-custom.ts). */
  customs: CustomCategory[];
  /** Id of a category that was just added, so its amount field takes focus. */
  focusId: string | null;
  onCustomAmount: (id: string, pesos: number) => void;
  /** Return an error message to show in the form, or null when it worked. */
  onAddCustom: (label: string, icon: IconName) => string | null;
  onEditCustom: (id: string, label: string, icon: IconName) => string | null;
  onRemoveCustom: (id: string) => void;
}

/** "Estimated costs" card: the five category inputs, this device's custom ones, and the people stepper (reference views.budget). */
export function CostInputs({
  value,
  onAmount,
  onStep,
  autoFocus,
  customs,
  focusId,
  onCustomAmount,
  onAddCustom,
  onEditCustom,
  onRemoveCustom,
}: CostInputsProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card className={s.cTeal}>
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

        {customs.map((c) =>
          editingId === c.id ? (
            <div key={c.id} className={s.row}>
              <span className="ico sm">
                <Icon name={c.icon} size={20} />
              </span>
              <CategoryForm
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
            </div>
          ) : (
            <div key={c.id} className={s.row}>
              <span className="ico sm">
                <Icon name={c.icon} size={20} />
              </span>
              <label className={s.label} htmlFor={`bud-c-${c.id}`}>
                {c.label}
              </label>
              <span className={s.peso}>
                <i aria-hidden="true">₱</i>
                <AmountInput
                  id={`bud-c-${c.id}`}
                  label={c.label}
                  value={c.amount}
                  onChange={(pesos) => onCustomAmount(c.id, pesos)}
                  autoFocus={focusId === c.id}
                />
              </span>
              <span className={s.acts}>
                <button
                  type="button"
                  className="ibtn"
                  aria-label={`Rename ${c.label}`}
                  onClick={() => {
                    setAdding(false);
                    setEditingId(c.id);
                  }}
                >
                  <Icon name="edit" size={16} />
                </button>
                <button type="button" className="ibtn" aria-label={`Remove ${c.label}`} onClick={() => onRemoveCustom(c.id)}>
                  <Icon name="x" size={16} />
                </button>
              </span>
            </div>
          )
        )}

        {adding ? (
          <div className={`${s.row} ${s.addform}`}>
            <span className="ico sm">
              <Icon name="plus" size={20} />
            </span>
            <CategoryForm
              submitLabel="Add"
              onSubmit={(label, icon) => {
                const error = onAddCustom(label, icon);
                if (!error) setAdding(false);
                return error;
              }}
              onCancel={() => setAdding(false)}
            />
          </div>
        ) : (
          customs.length < CUSTOM_MAX && (
            <button
              type="button"
              className={s.addrow}
              onClick={() => {
                setEditingId(null);
                setAdding(true);
              }}
            >
              <Icon name="plus" size={18} /> Add a category
            </button>
          )
        )}
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

/** The name + icon mini-form for adding or renaming a custom category. */
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
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState<IconName>(initialIcon);
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(onSubmit(name, icon) ?? '');
  };

  return (
    <form className={s.cform} onSubmit={submit}>
      <input
        autoFocus
        className="in"
        value={name}
        maxLength={NAME_MAX}
        placeholder="Category name, e.g. Photographer"
        aria-label="Category name"
        aria-invalid={error ? true : undefined}
        onChange={(e) => {
          setName(e.target.value);
          setError('');
        }}
      />
      <div className={s.ipick} role="radiogroup" aria-label="Icon">
        {CUSTOM_ICONS.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={icon === n}
            aria-label={n}
            className={`${s.ipb}${icon === n ? ` ${s.ipOn}` : ''}`}
            onClick={() => setIcon(n)}
          >
            <Icon name={n} size={18} />
          </button>
        ))}
      </div>
      {error && (
        <p className={s.cerr} role="alert">
          {error}
        </p>
      )}
      <div className={s.cbtns}>
        <Button type="submit" sm>
          {submitLabel}
        </Button>
        <Button sm variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/**
 * Number input that writes through on every change. While focused it shows what was typed
 * (so clearing the field doesn't snap to "0"); on blur it shows the stored value again.
 */
function AmountInput({
  id,
  label,
  value,
  onChange,
  autoFocus,
}: {
  id?: string;
  label: string;
  value: number;
  onChange: (pesos: number) => void;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      id={id}
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
