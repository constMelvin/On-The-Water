'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Tag } from '@/components/otw';
import { toast } from '@/lib/otw/feedback';
import { createGala, emptyDraft, validateStep, type GalaDraft } from './gala-draft';
import { FocusLayout, type FocusTone } from './FocusLayout';
import { CreatedScreen } from './CreatedScreen';
import { StepTitle } from './steps/StepTitle';
import { StepDate } from './steps/StepDate';
import { StepPlace } from './steps/StepPlace';
import { StepPassword } from './steps/StepPassword';

/** Per-step copy + colors (reference views.plan). */
const STEPS: { q: string; h: string; tag?: string; tone: FocusTone }[] = [
  {
    q: 'First things first. What are we calling this gala?',
    h: 'Give your gala a name your GC will remember.',
    tone: 'rosy',
  },
  { q: 'When are we going?', h: 'Let’s turn “someday” into an actual date.', tone: 'zest' },
  {
    q: 'Where are we headed?',
    h: 'Type a place or pick one. You can add exact stops later.',
    tag: 'Saan Tayo?',
    tone: 'teal',
  },
  { q: 'Create a gala password', h: "You'll need this if you come back later.", tone: 'blossom' },
];

/** Plan a Gala: 4-step wizard, then the Gala created screen. */
export function PlanWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<GalaDraft>(emptyDraft);
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  if (code) return <CreatedScreen code={code} title={draft.title} password={draft.password} />;

  const s = STEPS[step];
  // Primary is zest on rosy/teal, rosy on zest/blossom.
  const primary = s.tone === 'rosy' || s.tone === 'teal' ? 'zest' : 'rosy';

  // Any edit clears the current error; validation only runs on Next.
  const update = (patch: Partial<GalaDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError('');
  };

  const back = () => {
    setError('');
    if (step > 0) setStep(step - 1);
    else router.push('/');
  };

  // Next button and Enter both submit the form.
  const next = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const err = validateStep(step, draft, confirm);
    if (err) {
      setError(err);
      return;
    }
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      const res = await createGala(draft);
      setCode(res.code);
    } catch {
      // TODO(team): map real API errors to friendly copy.
      toast("Couldn't create the gala. Try again.", 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FocusLayout tone={s.tone}>
      <form onSubmit={next} noValidate style={{ display: 'contents' }}>
        <div className="wiz">
          <div className="wprog" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={4}>
            {[0, 1, 2, 3].map((n) => (
              <i key={n} className={n <= step ? 'on' : undefined} />
            ))}
            <span>Step {step + 1} of 4</span>
          </div>
          {s.tag && (
            <Tag variant="cream" icon="pin">
              {s.tag}
            </Tag>
          )}
          <h1 className="h1 wq">{s.q}</h1>
          <p className="sub">{s.h}</p>

          {step === 0 && <StepTitle value={draft.title} onChange={(title) => update({ title })} error={error} />}
          {step === 1 && (
            <StepDate
              value={{ date: draft.date, startTime: draft.startTime, endTime: draft.endTime }}
              onChange={(v) => update(v)}
              error={error}
            />
          )}
          {step === 2 && (
            <StepPlace value={draft.destination} onChange={(destination) => update({ destination })} error={error} />
          )}
          {step === 3 && (
            <StepPassword
              value={{ password: draft.password, confirm }}
              onChange={(v) => {
                update({ password: v.password });
                setConfirm(v.confirm);
              }}
              error={error}
            />
          )}
        </div>

        <div className="fbar">
          <Button variant="ghost" onClick={back}>
            Back
          </Button>
          <Button type="submit" variant={primary} disabled={busy}>
            {busy ? 'Creating…' : step === 3 ? 'Tara G!' : 'Next'}
          </Button>
        </div>
      </form>
    </FocusLayout>
  );
}
