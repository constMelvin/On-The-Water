'use client';

/**
 * Couple Mode. Reference: src/proto2.js views.couple + proto3 couple-start / couple-tab / idea,
 * couple-*.png. Couple Mode is a room type (COUPLE, two members max), not a separate feature:
 * - Date Ideas: GET /rooms/{id}/couple/ideas, PUT / DELETE .../ideas/{key} to save.
 * - Places to Go: the itinerary. Budget for Two: the budget (the server fixes 2 people).
 * - Our Photos: the photos.
 * A group gala shows the intro, whose button plans a new couple gala.
 */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Card, Icon, Tag, blob, type CardTone } from '@/components/otw';
import { peso } from '@/lib/otw/data';
import { burst, toast } from '@/lib/otw/feedback';
import { useGala } from '@/lib/otw/gala-store';
import { featureKey } from '@/lib/otw/live';
import { failed, upsertIn, useBudget, useCoupleIdeas, useItinerary, usePhotos } from '@/lib/otw/gala-queries';
import { toCents, withTotals } from '@/lib/otw/budget';
import { timeLabel } from '@/lib/otw/time';
import { createStop, saveBudget, setCoupleIdeaSaved, type StopInput } from '@/lib/api/gala';
import { setStopExtras, type StopExtras } from '@/lib/otw/stop-extras';
import type { BudgetVM, CoupleIdeaVM } from '@/lib/api/types';
import type { IconName } from '@/lib/otw/icons';
import { ErrorState, Skeleton } from '../States';
import { AddStopSheet } from '../route/AddStopSheet';
import { useCanEditPlan } from '../route/Route';
import { PhotoGrid } from '../dump/PhotoGrid';
import { Lightbox } from '../dump/Lightbox';
import { UploadSheet } from '../dump/UploadSheet';
import { usePhotoActions, usePhotoRights } from '../dump/Dump';
import s from './couple.module.css';

type TabKey = 'ideas' | 'places' | 'budget' | 'photos';
const TABS: [TabKey, string][] = [
  ['ideas', 'Date Ideas'],
  ['places', 'Places to Go'],
  ['budget', 'Budget for Two'],
  ['photos', 'Our Photos'],
];

const burstMid = () => burst(window.innerWidth / 2, window.innerHeight / 2);

export function Couple() {
  const { room, gala, memberRows, toneOf } = useGala();
  const [tab, setTab] = useState<TabKey>('ideas');

  if (!room) return <Skeleton label="Loading Couple Mode" />;
  if (room.type !== 'COUPLE') return <Intro />;

  return (
    <>
      <div className={`${s.hero} bg-blossom`}>
        <div className={s.pair}>
          {memberRows.slice(0, 2).map((m, i) => (
            <span key={m.userId} style={{ display: 'contents' }}>
              {i === 1 && (
                <span className={s.heartb}>
                  <Icon name="heart" size={22} />
                </span>
              )}
              <Avatar name={m.nickname} tone={toneOf(m.userId)} size={52} userId={m.userId} />
            </span>
          ))}
        </div>
        <div>
          <h2 className="h2">{gala.title}</h2>
          <span className={`fine ${s.meta}`}>
            Couple gala · code {gala.code} ·{' '}
            <Tag variant="cream" icon="users">
              {memberRows.length === 2 ? '2 people' : 'Waiting for your plus-one'}
            </Tag>
          </span>
        </div>
      </div>
      <div className={s.tabs} role="tablist" aria-label="Couple Mode">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'ideas' && <Ideas />}
        {tab === 'places' && <Places />}
        {tab === 'budget' && <BudgetForTwo />}
        {tab === 'photos' && <OurPhotos />}
      </div>
    </>
  );
}

/* ---------------- intro (group gala) ---------------- */

const PREVIEW: [IconName, string][] = [
  ['sparkle', 'Date Ideas'],
  ['pin', 'Places to Go'],
  ['calc', 'Budget for Two'],
  ['image', 'Our Photos'],
];

