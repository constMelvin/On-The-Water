import { useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Icon, type IconName } from '@/components/Icon';
import { RouteMap, type Landmark, type MapStop } from '@/components/maps';
import { Empty, StateGate } from '@/components/States';
import { Card, Fab, IconButton, PageHead, Tag, blob, type TagVariant } from '@/components/ui';
import { isApiError } from '@/lib/api/client';
import { createStop, deleteStop, reorderStops, updateStop, type StopInput } from '@/lib/api/gala';
import type { ItineraryItemVM, StopType } from '@/lib/api/types';
import { burst, toast } from '@/lib/otw/feedback';
import { failed, removeFrom, upsertIn, useItinerary, useTabState } from '@/lib/otw/gala-queries';
import { useGala } from '@/lib/otw/gala-store';
import { featureKey } from '@/lib/otw/live';
import { removeStopExtras, setStopExtras, useStopExtras, type StopExtras } from '@/lib/otw/stop-extras';
import { dayLabel, timeLabel } from '@/lib/otw/time';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { AddStopSheet } from './AddStopSheet';
import { GalaPage } from './GalaShell';
import { galaHref } from './nav';

/**
 * The plan ("The Gala Route"), port of otw-client/src/components/gala/route/Route.tsx. GET .../itinerary; reorder
 * sends the whole route with each stop's version (stale = 409); edits PATCH with the version. The map shows the
 * pinned stops in order with the driving route to the gala.
 */
interface StopMeta {
  label: string;
  tag: TagVariant;
  icon: IconName;
  fill: string;
  ink: string;
}
const BY_TYPE: Record<StopType, StopMeta> = {
  MEET_UP: { label: 'Meet-up', tag: 'teal', icon: 'stopMeet', fill: brand.teal, ink: brand.cream },
  ACTIVITY: { label: 'Activity', tag: 'zest', icon: 'stopActivity', fill: brand.zest, ink: brand.tealDark },
  FOOD: { label: 'Food', tag: 'blossom', icon: 'stopFood', fill: brand.blossom, ink: brand.tealDark },
};
export function metaFor(stopType: StopType, customType?: string): StopMeta {
  if (customType) return { label: customType, tag: 'rosy', icon: 'stopCustom', fill: brand.rosy, ink: brand.cream };
  return BY_TYPE[stopType] ?? BY_TYPE.ACTIVITY;
}

const byPosition = (a: ItineraryItemVM, b: ItineraryItemVM) => a.position - b.position;

/** True when the caller may add, move or delete stops (host, or "Edit the plan" is on). */
export function useCanEditPlan(): boolean {
  const { role, room } = useGala();
  return role === 'leader' || !!room?.permissions.membersCanEditPlan;
}

