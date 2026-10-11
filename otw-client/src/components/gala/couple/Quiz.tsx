'use client';

/**
 * Who Knows Who Better?: a short round of questions you both answer privately, then reveal together.
 * Quiz: pick what's true for you and guess what your partner picked (multiple choice, exact-match scoring).
 * Deep Talk: open questions, revealed together, never scored. The server only sends your partner's answers
 * once you've both finished, so this screen has nothing to peek at.
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Icon, ProgressBar } from '@/components/otw';
import { burst } from '@/lib/otw/feedback';
import { useGala } from '@/lib/otw/gala-store';
import { featureKey } from '@/lib/otw/live';
import { failed, useCoupleQuiz } from '@/lib/otw/gala-queries';
import { answerQuiz, startQuiz } from '@/lib/api/gala';
import type { QuizCategory, QuizItemVM, QuizMode, QuizQuestionVM, QuizSessionVM } from '@/lib/api/types';
import { ErrorState, Skeleton } from '../States';
import s from './quiz.module.css';

const CATEGORY_LABEL: Record<QuizCategory, string> = {
  FAVORITES: 'Favorites',
  HABITS: 'Habits',
  LOVE_LANGUAGES: 'Love languages',
  PREFERENCES: 'Preferences',
  DEEP_TALK: 'Deep talk',
};

const QUIZ_CATEGORIES: (QuizCategory | undefined)[] = [undefined, 'FAVORITES', 'HABITS', 'LOVE_LANGUAGES', 'PREFERENCES'];

export function Quiz() {
  const { roomId, myUserId, nameOf } = useGala();
  const qc = useQueryClient();
  const q = useCoupleQuiz();
  const key = featureKey(roomId, 'couple-quiz');
  /** Setting this shows the picker again after a finished round ("Play again"). */
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  if (q.isPending) return <Skeleton label="Loading the quiz" />;
  if (q.isError && q.data === undefined) return <ErrorState kind="couple" onRetry={async () => (await q.refetch()).isSuccess} />;

  const session = q.data ?? null;
  const partnerName = session?.partnerId ? nameOf(session.partnerId) : 'Your partner';

  const start = async (mode: QuizMode, category?: QuizCategory) => {
    if (!roomId || busy) return;
    setBusy(true);
    try {
      qc.setQueryData<QuizSessionVM | null>(key, await startQuiz(roomId, { mode, category }));
      setPicking(false);
    } catch (e) {
      failed(qc, [key], e, "Couldn't start the round. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!session || picking) {
    return <Picker busy={busy} onStart={start} onCancel={session ? () => setPicking(false) : undefined} />;
  }

  if (session.revealed && session.result) {
    return <Results session={session} me={nameOf(myUserId)} partner={partnerName} onAgain={() => setPicking(true)} />;
  }

  if (session.myAnswered >= session.total) {
    return (
      <div className={`${s.panel} bg-blossom`} role="status" aria-live="polite">
        <span className="ico xl" aria-hidden="true">
          <Icon name="clock" size={40} />
        </span>
        <h3>You&apos;re done!</h3>
        <p>
          Waiting for {partnerName} to finish ({session.partnerAnswered} of {session.total}). The results show up here when they do.
        </p>
      </div>
    );
  }

  return (
    <Round
      session={session}
      partner={partnerName}
      onAnswer={async (body) => {
        if (!roomId) return false;
        try {
          qc.setQueryData<QuizSessionVM | null>(key, await answerQuiz(roomId, session.id, body));
          return true;
        } catch (e) {
          failed(qc, [key], e, "Couldn't save that answer. Try again.");
          return false;
        }
      }}
    />
  );
}

/* ---------------- start screen ---------------- */

function Picker({ busy, onStart, onCancel }: { busy: boolean; onStart: (mode: QuizMode, category?: QuizCategory) => void; onCancel?: () => void }) {
  const [category, setCategory] = useState<QuizCategory | undefined>(undefined);
  return (
    <div className={s.start}>
      <div className={s.modes}>
        <section className={`${s.mode} bg-blossom`}>
          <span className="ico" aria-hidden="true">
            <Icon name="users" size={26} />
          </span>
          <h3>Quiz</h3>
          <p>6 questions. Pick your answer, then guess your partner&apos;s. Most right guesses wins.</p>
          <div className={s.cats} role="group" aria-label="Question category">
            {QUIZ_CATEGORIES.map((c) => (
              <button key={c ?? 'MIX'} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}>
                {c ? CATEGORY_LABEL[c] : 'Mix'}
              </button>
            ))}
          </div>
          <Button variant="rosy" onClick={() => onStart('QUIZ', category)} disabled={busy}>
            Start quiz
          </Button>
        </section>
        <section className={`${s.mode} bg-zest`}>
          <span className="ico" aria-hidden="true">
            <Icon name="heart" size={26} />
          </span>
          <h3>Deep Talk</h3>
          <p>5 open questions. Write your answers, then read each other&apos;s together. No score.</p>
          <Button variant="teal" onClick={() => onStart('DEEP_TALK')} disabled={busy}>
            Start Deep Talk
          </Button>
        </section>
      </div>
      {onCancel && (
        <button type="button" className="lnk" onClick={onCancel}>
          Back to results
        </button>
      )}
    </div>
  );
}

/* ---------------- answering ---------------- */

type AnswerBody = { questionKey: string; ownAnswer?: string; guessAnswer?: string; textAnswer?: string };