function Intro() {
  return (
    <div className={s.intro}>
      <span className={`ico xl ${s.cel}`} style={blob(1)}>
        <Icon name="heart" size={44} />
      </span>
      <h2 className="h2">Just the two of you?</h2>
      <p className="sub">Same OTW energy. Smaller passenger count.</p>
      <div className={s.prev}>
        {PREVIEW.map(([icon, label], i) => (
          <Card key={label} tone={'blossom' as CardTone}>
            <div className="ico sm" style={blob(i)}>
              <Icon name={icon} size={20} />
            </div>
            <b>{label}</b>
          </Card>
        ))}
      </div>
      <Link className="btn rosy" href="/plan?type=couple">
        Start Couple Mode
      </Link>
      <p className="fine">It&apos;s still OTW: your own code, your own plan, and it shows up in My Galas.</p>
    </div>
  );
}

/* ---------------- date ideas ---------------- */

function Ideas() {
  const { roomId } = useGala();
  const qc = useQueryClient();
  const q = useCoupleIdeas();
  const key = featureKey(roomId, 'couple');

  if (q.isPending) return <Skeleton label="Loading date ideas" />;
  if (!q.data) return <ErrorState kind="couple" onRetry={async () => (await q.refetch()).isSuccess} />;

  const toggle = (idea: CoupleIdeaVM) => {
    if (!roomId) return;
    const saved = !idea.saved;
    qc.setQueryData<CoupleIdeaVM[]>(key, (list) => list?.map((x) => (x.key === idea.key ? { ...x, saved } : x)));
    setCoupleIdeaSaved(roomId, idea.key, saved)
      .then((row) => {
        qc.setQueryData<CoupleIdeaVM[]>(key, (list) => list?.map((x) => (x.key === row.key ? row : x)));
        if (saved) toast('Saved to your plan.');
      })
      .catch((e: unknown) => failed(qc, [key], e, "Couldn't save that idea."));
  };

  const savedCount = q.data.filter((x) => x.saved).length;
  return (
    <>
      <div className={s.ideas}>
        {q.data.map((idea) => (
          <Card key={idea.key} className={s.idea}>
            <div>
              <b>{idea.title}</b>
              <span>
                {idea.estimatedCost > 0 ? peso(idea.estimatedCost) : 'Free'} · {idea.durationHours}{' '}
                {idea.durationHours === 1 ? 'hr' : 'hrs'}
              </span>
            </div>
            <button
              type="button"
              className={`ibtn${idea.saved ? ` ${s.heartOn}` : ''}`}
              aria-pressed={idea.saved}
              aria-label={`Save ${idea.title}`}
              onClick={() => toggle(idea)}
            >
              <Icon name="heart" size={24} />
            </button>
          </Card>
        ))}
      </div>
      <p className="fine">{savedCount} saved to your plan.</p>
    </>
  );
}

/* ---------------- places to go (itinerary) ---------------- */

