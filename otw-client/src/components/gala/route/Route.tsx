'use client';

/**
 * The plan (itinerary, "The Gala Route"). Reference: src/proto2.js views.itinerary + proto3
 * stop-move / stop-del / save-stop and the drag handlers, itinerary-*.png.
 * Data is GET /rooms/{roomId}/itinerary. Reordering sends the whole route with each stop's
 * version (POST .../reorder; a stale one is a 409: toast + refetch). Adding a stop also posts a
 * card in the chat (the server writes it). Members can edit only while "Edit the plan" is on.
 * Editing a stop (host or its creator) is PATCH .../itinerary/{id} with the stop's version; a stale
 * one is a 409. The map pin (lat/lng) is saved on the stop (V23) so every member sees it; the
 * custom type and the pin's area name still live on this device (see lib/otw/stop-extras.ts).
 * The map is a real MapLibre map with the driving route through every pinned stop to the gala.
 */
import { useEffect, useRef, useState, type DragEvent } from 'react';
import dynamic from 'next/dynamic';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Card, Icon, Tag, blob } from '@/components/otw';
import { burst, toast } from '@/lib/otw/feedback';
import { useGala } from '@/lib/otw/gala-store';
import { featureKey } from '@/lib/otw/live';
import { failed, removeFrom, upsertIn, useItinerary, useTabState } from '@/lib/otw/gala-queries';
import { dayLabel, timeLabel } from '@/lib/otw/time';
import { removeStopExtras, setStopExtras, useStopExtras, type StopExtras } from '@/lib/otw/stop-extras';
import { isApiError } from '@/lib/api/client';
import { createStop, deleteStop, reorderStops, updateStop, type StopInput } from '@/lib/api/gala';
import type { ItineraryItemVM } from '@/lib/api/types';
import { Empty, StateGate } from '../States';
import { AddStopSheet } from './AddStopSheet';
import type { MapStop } from './RouteMap';
import type { Landmark } from '@/components/plan/MapPicker';
import { metaFor } from './stop-style';
import { galaHref } from '../nav';
import s from './route.module.css';

/** MapLibre needs `window` and WebGL, so the map loads on the client only. */
const RouteMap = dynamic(() => import('./RouteMap'), {
  ssr: false,
  loading: () => <div className={s.mapLoading} aria-label="Loading the map" />,
});

const burstMid = () => burst(window.innerWidth / 2, window.innerHeight / 2);

const byPosition = (a: ItineraryItemVM, b: ItineraryItemVM) => a.position - b.position;

/** True when the caller may add, move or delete stops (host, or "Edit the plan" is on). */
export function useCanEditPlan(): boolean {
  const { role, room } = useGala();
  return role === 'leader' || !!room?.permissions.membersCanEditPlan;
}