function Round({ session, partner, onAnswer }: { session: QuizSessionVM; partner: string; onAnswer: (body: AnswerBody) => Promise<boolean> }) {
  const answered = new Set(session.myAnswers.map((a) => a.questionKey));
  const question = session.questions.find((x) => !answered.has(x.key));
  if (!question) return null;
  const n = answered.size + 1;
  // Remount per question so the picks reset.
  return (
    <div className={s.round}>
      <header className={s.rhead}>
        <span className="fine">
          Question {n} of {session.total}
        </span>
        <ProgressBar value={(answered.size / session.total) * 100} label={`${answered.size} of ${session.total} answered`} />
      </header>
      <QuestionCard key={question.key} q={question} mode={session.mode} partner={partner} last={n === session.total} onAnswer={onAnswer} />
    </div>
  );
}

function QuestionCard({
  q,
  mode,
  partner,
  last,
  onAnswer,
}: {
  q: QuizQuestionVM;
  mode: QuizMode;
  partner: string;
  last: boolean;
  onAnswer: (body: AnswerBody) => Promise<boolean>;
}) {
  const [own, setOwn] = useState<string | null>(null);
  const [guess, setGuess] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const ready = mode === 'QUIZ' ? !!own && !!guess : text.trim().length > 0;
  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    const ok = await onAnswer(
      mode === 'QUIZ' ? { questionKey: q.key, ownAnswer: own!, guessAnswer: guess! } : { questionKey: q.key, textAnswer: text.trim() }
    );
    if (!ok) setBusy(false);
  };

  return (
    <div className={s.card}>
      <span className={s.cat}>{CATEGORY_LABEL[q.category]}</span>
      <h3 className={s.q}>{q.text}</h3>
      {mode === 'QUIZ' ? (
        <>
          <Options label="For you" legend="Your answer" q={q} value={own} onChange={setOwn} />
          <Options label={`Guess ${partner}`} legend={`What will ${partner} pick?`} q={q} value={guess} onChange={setGuess} />
        </>
      ) : (
        <label className="fl">
          Your answer
          <textarea className="in" rows={4} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="Take your time." />
        </label>
      )}
      <Button variant="rosy" onClick={submit} disabled={!ready || busy}>
        {last ? 'Finish' : 'Next'} <Icon name="arrowr" size={18} />
      </Button>
    </div>
  );
}

function Options({
  label,
  legend,
  q,
  value,
  onChange,
}: {
  label: string;
  legend: string;
  q: QuizQuestionVM;
  value: string | null;
  onChange: (key: string) => void;
}) {
  return (
    <fieldset className={s.opts}>
      <legend>
        <b>{label}</b> <span className="fine">{legend}</span>
      </legend>
      <div className={s.optGrid} role="radiogroup" aria-label={legend}>
        {q.options.map((o) => (
          <button key={o.key} type="button" role="radio" aria-checked={value === o.key} className={s.opt} onClick={() => onChange(o.key)}>
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/* ---------------- results ---------------- */

function Results({ session, me, partner, onAgain }: { session: QuizSessionVM; me: string; partner: string; onAgain: () => void }) {
  const r = session.result!;
  const byKey = new Map(session.questions.map((x) => [x.key, x]));
  const label = (q: QuizQuestionVM | undefined, key: string | null) => q?.options.find((o) => o.key === key)?.label ?? '';
  const quiz = session.mode === 'QUIZ';

  return (
    <div className={s.results}>
      {quiz ? (
        <section className={`${s.scores} bg-blossom`} aria-label="Scores">
          <div>
            <b>
              {r.myScore} / {r.total}
            </b>
            <span>{me || 'You'} guessed right</span>
          </div>
          <div>
            <b>
              {r.partnerScore} / {r.total}
            </b>
            <span>{partner} guessed right</span>
          </div>
          <div>
            <b>
              {r.sameCount} / {r.total}
            </b>
            <span>Same answers</span>
          </div>
        </section>
      ) : (
        <section className={`${s.scores} bg-zest`}>
          <div>
            <b>Deep Talk</b>
            <span>Read them out loud together.</span>
          </div>
        </section>
      )}

      <ul className={s.items}>
        {r.items.map((it) => (
          <li key={it.questionKey}>
            <ResultItem item={it} q={byKey.get(it.questionKey)} quiz={quiz} me={me || 'You'} partner={partner} label={label} />
          </li>
        ))}
      </ul>

      <Button
        variant="rosy"
        onClick={(e) => {
          const el = e.currentTarget.getBoundingClientRect();
          burst(el.left + el.width / 2, el.top + el.height / 2);
          onAgain();
        }}
      >
        <Icon name="refresh" size={18} /> Play again
      </Button>
    </div>
  );
}

function ResultItem({
  item,
  q,
  quiz,
  me,
  partner,
  label,
}: {
  item: QuizItemVM;
  q: QuizQuestionVM | undefined;
  quiz: boolean;
  me: string;
  partner: string;
  label: (q: QuizQuestionVM | undefined, key: string | null) => string;
}) {
  return (
    <div className={s.item}>
      <b>{q?.text}</b>
      {quiz ? (
        <>
          <div className={`${s.pair} ${item.same ? s.same : s.diff}`}>
            <span>
              <i>{me}</i> {label(q, item.myOwn)}
            </span>
            <span>
              <i>{partner}</i> {label(q, item.partnerOwn)}
            </span>
            <em>{item.same ? 'Same!' : 'Different'}</em>
          </div>
          <p className="fine">
            {me} guessed {label(q, item.myGuess)} ({item.myCorrect ? 'right' : 'not quite'}). {partner} guessed {label(q, item.partnerGuess)} (
            {item.partnerCorrect ? 'right' : 'not quite'}).
          </p>
        </>
      ) : (
        <div className={s.texts}>
          <p>
            <i>{me}</i> {item.myText}
          </p>
          <p>
            <i>{partner}</i> {item.partnerText}
          </p>
        </div>
      )}
    </div>
  );
}