function Places() {
  const { roomId, gala } = useGala();
  const canEdit = useCanEditPlan();
  const qc = useQueryClient();
  const q = useItinerary();
  const [adding, setAdding] = useState(false);

  if (q.isPending) return <Skeleton label="Loading places" />;
  const places = [...(q.data ?? [])].sort((a, b) => a.position - b.position);

  const onAdd = async (input: StopInput, pin?: StopExtras) => {
    if (!roomId) return;
    try {
      const row = await createStop(roomId, input);
      // The pin is kept on this device (same helper as the plan tab). TODO(backend): lat/lng in the DTO.
      if (pin) setStopExtras(roomId, row.id, pin);
      upsertIn(qc, featureKey(roomId, 'itinerary'), row);
      void qc.invalidateQueries({ queryKey: featureKey(roomId, 'summary') });
      setAdding(false);
      toast('Place added.');
      burstMid();
    } catch (e) {
      failed(qc, [featureKey(roomId, 'itinerary')], e, "Couldn't add that place.");
    }
  };

  return (
    <>
      {places.length ? (
        <ul className={s.plc}>
          {places.map((p, i) => (
            <li key={p.id}>
              <span className={s.stn} style={blob(i)}>
                {i + 1}
              </span>
              <span>
                <b>{p.title}</b>
                <i className={s.eta}>{[p.startsAt && timeLabel(p.startsAt), p.notes].filter(Boolean).join(' · ') || ' '}</i>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="fine">No places yet. Where to first?</p>
      )}
      {canEdit && (
        <Button sm onClick={() => setAdding(true)} style={{ marginTop: 12 }}>
          <Icon name="plus" size={18} /> Add a place
        </Button>
      )}
      {adding && (
        <AddStopSheet
          title="Add a place"
          startDate={gala.dateISO}
          days={gala.days ?? 1}
          onAdd={onAdd}
          onClose={() => setAdding(false)}
        />
      )}
    </>
  );
}

/* ---------------- budget for two ---------------- */

const FIELDS: [key: 'foodAmount' | 'transportAmount' | 'activitiesAmount', label: string, icon: IconName][] = [
  ['foodAmount', 'Food', 'food'],
  ['transportAmount', 'Transportation', 'bus'],
  ['activitiesAmount', 'Activities', 'flag'],
];

function BudgetForTwo() {
  const { roomId } = useGala();
  const qc = useQueryClient();
  const q = useBudget();
  const [draft, setDraft] = useState<BudgetVM | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  if (q.isPending) return <Skeleton label="Loading the budget" />;
  const value = draft ?? q.data;
  if (!value) return <ErrorState kind="budget" onRetry={async () => (await q.refetch()).isSuccess} />;

  const save = async (next: BudgetVM) => {
    if (!roomId) return;
    try {
      const saved = await saveBudget(roomId, {
        transportAmount: next.transportAmount,
        stayAmount: next.stayAmount,
        foodAmount: next.foodAmount,
        activitiesAmount: next.activitiesAmount,
        otherAmount: next.otherAmount,
        participantCount: 2,
      });
      qc.setQueryData(featureKey(roomId, 'budget'), saved);
      setDraft((d) => (d === next ? null : d));
      toast('Budget updated.');
    } catch (e) {
      setDraft(null);
      failed(qc, [featureKey(roomId, 'budget')], e, "Couldn't save your estimate.");
    }
  };

  const onAmount = (k: (typeof FIELDS)[number][0], pesos: number) => {
    const next = withTotals({ ...value, [k]: toCents(pesos) / 100, participantCount: 2 });
    setDraft(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(next), 600);
  };

  const total = FIELDS.reduce((sum, [k]) => sum + toCents(value[k]), 0) / 100;
  return (
    <div className={s.bud}>
      <Card>
        <div className={s.rows}>
          {FIELDS.map(([k, label, icon]) => (
            <label key={k} className={s.row}>
              <span className="ico sm">
                <Icon name={icon} size={20} />
              </span>
              <span className={s.label}>{label}</span>
              <span className={s.peso}>
                <i aria-hidden="true">₱</i>
                <input
                  className="in num"
                  type="number"
                  min={0}
                  step={100}
                  inputMode="numeric"
                  aria-label={label}
                  defaultValue={value[k] || ''}
                  onChange={(e) => onAmount(k, Number(e.target.value))}
                />
              </span>
            </label>
          ))}
        </div>
      </Card>
      <div className={s.res}>
        <Card tone="zest" className={s.big}>
          <span>Total for two</span>
          <b>{peso(total)}</b>
        </Card>
        <Card tone="rosy" className={s.big}>
          <span>Each</span>
          <b>{peso(Math.round(total * 50) / 100)}</b>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- our photos ---------------- */

function OurPhotos() {
  const { nameOf } = useGala();
  const q = usePhotos();
  const { canAdd } = usePhotoRights();
  const actions = usePhotoActions();
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  if (q.isPending) return <Skeleton variant="dump" label="Loading your photos" />;
  const photos = [...(q.data ?? [])]
    .filter((p) => p.status !== 'FAILED')
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return (
    <>
      {photos.length ? (
        <PhotoGrid photos={photos} nameOf={nameOf} onOpen={setOpen} two />
      ) : (
        <p className="fine">No photos yet. Go make some memories.</p>
      )}
      {canAdd && (
        <Button sm onClick={() => setUploading(true)} style={{ marginTop: 12 }}>
          <Icon name="upload" size={18} /> Add Photos
        </Button>
      )}
      {uploading && (
        <UploadSheet startUpload={actions.startUpload} register={actions.register} onUploaded={actions.onUploaded} onClose={() => setUploading(false)} />
      )}
      {open !== null && photos.length > 0 && (
        <Lightbox photos={photos} index={open} nameOf={nameOf} onIndex={setOpen} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