export function Route() {
  const { gala, room, nameOf, toneOf, roomId, setViewState, role, myUserId } = useGala();
  const canEdit = useCanEditPlan();
  const qc = useQueryClient();
  const q = useItinerary();
  const state = useTabState(q);
  const key = featureKey(roomId, 'itinerary');
  const summaryKey = featureKey(roomId, 'summary');

  const stops = [...(q.data ?? [])].sort(byPosition);
  // Custom type + the pin's area name, kept on this device (the pin itself is on the stop).
  const extras = useStopExtras(roomId);
  /** The stop's pin: the server's, else an older one only this device still has. */
  const pinOf = (it: ItineraryItemVM): { lat: number; lng: number } | null => {
    if (it.lat != null && it.lng != null) return { lat: it.lat, lng: it.lng };
    const x = extras[it.id];
    return x?.lat != null && x?.lng != null ? { lat: x.lat, lng: x.lng } : null;
  };
  // The caption's area: the most common one among the stops' pins, else the gala's destination.
  const areas = new Map<string, number>();
  for (const it of stops) {
    const a = extras[it.id]?.area;
    if (a) areas.set(a, (areas.get(a) ?? 0) + 1);
  }
  const area = [...areas.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? gala.dest;
  const [adding, setAdding] = useState(false);
  // The stop being edited (by id, so a stop someone deletes meanwhile just closes the sheet).
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = stops.find((it) => it.id === editingId) ?? null;
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const multiDay = (gala.days ?? 1) > 1;

  /** Saves a new order: shown right away, then replaced by what the server returns. */
  const reorder = (next: ItineraryItemVM[]) => {
    if (!roomId) return;
    qc.setQueryData<ItineraryItemVM[]>(key, next.map((it, position) => ({ ...it, position })));
    reorderStops(
      roomId,
      next.map(({ id, version }) => ({ id, version }))
    )
      .then((saved) => {
        qc.setQueryData(key, saved);
        toast('Route updated.');
      })
      .catch((e: unknown) => failed(qc, [key], e, "Couldn't move that stop."));
  };

  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= stops.length) return;
    const next = stops.slice();
    [next[i], next[j]] = [next[j], next[i]];
    reorder(next);
  };

  const onDrop = (targetId: string) => {
    const from = stops.findIndex((x) => x.id === dragId);
    const to = stops.findIndex((x) => x.id === targetId);
    setDragId(null);
    setOverId(null);
    if (from < 0 || to < 0 || from === to) return;
    const next = stops.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorder(next);
  };

  const onDelete = (it: ItineraryItemVM) => {
    if (!roomId) return;
    removeFrom(qc, key, it.id);
    deleteStop(roomId, it.id)
      .then(() => {
        removeStopExtras(roomId, it.id);
        toast('Stop removed.');
        void qc.invalidateQueries({ queryKey: summaryKey });
      })
      .catch((e: unknown) => failed(qc, [key], e, "Couldn't remove that stop."));
  };

  const onAdd = async (input: StopInput, pin?: StopExtras) => {
    if (!roomId) return;
    try {
      const row = await createStop(roomId, { ...input, lat: pin?.lat ?? null, lng: pin?.lng ?? null });
      if (pin) setStopExtras(roomId, row.id, pin);
      upsertIn(qc, key, row);
      void qc.invalidateQueries({ queryKey: summaryKey });
      void qc.invalidateQueries({ queryKey: featureKey(roomId, 'chat') });
      setAdding(false);
      toast('Stop added. Everyone can see it.');
      burstMid();
    } catch (e) {
      failed(qc, [key], e, "Couldn't add that stop.");
    }
  };

  /**
   * Saves an edited stop: PATCH with the version we read, so a stale one is a 409. Notes go as ''
   * (not null) because the server ignores null; the time can be changed but not cleared.
   */
  const onSave = async (it: ItineraryItemVM, input: StopInput, pin?: StopExtras) => {
    if (!roomId) return;
    try {
      const saved = await updateStop(roomId, it.id, {
        title: input.title,
        stopType: input.stopType,
        notes: input.notes ?? '',
        startsAt: input.startsAt,
        ...(pin?.lat != null && pin?.lng != null ? { lat: pin.lat, lng: pin.lng } : { clearPin: true }),
        version: it.version,
      });
      if (pin) setStopExtras(roomId, it.id, pin);
      else removeStopExtras(roomId, it.id);
      upsertIn(qc, key, saved);
      setEditingId(null);
      toast('Stop updated.');
    } catch (e) {
      if (isApiError(e, 'OPTIMISTIC_LOCK_CONFLICT')) {
        toast("Couldn't update that stop. Someone may have changed it. Try again.", 'err');
        void qc.invalidateQueries({ queryKey: key });
        setEditingId(null); // reopen to edit the latest
      } else {
        failed(qc, [key], e, "Couldn't update that stop.");
      }
    }
  };

  /** Only the Gala Leader or the person who added a stop may edit it (the server says 403 otherwise). */
  const canEditStop = (it: ItineraryItemVM) => canEdit && (role === 'leader' || (!!myUserId && it.createdBy === myUserId));

  // Pins added before V23 live only in the browser that added them: upload each once (if this
  // person may edit that stop), so every member sees it on the map.
  const uploaded = useRef(new Set<string>());
  useEffect(() => {
    if (!roomId) return;
    for (const it of stops) {
      const x = extras[it.id];
      if (it.lat != null || x?.lat == null || x?.lng == null || uploaded.current.has(it.id) || !canEditStop(it)) continue;
      uploaded.current.add(it.id);
      updateStop(roomId, it.id, { lat: x.lat, lng: x.lng, version: it.version })
        .then((saved) => upsertIn(qc, key, saved))
        .catch(() => {
          /* stale version or no right to edit: the pin stays on this device; try again next visit */
        });
    }
  });

  const destination =
    room?.destinationLat != null && room?.destinationLng != null
      ? { lat: room.destinationLat, lng: room.destinationLng, label: room.destination }
      : null;
  /** What's already on the map, for the Add / Edit sheet (leaving out the stop being edited). */
  const landmarksFor = (skipId?: string): Landmark[] => [
    ...stops.flatMap((it, i): Landmark[] => {
      const p = it.id === skipId ? null : pinOf(it);
      return p ? [{ ...p, label: `${i + 1}. ${it.title}`, kind: 'stop', n: i + 1 }] : [];
    }),
    ...(destination ? [{ ...destination, kind: 'gala' as const }] : []),
  ];

  const openAdd = () => setAdding(true);
  const dragProps = (it: ItineraryItemVM) =>
    canEdit
      ? {
          draggable: true,
          onDragStart: (e: DragEvent) => {
            e.dataTransfer.effectAllowed = 'move';
            setDragId(it.id);
          },
          onDragOver: (e: DragEvent) => {
            if (!dragId) return;
            e.preventDefault();
            setOverId(it.id);
          },
          onDrop: (e: DragEvent) => {
            e.preventDefault();
            onDrop(it.id);
          },
          onDragEnd: () => {
            setDragId(null);
            setOverId(null);
          },
        }
      : {};

  return (
    <>
      <div className={`phead ${s.head}`}>
        <div>
          <Tag icon="route">The Gala Route</Tag>
          <h2 className="h2">Okay, what&apos;s the plan?</h2>
          <p className="sub">Add the places, activities, food stops, and everything in between.</p>
        </div>
        {canEdit && (
          <Button className="hide-m" onClick={openAdd}>
            <Icon name="plus" size={20} /> Add a Stop
          </Button>
        )}
      </div>

      <StateGate
        state={state}
        kind="itinerary"
        onAction={() => {
          setViewState('default');
          if (canEdit) openAdd();
        }}
        onRetry={async () => {
          setViewState('default');
          return (await q.refetch()).isSuccess;
        }}
      >
        {!canEdit && <p className="fine">The Gala Leader turned off editing the plan. You can still see every stop.</p>}
        {stops.length === 0 ? (
          canEdit ? (
            <Empty kind="itinerary" onAction={openAdd} />
          ) : (
            <Empty kind="itinerary" href={galaHref(gala.code, 'chat')} cta="Ask in the chat" />
          )
        ) : (
          <div className={s.cols}>
            <ol className={s.stops}>
              {stops.map((it, i) => {
                const who = nameOf(it.createdBy);
                const x = extras[it.id];
                const meta = metaFor(it.stopType, x?.customType);
                const cls = [s.stop, dragId === it.id && s.drag, overId === it.id && dragId !== it.id && s.over, it.completed && s.done]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <li key={it.id} className={cls} {...dragProps(it)}>
                    <span className={s.stn} style={blob(i)}>
                      {i + 1}
                    </span>
                    <Card className={s.stopc}>
                      {canEdit && (
                        <span className={s.grip} aria-hidden="true">
                          <Icon name="drag" size={20} />
                        </span>
                      )}
                      <div className={s.sbody}>
                        <div className={s.srow1}>
                          <b>{it.title}</b>
                          <Tag variant={meta.tag} icon={meta.icon}>
                            {meta.label}
                          </Tag>
                        </div>
                        {x?.area && (
                          <span className={s.stime}>
                            <Icon name="pin" size={14} />
                            {x.area}
                          </span>
                        )}
                        {it.startsAt && (
                          <span className={s.stime}>
                            <Icon name="clock" size={14} />
                            {multiDay ? `${dayLabel(it.startsAt)} · ` : ''}
                            {timeLabel(it.startsAt)}
                          </span>
                        )}
                        {it.notes && <p>{it.notes}</p>}
                        <span className={s.addby}>
                          Added by <Avatar name={who} tone={toneOf(it.createdBy)} size={20} userId={it.createdBy} />
                          {who}
                        </span>
                      </div>
                      {canEdit && (
                        <div className={s.sact}>
                          <button
                            type="button"
                            className="ibtn"
                            aria-label={`Move ${it.title} up`}
                            disabled={i === 0}
                            onClick={() => move(i, -1)}
                          >
                            <Icon name="chevu" size={20} />
                          </button>
                          <button
                            type="button"
                            className="ibtn"
                            aria-label={`Move ${it.title} down`}
                            disabled={i === stops.length - 1}
                            onClick={() => move(i, 1)}
                          >
                            <Icon name="chevd" size={20} />
                          </button>
                          {canEditStop(it) && (
                            <button
                              type="button"
                              className="ibtn"
                              aria-label={`Edit ${it.title}`}
                              onClick={() => setEditingId(it.id)}
                            >
                              <Icon name="edit" size={20} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="ibtn"
                            aria-label={`Remove ${it.title}`}
                            onClick={() => onDelete(it)}
                          >
                            <Icon name="trash" size={20} />
                          </button>
                        </div>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ol>
            <Card className={s.mapcard}>
              <RouteMap
                stops={stops.map(
                  (it, i): MapStop => ({
                    id: it.id,
                    n: i + 1,
                    title: it.title,
                    stopType: it.stopType,
                    customType: extras[it.id]?.customType,
                    ...(pinOf(it) ?? { lat: null, lng: null }),
                  })
                )}
                destination={destination}
                area={area}
              />
            </Card>
          </div>
        )}
        {canEdit && stops.length > 1 && <p className={`fine ${s.hint}`}>Use the arrows to reorder. Drag works on desktop.</p>}
      </StateGate>

      {canEdit && (
        <button type="button" className={s.fab} onClick={openAdd} aria-label="Add a Stop">
          <Icon name="plus" size={30} />
        </button>
      )}

      {adding && (
        <AddStopSheet
          startDate={gala.dateISO}
          days={gala.days ?? 1}
          landmarks={landmarksFor()}
          onAdd={onAdd}
          onClose={() => setAdding(false)}
        />
      )}

      {editing && (
        <AddStopSheet
          key={editing.id}
          title="Save changes"
          startDate={gala.dateISO}
          days={gala.days ?? 1}
          initial={{
            title: editing.title,
            stopType: editing.stopType,
            customType: extras[editing.id]?.customType,
            startsAt: editing.startsAt,
            notes: editing.notes,
            lat: pinOf(editing)?.lat,
            lng: pinOf(editing)?.lng,
            area: extras[editing.id]?.area,
          }}
          landmarks={landmarksFor(editing.id)}
          onAdd={(input, pin) => onSave(editing, input, pin)}
          onClose={() => setEditingId(null)}
        />
      )}
    </>
  );
}