export function Route() {
  const { gala, room, nameOf, toneOf, roomId, setViewState, role, myUserId } = useGala();
  const { colors } = useTheme();
  const canEdit = useCanEditPlan();
  const qc = useQueryClient();
  const q = useItinerary();
  const state = useTabState(q);
  const key = featureKey(roomId, 'itinerary');
  const summaryKey = featureKey(roomId, 'summary');
  const stops = [...(q.data ?? [])].sort(byPosition);
  const extras = useStopExtras(roomId);
  const pinOf = (it: ItineraryItemVM): { lat: number; lng: number } | null => {
    if (it.lat != null && it.lng != null) return { lat: it.lat, lng: it.lng };
    const x = extras[it.id];
    return x?.lat != null && x?.lng != null ? { lat: x.lat, lng: x.lng } : null;
  };
  const areas = new Map<string, number>();
  for (const it of stops) {
    const a = extras[it.id]?.area;
    if (a) areas.set(a, (areas.get(a) ?? 0) + 1);
  }
  const area = [...areas.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? gala.dest;
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ItineraryItemVM | null>(null);
  const editing = stops.find((it) => it.id === editingId) ?? null;
  const multiDay = (gala.days ?? 1) > 1;

  const reorder = (next: ItineraryItemVM[]) => {
    if (!roomId) return;
    qc.setQueryData<ItineraryItemVM[]>(
      key,
      next.map((it, position) => ({ ...it, position })),
    );
    reorderStops(
      roomId,
      next.map(({ id, version }) => ({ id, version })),
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

  const onDelete = (it: ItineraryItemVM) => {
    if (!roomId) return;
    setDeleting(null);
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
      burst();
    } catch (e) {
      failed(qc, [key], e, "Couldn't add that stop.");
    }
  };

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
        setEditingId(null);
      } else {
        failed(qc, [key], e, "Couldn't update that stop.");
      }
    }
  };

  const canEditStop = (it: ItineraryItemVM) => canEdit && (role === 'leader' || (!!myUserId && it.createdBy === myUserId));

  // Pins added before V23 live only on the device that added them: upload each once.
  const uploaded = useRef(new Set<string>());
  useEffect(() => {
    if (!roomId) return;
    for (const it of stops) {
      const x = extras[it.id];
      if (it.lat != null || x?.lat == null || x?.lng == null || uploaded.current.has(it.id) || !canEditStop(it)) continue;
      uploaded.current.add(it.id);
      updateStop(roomId, it.id, { lat: x.lat, lng: x.lng, version: it.version })
        .then((saved) => upsertIn(qc, key, saved))
        .catch(() => undefined);
    }
  });

  const destination = room?.destinationLat != null && room?.destinationLng != null ? { lat: room.destinationLat, lng: room.destinationLng, label: room.destination } : null;
  const landmarksFor = (skipId?: string): Landmark[] => [
    ...stops.flatMap((it, i): Landmark[] => {
      const p = it.id === skipId ? null : pinOf(it);
      return p ? [{ ...p, label: `${i + 1}. ${it.title}`, kind: 'stop', n: i + 1 }] : [];
    }),
    ...(destination ? [{ ...destination, kind: 'gala' as const }] : []),
  ];
  const openAdd = () => setAdding(true);

  return (
    <GalaPage overlay={canEdit ? <Fab label="Add a Stop" onPress={openAdd} /> : null}>
      <PageHead title="Okay, what's the plan?" sub="Add the places, activities, food stops, and everything in between." tag={<Tag icon="route">The Gala Route</Tag>} />
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
        }}>
        {!canEdit ? <Text style={[styles.fine, { color: colors.text }]}>The Gala Leader turned off editing the plan. You can still see every stop.</Text> : null}
        {stops.length === 0 ? (
          canEdit ? (
            <Empty kind="itinerary" onAction={openAdd} />
          ) : (
            <Empty kind="itinerary" cta="Ask in the chat" onAction={() => router.navigate(galaHref(roomId!, 'chat') as Href)} />
          )
        ) : (
          <>
            <Card style={styles.mapcard}>
              <RouteMap
                stops={stops.map((it, i): MapStop => {
                  const meta = metaFor(it.stopType, extras[it.id]?.customType);
                  return { id: it.id, n: i + 1, title: it.title, fill: meta.fill, ink: meta.ink, icon: meta.icon, ...(pinOf(it) ?? { lat: null, lng: null }) };
                })}
                destination={destination}
              />
              <View style={[styles.stime, styles.areaRow]}>
                <Icon name="pin" size={14} color={colors.text} />
                <Text style={[styles.area, { color: colors.text }]}>{area}</Text>
              </View>
            </Card>
            {stops.map((it, i) => {
              const who = nameOf(it.createdBy);
              const x = extras[it.id];
              const meta = metaFor(it.stopType, x?.customType);
              return (
                <View key={it.id} style={[styles.stop, it.completed && { opacity: 0.6 }]}>
                  <View style={[styles.stn, blob(i, 40)]}>
                    <Text style={styles.stnText}>{i + 1}</Text>
                  </View>
                  <View style={styles.flex}>
                    <Card style={styles.stopc}>
                      <View style={styles.srow1}>
                        <Text style={[styles.stitle, { color: colors.text }]}>{it.title}</Text>
                        <Tag variant={meta.tag} icon={meta.icon}>
                          {meta.label}
                        </Tag>
                      </View>
                      {x?.area ? (
                        <View style={styles.stime}>
                          <Icon name="pin" size={14} color={colors.text} />
                          <Text style={[styles.stimeText, { color: colors.text }]}>{x.area}</Text>
                        </View>
                      ) : null}
                      {it.startsAt ? (
                        <View style={styles.stime}>
                          <Icon name="clock" size={14} color={colors.text} />
                          <Text style={[styles.stimeText, { color: colors.text }]}>
                            {multiDay ? `${dayLabel(it.startsAt)} · ` : ''}
                            {timeLabel(it.startsAt)}
                          </Text>
                        </View>
                      ) : null}
                      {it.notes ? <Text style={[styles.notes, { color: colors.text }]}>{it.notes}</Text> : null}
                      <View style={styles.addby}>
                        <Text style={[styles.addbyText, { color: colors.text }]}>Added by</Text>
                        <Avatar name={who} tone={toneOf(it.createdBy)} size={20} userId={it.createdBy} />
                        <Text style={[styles.addbyText, { color: colors.text }]}>{who}</Text>
                      </View>
                      {canEdit ? (
                        <View style={[styles.sact, { borderTopColor: colors.line }]}>
                          {i > 0 ? <IconButton icon="chevu" label={`Move ${it.title} up`} onPress={() => move(i, -1)} /> : null}
                          {i < stops.length - 1 ? <IconButton icon="chevd" label={`Move ${it.title} down`} onPress={() => move(i, 1)} /> : null}
                          {canEditStop(it) ? <IconButton icon="edit" label={`Edit ${it.title}`} onPress={() => setEditingId(it.id)} /> : null}
                          <IconButton icon="trash" label={`Remove ${it.title}`} onPress={() => setDeleting(it)} />
                        </View>
                      ) : null}
                    </Card>
                  </View>
                </View>
              );
            })}
          </>
        )}
        {canEdit && stops.length > 1 ? <Text style={[styles.fine, { color: colors.text }]}>Use the arrows to reorder.</Text> : null}
      </StateGate>
      {adding ? <AddStopSheet startDate={gala.dateISO} days={gala.days ?? 1} landmarks={landmarksFor()} onAdd={onAdd} onClose={() => setAdding(false)} /> : null}
      {editing ? (
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
      ) : null}
      {deleting ? (
        <ConfirmSheet
          title="Delete this stop?"
          body={`“${deleting.title}” will be removed from the plan for everyone.`}
          confirm="Delete stop"
          onClose={() => setDeleting(null)}
          onConfirm={() => onDelete(deleting)}
        />
      ) : null}
    </GalaPage>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fine: { fontFamily: font.body, fontSize: 14, opacity: 0.85 },
  mapcard: { padding: 8, gap: 8 },
  area: { fontFamily: font.bodyHeavy, fontSize: 13 },
  areaRow: { paddingHorizontal: 6, paddingBottom: 4 },
  stop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stn: { width: 40, height: 40, backgroundColor: brand.rosy, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  stnText: { fontFamily: font.display, fontSize: 18, color: brand.cream },
  stopc: { padding: 14, gap: 6 },
  srow1: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  stitle: { fontFamily: font.displaySemi, fontSize: 18, flexShrink: 1 },
  stime: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stimeText: { fontFamily: font.bodyHeavy, fontSize: 13 },
  notes: { fontFamily: font.body, fontSize: 15, lineHeight: 21 },
  addby: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addbyText: { fontFamily: font.bodyBold, fontSize: 13, opacity: 0.85 },
  sact: { flexDirection: 'row', justifyContent: 'flex-end', gap: 2, borderTopWidth: 2, borderStyle: 'dashed', paddingTop: 4 },
});
