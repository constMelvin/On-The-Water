'use client';

/**
 * The awarding ceremony: one award at a time. Title, a short drumroll, "tap to reveal", then the winner(s)
 * with one sparkle burst. Ties show co-winners side by side; a category nobody voted in is skipped.
 * With reduced motion there is no drumroll and no burst: tap, and the winner simply appears.
 * It's a full-screen dialog: focus stays inside, Esc skips it, and each new step moves focus to its button.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Avatar, Button, Icon, blob } from '@/components/otw';
import { burst } from '@/lib/otw/feedback';
import { useGala } from '@/lib/otw/gala-store';
import { useCalm } from '@/lib/otw/maplibre';
import type { AwardCategoryVM, AwardResultVM } from '@/lib/api/types';
import { AWARD_META } from './awards-meta';
import type { CertificateTarget } from './CertificateSheet';
import s from './ceremony.module.css';

type Stage = 'intro' | 'drum' | 'win' | 'summary';

const DRUM_MS = 1500;
/** When the trophy lands in the winner's hands (matches the keyframes in ceremony.module.css). */
const TROPHY_MS = 3100;
const FOCUSABLE = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export function Ceremony({
  results,
  categories,
  gala,
  onClose,
  onCertificate,
}: {
  results: AwardResultVM[];
  categories: AwardCategoryVM[];
  gala: string;
  onClose: () => void;
  /** Closes the ceremony and opens that winner's certificate. */
  onCertificate: (t: CertificateTarget) => void;
}) {
  const { nameOf, toneOf } = useGala();
  const calm = useCalm();
  const root = useRef<HTMLDivElement>(null);
  const stageEl = useRef<HTMLDivElement>(null);

  // Only awards somebody won are performed; the rest ("Walang bumoto") are skipped.
  const steps = results.filter((r) => r.winners.length > 0);
  const [idx, setIdx] = useState(0);
  const [stage, setStage] = useState<Stage>(steps.length ? 'intro' : 'summary');

  const step = steps[idx];
  const cat = step ? categories.find((c) => c.key === step.categoryKey) : undefined;
  const meta = step ? AWARD_META[step.categoryKey] : null;

  // Drumroll, then the reveal.
  useEffect(() => {
    if (stage !== 'drum') return;
    const t = setTimeout(() => setStage('win'), DRUM_MS);
    return () => clearTimeout(t);
  }, [stage]);

  // One burst when the winner has climbed the stage and caught the trophy (burst() is a no-op under reduced motion).
  useEffect(() => {
    if (stage !== 'win' || !stageEl.current) return;
    const el = stageEl.current;
    const t = setTimeout(() => {
      const r = el.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height * 0.3);
    }, calm ? 0 : TROPHY_MS);
    return () => clearTimeout(t);
  }, [stage, idx, calm]);

  // Each new step: focus its main button.
  useEffect(() => {
    root.current?.querySelector<HTMLElement>("[data-primary]")?.focus();
  }, [stage, idx]);

  // Esc skips; Tab stays inside the dialog.
  useEffect(() => {
    const el = root.current;
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !el) return;
      const list = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      if (opener?.isConnected) opener.focus();
    };
  }, [onClose]);

  const reveal = () => setStage(calm ? 'win' : 'drum');
  const next = () => {
    if (idx + 1 >= steps.length) {
      setStage('summary');
    } else {
      setIdx(idx + 1);
      setStage('intro');
    }
  };
  const replay = () => {
    setIdx(0);
    setStage(steps.length ? 'intro' : 'summary');
  };

  const tone = meta ? `t_${meta.tone}` : '';

  return (
    <div ref={root} className={`${s.stage} ${stage === 'summary' ? s.summaryBg : s[tone]}`} role="dialog" aria-modal="true" aria-label="Barkada Awards ceremony">
      <button type="button" className={s.skip} onClick={onClose}>
        <Icon name="x" size={18} /> {stage === 'summary' ? 'Close' : 'Skip ceremony'}
      </button>

      {stage !== 'summary' && step && cat && meta && (
        <div ref={stageEl} className={s.center} key={`${idx}-${stage === 'win' ? 'w' : 'i'}`}>
          <p className={s.count}>
            Award {idx + 1} of {steps.length}
          </p>

          {stage !== 'win' && (
            <>
              <span className={`ico xl ${s.icon}`} style={blob(idx)} aria-hidden="true">
                <Icon name={meta.icon} size={48} />
              </span>
              <h2 className={s.title}>{cat.title}</h2>
              <p className={s.blurb}>{cat.blurb}</p>
              {stage === 'drum' ? (
                <div className={s.drum} role="status" aria-live="polite">
                  <i />
                  <i />
                  <i />
                  <span>Ang nanalo ay…</span>
                </div>
              ) : (
                <Button data-primary variant="cream" onClick={reveal}>
                  <Icon name="sparkle" size={18} /> Reveal the winner
                </Button>
              )}
            </>
          )}

          {stage === 'win' && (
            <>
              <p className={s.award} aria-hidden="true">
                <Icon name={meta.icon} size={20} /> {cat.title}
              </p>
              {steps[idx].winners.length <= 3 ? (
                <>
                  <Podium ids={steps[idx].winners} />
                  <ul className={s.names} aria-label={`Winner${steps[idx].winners.length > 1 ? 's' : ''}`}>
                    {steps[idx].winners.map((id) => (
                      <li key={id}>
                        <h2 className={s.winner}>{nameOf(id)}</h2>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                // Too many co-winners for the stage: a plain row of them.
                <ul className={s.winners} aria-label="Winners">
                  {steps[idx].winners.map((id, i) => (
                    <li key={id} style={{ animationDelay: `${i * 140}ms` }}>
                      <Avatar name={nameOf(id)} tone={toneOf(id)} size={96} userId={id} />
                      <h2 className={s.winner}>{nameOf(id)}</h2>
                    </li>
                  ))}
                </ul>
              )}
              <p className={`${s.sub} ${s.subWin}`}>
                {steps[idx].winners.length > 1 ? 'Co-winners! Tabla ang boto.' : 'Panalo!'} {steps[idx].tally[0].votes}{' '}
                {steps[idx].tally[0].votes === 1 ? 'vote' : 'votes'}
              </p>
              <Button data-primary variant="cream" onClick={next}>
                {idx + 1 >= steps.length ? 'See all winners' : 'Next award'} <Icon name="arrowr" size={18} />
              </Button>
            </>
          )}
        </div>
      )}

      {stage === 'summary' && (
        <div className={s.summary}>
          <h2 className={s.sumTitle}>Ang mga bida ng {gala}</h2>
          {steps.length === 0 ? (
            <p className={s.sub}>Walang bumoto sa kahit anong award this time.</p>
          ) : (
            <ul className={s.sumList}>
              {steps.map((r) => {
                const m = AWARD_META[r.categoryKey];
                return (
                  <li key={r.categoryKey} className={s[`t_${m.tone}`]}>
                    <span className="ico sm" aria-hidden="true">
                      <Icon name={m.icon} size={20} />
                    </span>
                    <div>
                      <b>{categories.find((c) => c.key === r.categoryKey)?.title}</b>
                      <span>{r.winners.map((id) => nameOf(id)).join(' & ')}</span>
                    </div>
                    <span className={s.certs}>
                      {r.winners.map((id) => {
                        const cat = categories.find((c) => c.key === r.categoryKey);
                        return cat ? (
                          <button key={id} type="button" onClick={() => onCertificate({ userId: id, category: cat })} aria-label={`Certificate for ${nameOf(id)}, ${cat.title}`}>
                            <Icon name="download" size={16} /> {r.winners.length > 1 ? nameOf(id) : 'Certificate'}
                          </button>
                        ) : null;
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className={s.sumActs}>
            {steps.length > 0 && (
              <Button variant="ghost" onClick={replay}>
                <Icon name="refresh" size={18} /> Replay
              </Button>
            )}
            <Button data-primary variant="cream" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- the stage: winners walk up the steps and catch the trophy ---------------- */

/** A little cup, drawn in the brand's linework. */
function Trophy() {
  return (
    <svg className={s.trophy} viewBox="0 0 48 58" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 6h24v14a12 12 0 0 1-24 0z" fill="var(--zest)" stroke="var(--teal-dark)" />
      <path d="M12 10H6a3 3 0 0 0-3 3c0 6 5 10 10 10M36 10h6a3 3 0 0 1 3 3c0 6-5 10-10 10" stroke="var(--teal-dark)" />
      <path d="M24 32v9M16 52h16M18 41h12l2 11H16z" fill="var(--zest)" stroke="var(--teal-dark)" />
      <path d="M24 11l1.4 4.1 4.1 1.4-4.1 1.4L24 22l-1.4-4.1-4.1-1.4 4.1-1.4z" fill="var(--rosy)" stroke="none" />
    </svg>
  );
}

/**
 * One to three winners walk in from the left, hop up the three steps, and raise their arms to catch a trophy
 * that drops from above. It's decoration (the names are listed under it), so it is hidden from screen readers;
 * with reduced motion nothing moves and they are simply standing there with the trophy.
 */
function Podium({ ids }: { ids: string[] }) {
  const { nameOf, toneOf } = useGala();
  const n = ids.length;
  const e = (n - 1) * 90;
  return (
    <div className={s.sceneWrap} aria-hidden="true">
      <div className={s.scene} style={{ '--e': `${e}px` } as CSSProperties}>
        <div className={s.spot} />
        <div className={s.curtainL} />
        <div className={s.curtainR} />
        <div className={s.valance} />
        <div className={s.steps}>
          <i className={s.stepTop} />
          <i className={s.stepMid} />
          <i className={s.stepBase} />
        </div>
        {ids.map((id, i) => (
          <div key={id} className={s.who} style={{ '--ox': `${(i - (n - 1) / 2) * 90}px`, '--i': i } as CSSProperties}>
            <div className={s.walker}>
              <Trophy />
              <Avatar name={nameOf(id)} tone={toneOf(id)} size={84} userId={id} />
              <span className={s.body}>
                <i className={s.armL} />
                <i className={s.armR} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
