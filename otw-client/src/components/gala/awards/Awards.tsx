'use client';

/**
 * Barkada Awards (after the gala): the Gala Leader opens a poll, everyone votes once per category (changing it
 * until it closes), then the winners show. Votes are anonymous: the server only ever sends you your own picks,
 * and results only exist once the poll is closed.
 * Poll, leader open/close, the results list and the awarding ceremony. (Certificates come next.)
 */
import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Icon, ProgressBar, Sheet, blob } from '@/components/otw';
import { burst, toast } from '@/lib/otw/feedback';
import { useGala } from '@/lib/otw/gala-store';
import { featureKey } from '@/lib/otw/live';
import { failed, useAwards } from '@/lib/otw/gala-queries';
import { closeAwards, openAwards } from '@/lib/api/gala';
import type { AwardCategoryVM, AwardKey, AwardResultVM, AwardsVM } from '@/lib/api/types';
import { ErrorState, Skeleton } from '../States';
import { galaHref } from '../nav';
import { AWARD_META, whenLabel } from './awards-meta';
import { Ballot } from './Ballot';
import { Ceremony } from './Ceremony';
import { CertificateSheet, type CertificateTarget } from './CertificateSheet';
import s from './awards.module.css';

export function Awards() {
  const { roomId, role, gala } = useGala();
  const qc = useQueryClient();
  const q = useAwards();
  const key = featureKey(roomId, 'awards');

  const [confirmClose, setConfirmClose] = useState(false);
  const [ceremony, setCeremony] = useState(false);
  const [cert, setCert] = useState<CertificateTarget | null>(null);
  const [hours, setHours] = useState<24 | 48 | 72>(48);
  const [busy, setBusy] = useState(false);

  if (q.isPending) return <Skeleton label="Loading the awards" />;
  if (!q.data) return <ErrorState kind="completed" onRetry={async () => (await q.refetch()).isSuccess} />;

  const data = q.data;
  const leader = role === 'leader';
  const set = (next: AwardsVM) => qc.setQueryData<AwardsVM>(key, next);

  const open = async () => {
    if (!roomId || busy) return;
    setBusy(true);
    try {
      set(await openAwards(roomId, hours));
      toast('Voting is open. G na!');
    } catch (e) {
      failed(qc, [key], e, "Couldn't open voting.");
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    if (!roomId || busy) return;
    setBusy(true);
    setConfirmClose(false);
    try {
      set(await closeAwards(roomId));
      toast('Voting closed. Here are the winners.');
    } catch (e) {
      failed(qc, [key], e, "Couldn't close voting.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.wrap}>
      <header className={`dhero bg-rosy ${s.hero}`}>
        <span className={`ico xl ${s.cel}`} style={blob(2)}>
          <Icon name="crown" size={44} />
        </span>
        <h1 className="h1s">Barkada Awards</h1>
        <p className="lead2">
          {data.state === 'CLOSED' ? 'And the winners are…' : data.state === 'OPEN' ? 'Sino ang bida ng barkada? Vote na.' : `Pagkatapos ng ${gala.title || 'gala'}, kilalanin ang mga bida.`}
        </p>
      </header>

      {data.state === 'NOT_OPEN' && (
        <section className={s.panel} aria-live="polite">
          {leader && data.canOpen ? (
            <>
              <h2 className={s.h}>Open the voting</h2>
              <p>Everyone votes once per award, and they can change it until voting closes. Results stay hidden until then. Votes are anonymous.</p>
              <div className={s.chips} role="radiogroup" aria-label="How long voting stays open">
                {([24, 48, 72] as const).map((h) => (
                  <button key={h} type="button" role="radio" aria-checked={hours === h} onClick={() => setHours(h)}>
                    {h} hours
                  </button>
                ))}
              </div>
              <Button variant="rosy" onClick={open} disabled={busy}>
                <Icon name="crown" size={20} /> Open voting
              </Button>
            </>
          ) : (
            <>
              <h2 className={s.h}>{leader ? 'Not ready yet' : 'Voting hasn’t opened'}</h2>
              <p>{data.unavailableReason ?? 'The Gala Leader will open voting soon.'}</p>
            </>
          )}
        </section>
      )}

      {data.state === 'OPEN' && (
        <>
          <section className={s.status} aria-label="Voting status">
            <div>
              <b>
                {data.votedCount} of {data.eligibleVoters} voted
              </b>
              {data.closesAt && <span>Voting closes {whenLabel(data.closesAt)}</span>}
            </div>
            <ProgressBar value={data.eligibleVoters ? (data.votedCount / data.eligibleVoters) * 100 : 0} label={`${data.votedCount} of ${data.eligibleVoters} members have voted`} className={s.bar} />
            {leader && (
              <Button sm variant="zest" onClick={() => setConfirmClose(true)} disabled={busy}>
                <Icon name="flag" size={16} /> Close voting
              </Button>
            )}
          </section>
          <Ballot data={data} onVoted={set} />
        </>
      )}

      {data.state === 'CLOSED' && (
        <>
          <section className={s.panel}>
            <h2 className={s.h}>The winners are in</h2>
            <p>
              {data.results.some((r) => r.winners.length > 0)
                ? 'Watch the awarding, one award at a time. You can replay it anytime.'
                : 'Walang bumoto this time, so there are no winners to reveal.'}
            </p>
            {data.results.some((r) => r.winners.length > 0) && (
              <Button variant="rosy" onClick={() => setCeremony(true)}>
                <Icon name="crown" size={20} /> Start the ceremony
              </Button>
            )}
          </section>
          <ResultsList data={data} onCertificate={setCert} />
        </>
      )}

      {ceremony && (
        <Ceremony
          results={data.results}
          categories={data.categories}
          gala={gala.title || 'gala'}
          onClose={() => setCeremony(false)}
          onCertificate={(t) => {
            setCeremony(false);
            setCert(t);
          }}
        />
      )}
      {cert && <CertificateSheet target={cert} onClose={() => setCert(null)} />}

      <div className={s.back}>
        <Link className="btn sm ghost" href={galaHref(gala.code, 'recap')}>
          <Icon name="back" size={16} /> Back to the recap
        </Link>
      </div>

      {confirmClose && (
        <Sheet
          title="Close voting now?"
          onClose={() => setConfirmClose(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmClose(false)} data-autofocus>
                Keep voting
              </Button>
              <Button
                variant="rosy"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  burst(r.left + r.width / 2, r.top);
                  void close();
                }}
              >
                Close voting
              </Button>
            </>
          }
        >
          <p>
            Winners show up for everyone and votes can’t be changed anymore.
            {data.votedCount < data.eligibleVoters ? ` ${data.eligibleVoters - data.votedCount} still haven’t voted.` : ''}
          </p>
        </Sheet>
      )}
    </div>
  );
}

/* ---------------- results (plain list; the ceremony comes in the next pass) ---------------- */

function ResultsList({ data, onCertificate }: { data: AwardsVM; onCertificate: (t: CertificateTarget) => void }) {
  const { nameOf, toneOf } = useGala();
  const cats = new Map<AwardKey, AwardCategoryVM>(data.categories.map((c) => [c.key, c]));
  return (
    <ul className={s.results} aria-label="Winners">
      {data.results.map((r) => (
        <ResultCard key={r.categoryKey} r={r} cat={cats.get(r.categoryKey)} nameOf={nameOf} toneOf={toneOf} onCertificate={onCertificate} />
      ))}
    </ul>
  );
}

function ResultCard({
  r,
  cat,
  nameOf,
  toneOf,
  onCertificate,
}: {
  r: AwardResultVM;
  cat: AwardCategoryVM | undefined;
  nameOf: (id: string | null | undefined) => string;
  toneOf: ReturnType<typeof useGala>['toneOf'];
  onCertificate: (t: CertificateTarget) => void;
}) {
  const meta = AWARD_META[r.categoryKey];
  const none = r.winners.length === 0;
  return (
    <li className={`${s.res} ${s[`t_${meta.tone}`]}`}>
      <span className="ico" style={blob(0)} aria-hidden="true">
        <Icon name={meta.icon} size={26} />
      </span>
      <div className={s.resBody}>
        <h3>{cat?.title ?? r.categoryKey}</h3>
        {none ? (
          <p className={s.none}>Walang bumoto</p>
        ) : (
          <>
            <ul className={s.winners}>
              {r.winners.map((id) => (
                <li key={id}>
                  <Avatar name={nameOf(id)} tone={toneOf(id)} size={36} userId={id} />
                  <b>{nameOf(id)}</b>
                  {cat && (
                    <Button sm variant="ghost" onClick={() => onCertificate({ userId: id, category: cat })} aria-label={`Certificate for ${nameOf(id)}, ${cat.title}`}>
                      <Icon name="download" size={16} /> Certificate
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {r.winners.length > 1 && <p className={s.tie}>Co-winners! Tabla ang boto.</p>}
            <ul className={s.tally} aria-label="Votes">
              {r.tally.map((t) => (
                <li key={t.userId}>
                  <span>{nameOf(t.userId)}</span>
                  <i style={{ width: `${(t.votes / Math.max(1, r.tally[0].votes)) * 100}%` }} />
                  <em>{t.votes}</em>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </li>
  );
}
