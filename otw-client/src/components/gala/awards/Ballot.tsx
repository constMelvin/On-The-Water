'use client';

/**
 * The ballot: one award at a time. Tap a person to vote (big tiles, the whole tile is the button), and it moves
 * to the next award by itself. Once you've voted in every award, or tapped Finish, the ballot folds away into a
 * short "You're all set" summary; "Change my votes" opens it again. Votes can be changed until voting closes.
 */
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Icon, blob } from '@/components/otw';
import { useGala } from '@/lib/otw/gala-store';
import { featureKey } from '@/lib/otw/live';
import { failed } from '@/lib/otw/gala-queries';
import { castVote } from '@/lib/api/gala';
import type { AwardKey, AwardsVM } from '@/lib/api/types';
import { AWARD_META } from './awards-meta';
import s from './ballot.module.css';

/** A short beat so the person sees their pick land before it moves on. */
const ADVANCE_MS = 450;

export function Ballot({ data, onVoted }: { data: AwardsVM; onVoted: (next: AwardsVM) => void }) {
  const { roomId, myUserId, memberRows, nameOf, toneOf } = useGala();
  const qc = useQueryClient();
  const key = featureKey(roomId, 'awards');
  const cats = data.categories;

  // My picks that are still on their way to the server: they show immediately and can't be undone by a
  // background refresh that started before the save finished.
  const [pending, setPending] = useState<Partial<Record<AwardKey, string>>>({});
  const picks: Partial<Record<AwardKey, string>> = { ...data.myVotes, ...pending };
  const votedAll = cats.every((c) => !!picks[c.key]);

  const firstOpen = cats.findIndex((c) => !picks[c.key]);
  const [step, setStep] = useState(Math.max(0, firstOpen));
  // Everything already voted when you arrive: start folded.
  const [folded, setFolded] = useState(votedAll);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const cat = cats[step];
  const meta = AWARD_META[cat.key];
  const candidates = memberRows.filter((m) => m.userId !== myUserId);
  const last = step === cats.length - 1;

  const hintFor = (userId: string) => {
    const h = cat.hints.find((x) => x.userId === userId);
    return h ? meta.hint(h.count) : '';
  };

  const vote = (nomineeId: string) => {
    if (!roomId || picks[cat.key] === nomineeId) return;
    const category = cat.key;
    setPending((p) => ({ ...p, [category]: nomineeId }));

    // Move on (or fold away after the last one) once the pick has had a moment on screen.
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (last) {
        if (cats.every((c) => c.key === category || !!picks[c.key])) setFolded(true);
      } else {
        setStep((n) => Math.min(cats.length - 1, n + 1));
      }
    }, ADVANCE_MS);

    castVote(roomId, category, nomineeId)
      .then(onVoted)
      .catch((e: unknown) => failed(qc, [key], e, "Couldn't save your vote. Try again."))
      .finally(() =>
        setPending((p) => {
          const { [category]: _drop, ...rest } = p;
          void _drop;
          return rest;
        })
      );
  };

  /* ---- folded: a short summary of my picks ---- */
  if (folded) {
    return (
      <section className={`${s.folded} bg-blossom`} aria-label="Your votes" aria-live="polite">
        <span className="ico" style={blob(3)} aria-hidden="true">
          <Icon name="check" size={26} />
        </span>
        <h2>You&apos;re all set!</h2>
        <p>Salamat sa boto. The winners show when voting closes.</p>
        <ul className={s.picks}>
          {cats.map((c) => {
            const id = picks[c.key];
            return (
              <li key={c.key}>
                <span>{c.title}</span>
                {id ? (
                  <b>
                    <Avatar name={nameOf(id)} tone={toneOf(id)} size={26} userId={id} /> {nameOf(id)}
                  </b>
                ) : (
                  <em>Skipped</em>
                )}
              </li>
            );
          })}
        </ul>
        <Button
          variant="ghost"
          onClick={() => {
            setStep(0);
            setFolded(false);
          }}
        >
          <Icon name="edit" size={18} /> Change my votes
        </Button>
      </section>
    );
  }

  return (
    <section className={s.ballot} aria-label="Your ballot">
      <ol className={s.dots} aria-label="Awards">
        {cats.map((c, i) => (
          <li key={c.key}>
            <button
              type="button"
              className={`${i === step ? s.dotOn : ''}${picks[c.key] ? ` ${s.dotDone}` : ''}`}
              aria-current={i === step ? 'step' : undefined}
              aria-label={`${c.title}${picks[c.key] ? ', voted' : ''}`}
              onClick={() => setStep(i)}
            />
          </li>
        ))}
      </ol>

      <article className={`${s.card} ${s[`t_${meta.tone}`]}`}>
        <span className="ico xl" style={blob(step)} aria-hidden="true">
          <Icon name={meta.icon} size={40} />
        </span>
        <p className={s.count}>
          Award {step + 1} of {cats.length}
        </p>
        <h2 className={s.title} id={`award-${cat.key}`}>
          {cat.title}
        </h2>
        <p className={s.blurb}>{cat.blurb}</p>
      </article>

      <div className={s.cands} role="radiogroup" aria-labelledby={`award-${cat.key}`}>
        {candidates.map((m) => {
          const on = picks[cat.key] === m.userId;
          const hint = hintFor(m.userId);
          return (
            <button
              key={m.userId}
              type="button"
              role="radio"
              aria-checked={on}
              className={`${s.cand}${on ? ` ${s.candOn}` : ''}`}
              onClick={() => vote(m.userId)}
            >
              <Avatar name={nameOf(m.userId)} tone={toneOf(m.userId)} size={76} userId={m.userId} />
              <b>{nameOf(m.userId)}</b>
              {hint && <span className={s.hint}>{hint}</span>}
              {on && (
                <span className={s.tick} aria-hidden="true">
                  <Icon name="check" size={18} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {cat.hints.length > 0 && <p className="fine">Hints are just counts from your gala. You decide who wins.</p>}

      <div className={s.nav}>
        <Button variant="ghost" onClick={() => setStep((n) => Math.max(0, n - 1))} disabled={step === 0}>
          <Icon name="back" size={18} /> Back
        </Button>
        {last ? (
          <Button variant="rosy" onClick={() => setFolded(true)}>
            Finish <Icon name="check" size={18} />
          </Button>
        ) : (
          <Button variant="rosy" onClick={() => setStep((n) => n + 1)}>
            {picks[cat.key] ? 'Next' : 'Skip'} <Icon name="arrowr" size={18} />
          </Button>
        )}
      </div>
    </section>
  );
}
