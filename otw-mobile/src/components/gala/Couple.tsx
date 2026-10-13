import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Avatar } from '@/components/Avatar';
import { Icon, type IconName } from '@/components/Icon';
import { Pin, regionFor } from '@/components/maps';
import { PickerField } from '@/components/PickerField';
import { Sheet } from '@/components/Sheet';
import { ErrorState, Skeleton } from '@/components/States';
import { Button, Card, CheckBox, ChoiceChips, ErrorNote, Field, Fine, IconBlob, IconButton, PageHead, ProgressBar, Tag } from '@/components/ui';
import { answerQuiz, createBucketItem, createStop, deleteBucketItem, getSpots, saveHome, startQuiz, updateBucketItem, updateRoom, type BucketInput, type BucketPatch } from '@/lib/api/gala';
import type { BucketItemVM, HalfwayVM, QuizCategory, QuizItemVM, QuizMode, QuizQuestionVM, QuizSessionVM, SpotCategory, SpotVM } from '@/lib/api/types';
import { peso } from '@/lib/otw/data';
import { driveThumb } from '@/lib/otw/drive';
import { burst, toast } from '@/lib/otw/feedback';
import { failed, removeFrom, upsertIn, useCoupleBucket, useCoupleHalfway, useCoupleQuiz, usePhotos } from '@/lib/otw/gala-queries';
import { useGala } from '@/lib/otw/gala-store';
import { MIN_QUERY, SEARCH_DEBOUNCE_MS, isAbort, placeAt, searchPlaces, type Place } from '@/lib/otw/geocode';
import { featureKey, roomKey } from '@/lib/otw/live';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { GalaPage } from './GalaShell';
import { useCanEditPlan } from './Route';

/**
 * Couple Mode (port of otw-client/src/components/gala/couple/*). A couple gala (COUPLE, two members max) adds
 * Our Little Bucket List, the Halfway Checker and Who Knows Who Better?. A group gala sees a short intro.
 */
type TabKey = 'bucket' | 'halfway' | 'quiz';
const TABS: { value: TabKey; label: string; icon: IconName }[] = [
  { value: 'bucket', label: 'Bucket List', icon: 'flag' },
  { value: 'halfway', label: 'Halfway', icon: 'pin' },
  { value: 'quiz', label: 'Who Knows Who?', icon: 'heart' },
];

export function Couple() {
  const { room, gala, memberRows, toneOf } = useGala();
  const { colors } = useTheme();
  const [tab, setTab] = useState<TabKey>('bucket');
  if (!room)
    return (
      <GalaPage>
        <Skeleton label="Loading Couple Mode" />
      </GalaPage>
    );
  if (room.type !== 'COUPLE') return <Intro />;
  const pair = memberRows.slice(0, 2);
  return (
    <GalaPage>
      <View style={[styles.hero, { backgroundColor: colors.secBlossom }]}>
        <View style={styles.pair}>
          {pair.map((m, i) => (
            <View key={m.userId} style={styles.pairPerson}>
              {i === 1 ? (
                <View style={styles.heartb}>
                  <Icon name="heart" size={18} color={brand.cream} />
                </View>
              ) : null}
              <Avatar name={m.nickname} tone={toneOf(m.userId)} size={52} userId={m.userId} />
            </View>
          ))}
        </View>
        <Text style={[styles.h2, { color: colors.secInk }]}>{gala.title}</Text>
        <Tag variant="cream" icon="users">
          {pair.length === 2 ? 'Couple gala · 2 people' : 'Waiting for your partner'}
        </Tag>
      </View>
      <ChoiceChips options={TABS} value={tab} onChange={setTab} />
      {tab === 'bucket' ? <BucketList /> : null}
      {tab === 'halfway' ? <Halfway /> : null}
      {tab === 'quiz' ? <Quiz /> : null}
    </GalaPage>
  );
}

const PREVIEW: [IconName, string][] = [
  ['flag', 'Bucket list'],
  ['pin', 'Halfway checker'],
  ['heart', 'Who knows who?'],
];

function Intro() {
  const { colors } = useTheme();
  return (
    <GalaPage>
      <View style={styles.intro}>
        <IconBlob name="heart" index={1} size={96} iconSize={44} />
        <PageHead title="Just the two of you?" sub="Start a couple gala with its own code and plan." />
        {PREVIEW.map(([icon, label], i) => (
          <Card key={label} bg={brand.blossom} shadow={brand.rosy} style={styles.prevCard}>
            <IconBlob name={icon} index={i} size={40} iconSize={20} bg={colors.surface} />
            <Text style={[styles.b, { color: brand.tealDark }]}>{label}</Text>
          </Card>
        ))}
        <Button label="Start Couple Mode" onPress={() => router.push({ pathname: '/create', params: { type: 'couple' } })} />
      </View>
    </GalaPage>
  );
}

/* ================= Our Little Bucket List ================= */

const dateLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

function BucketList() {
  const { roomId, nameOf, toneOf } = useGala();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const q = useCoupleBucket();
  const canEdit = useCanEditPlan();
  const key = featureKey(roomId, 'couple-bucket');
  const [editing, setEditing] = useState<BucketItemVM | 'new' | null>(null);
  const [memoryFor, setMemoryFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BucketItemVM | null>(null);

  if (q.isPending) return <Skeleton label="Loading your bucket list" />;
  if (!q.data) return <ErrorState kind="couple" onRetry={async () => (await q.refetch()).isSuccess} />;

  const items = q.data;
  const done = items.filter((i) => i.completed);
  const todo = items.filter((i) => !i.completed);

  const patch = (id: string, body: Omit<BucketPatch, 'version'>) => {
    if (!roomId) return Promise.resolve(null);
    const current = qc.getQueryData<BucketItemVM[]>(key)?.find((i) => i.id === id);
    if (!current) return Promise.resolve(null);
    return updateBucketItem(roomId, id, { ...body, version: current.version })
      .then((row) => {
        upsertIn(qc, key, row);
        return row;
      })
      .catch((e: unknown) => {
        failed(qc, [key], e, "Couldn't update that. Try again.");
        return null;
      });
  };

  const toggle = (item: BucketItemVM) => {
    const completed = !item.completed;
    qc.setQueryData<BucketItemVM[]>(key, (rows) => rows?.map((r) => (r.id === item.id ? { ...r, completed, ...(completed ? {} : { photoId: null, memory: null }) } : r)));
    void patch(item.id, { completed }).then((row) => {
      if (row?.completed) {
        burst();
        setMemoryFor(row.id);
      }
    });
  };

  const remove = (item: BucketItemVM) => {
    if (!roomId) return;
    setConfirmDelete(null);
    removeFrom<BucketItemVM>(qc, key, item.id);
    deleteBucketItem(roomId, item.id)
      .then(() => toast('Removed.'))
      .catch((e: unknown) => failed(qc, [key], e, "Couldn't remove that."));
  };

  return (
    <>
      <View style={[styles.progress, { backgroundColor: colors.secBlossom }]}>
        <Text style={[styles.big, { color: colors.secInk }]}>
          {done.length} of {items.length} <Text style={styles.fineInline}>{items.length === 0 ? 'Nothing yet' : 'done'}</Text>
        </Text>
        <ProgressBar value={items.length ? (done.length / items.length) * 100 : 0} label={`${done.length} of ${items.length} bucket list items done`} color={brand.rosy} />
        {canEdit ? <Button sm fw={false} icon="plus" label="Add item" onPress={() => setEditing('new')} /> : null}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <IconBlob name="flag" size={96} iconSize={44} bg={brand.zest} />
          <Text style={[styles.h3, { color: colors.text }]}>Nothing here yet.</Text>
          <Text style={[styles.p, { color: colors.text, textAlign: 'center' }]}>{canEdit ? 'Add things you want to do together.' : 'Nothing has been added yet.'}</Text>
          {canEdit ? <Button fw={false} icon="plus" label="Add item" onPress={() => setEditing('new')} /> : null}
        </View>
      ) : (
        <>
          {todo.map((item) => (
            <View key={item.id} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <CheckBox checked={item.completed} label={`Mark "${item.title}" as done`} onPress={() => toggle(item)} />
              <View style={styles.flex}>
                <Text style={[styles.b, { color: colors.text }]}>{item.title}</Text>
                {item.description ? <Text style={[styles.p, { color: colors.text }]}>{item.description}</Text> : null}
                {item.estBudget !== null || item.targetDate ? (
                  <View style={styles.chipsRow}>
                    {item.estBudget !== null ? <Tag variant="blossom" icon="wallet">{peso(item.estBudget)}</Tag> : null}
                    {item.targetDate ? <Tag variant="cream" icon="calendar">{dateLabel(item.targetDate)}</Tag> : null}
                  </View>
                ) : null}
              </View>
              {canEdit ? (
                <View>
                  <IconButton icon="edit" label={`Edit ${item.title}`} onPress={() => setEditing(item)} />
                  <IconButton icon="trash" label={`Remove ${item.title}`} onPress={() => setConfirmDelete(item)} />
                </View>
              ) : null}
            </View>
          ))}
          {todo.length === 0 ? <Text style={[styles.b, { color: colors.text, textAlign: 'center' }]}>Everything is done!</Text> : null}
        </>
      )}

      <Text style={[styles.h3, { color: colors.text }]}>Memories</Text>
      {done.length === 0 ? (
        <Fine>Finished items show up here.</Fine>
      ) : (
        done.map((item) => (
          <Card key={item.id} style={styles.memory}>
            {item.photoId ? <MemoryPhoto photoId={item.photoId} /> : null}
            <Text style={[styles.b, { color: colors.text }]}>{item.title}</Text>
            {item.memory ? <Text style={[styles.p, { color: colors.text }]}>{item.memory}</Text> : null}
            <View style={styles.by}>
              {item.completedBy ? <Avatar name={nameOf(item.completedBy)} tone={toneOf(item.completedBy)} size={20} userId={item.completedBy} /> : null}
              <Text style={[styles.fine, { color: colors.text }]}>{item.completedAt ? dateLabel(item.completedAt.slice(0, 10)) : ''}</Text>
            </View>
            <Text accessibilityRole="button" onPress={() => setMemoryFor(item.id)} style={[styles.lnk, { color: colors.text }]}>
              {item.memory || item.photoId ? 'Edit memory' : 'Add memory'}
            </Text>
          </Card>
        ))
      )}

      {editing ? (
        <ItemSheet
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            if (!roomId) return;
            if (editing === 'new') {
              upsertIn(qc, key, await createBucketItem(roomId, input));
              toast('Added.');
            } else {
              const row = await patch(editing.id, {
                title: input.title,
                description: input.description ?? '',
                ...(input.estBudget === undefined ? { clearBudget: true } : { estBudget: input.estBudget }),
                ...(input.targetDate ? { targetDate: input.targetDate } : { clearDate: true }),
              });
              if (!row) throw new Error('Not saved.');
              toast('Saved.');
            }
            setEditing(null);
          }}
        />
      ) : null}
      {memoryFor ? (
        <MemorySheet
          item={items.find((i) => i.id === memoryFor) ?? null}
          onClose={() => setMemoryFor(null)}
          onSave={async (body) => {
            const row = await patch(memoryFor, body);
            if (row) toast('Memory saved.');
            setMemoryFor(null);
          }}
        />
      ) : null}
      {confirmDelete ? (
        <Sheet
          title="Remove item?"
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <Button icon="trash" label="Remove" onPress={() => remove(confirmDelete)} />
              <Button variant="ghost" label="Keep it" onPress={() => setConfirmDelete(null)} />
            </>
          }>
          <Text style={[styles.p, { color: colors.text }]}>“{confirmDelete.title}” will be removed for both of you.</Text>
        </Sheet>
      ) : null}
    </>
  );
}

function MemoryPhoto({ photoId }: { photoId: string }) {
  const { colors } = useTheme();
  const photos = usePhotos();
  const photo = photos.data?.find((p) => p.id === photoId);
  if (!photo)
    return (
      <View style={[styles.memPhoto, { backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }]}>
        <Icon name="image" size={28} color={colors.text} />
      </View>
    );
  return <Image source={{ uri: driveThumb(photo.driveFileId, 480) }} style={styles.memPhoto} contentFit="cover" />;
}

function ItemSheet({ item, onClose, onSave }: { item: BucketItemVM | null; onClose: () => void; onSave: (input: BucketInput) => Promise<void> }) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [budget, setBudget] = useState(item?.estBudget != null ? String(item.estBudget) : '');
  const [date, setDate] = useState(item?.targetDate ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    if (!title.trim()) return setError('Add a title.');
    const amount = budget.trim() === '' ? undefined : Number(budget);
    if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) return setError('Enter a valid budget.');
    setError('');
    setBusy(true);
    try {
      await onSave({ title: title.trim(), description: description.trim(), estBudget: amount, targetDate: date || undefined });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't save that. Try again.");
      setBusy(false);
    }
  };
  return (
    <Sheet title={item ? 'Edit item' : 'Add item'} onClose={onClose} footer={<Button label={item ? 'Save' : 'Add'} busy={busy} onPress={() => void submit()} />}>
      <Field label="Title" value={title} onChangeText={setTitle} maxLength={120} placeholder="e.g. Watch the sunrise" />
      <Field label="Notes (optional)" value={description} onChangeText={setDescription} maxLength={500} multiline />
      <Field label="Budget (₱)" keyboardType="decimal-pad" value={budget} onChangeText={(v) => setBudget(v.replace(/[^0-9.]/g, ''))} placeholder="0.00" />
      <PickerField onSurface label="Target date" mode="date" value={date} placeholder="Pick a day" onChange={setDate} />
      <ErrorNote message={error} />
    </Sheet>
  );
}

function MemorySheet({ item, onClose, onSave }: { item: BucketItemVM | null; onClose: () => void; onSave: (body: Omit<BucketPatch, 'version'>) => Promise<void> }) {
  const { colors } = useTheme();
  const photos = usePhotos();
  const [memory, setMemory] = useState(item?.memory ?? '');
  const [photoId, setPhotoId] = useState<string | null>(item?.photoId ?? null);
  const [busy, setBusy] = useState(false);
  if (!item) return null;
  const choices = (photos.data ?? []).filter((p) => p.status === 'READY' && (p.mimeType ?? 'image/').startsWith('image/'));
  const save = async () => {
    if (busy) return;
    setBusy(true);
    await onSave({ memory: memory.trim(), ...(photoId ? { photoId } : item.photoId ? { clearPhoto: true } : {}) });
  };
  return (
    <Sheet
      title="Add a memory"
      onClose={onClose}
      footer={
        <>
          <Button label="Save" busy={busy} onPress={() => void save()} />
          <Button variant="ghost" label="Skip" onPress={onClose} />
        </>
      }>
      <Fine>{item.title}</Fine>
      <Field label="Caption (optional)" multiline maxLength={500} value={memory} onChangeText={setMemory} placeholder="What will you remember?" />
      <Text style={[styles.b, { color: colors.text }]}>Photo from Gala Dump</Text>
      {photos.isPending ? (
        <Fine>Loading photos…</Fine>
      ) : choices.length === 0 ? (
        <Fine>No photos yet. Add some in Gala Dump first.</Fine>
      ) : (
        <View style={styles.picks} accessibilityRole="radiogroup" accessibilityLabel="Memory photo">
          {choices.map((p) => {
            const on = photoId === p.id;
            return (
              <Pressable
                key={p.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={p.caption || 'Photo'}
                onPress={() => setPhotoId(on ? null : p.id)}
                style={[styles.pickBtn, { borderColor: on ? brand.rosy : 'transparent' }]}>
                <Image source={{ uri: driveThumb(p.driveFileId, 240) }} style={styles.pickImg} />
              </Pressable>
            );
          })}
        </View>
      )}
    </Sheet>
  );
}

/* ================= Halfway Checker ================= */

const SPOT_CATS: { value: SpotCategory; label: string }[] = [
  { value: 'CAFE', label: 'Cafés' },
  { value: 'RESTAURANT', label: 'Restaurants' },
  { value: 'PARK', label: 'Parks' },
  { value: 'MALL', label: 'Malls' },
];
type Budget = 'any' | '1' | '2';
const BUDGETS: { value: Budget; label: string }[] = [
  { value: 'any', label: 'Any budget' },
  { value: '1', label: '₱ budget' },
  { value: '2', label: '₱₱ mid-range' },
];
const TIER_LABEL = ['Free', '₱', '₱₱'] as const;

function Halfway() {
  const { roomId, role, memberRows, myUserId } = useGala();
  const { colors, scheme } = useTheme();
  const qc = useQueryClient();
  const q = useCoupleHalfway();
  const canEditPlan = useCanEditPlan();
  const key = featureKey(roomId, 'couple-halfway');
  const [setting, setSetting] = useState(false);
  const [category, setCategory] = useState<SpotCategory>('CAFE');
  const [budget, setBudget] = useState<Budget>('any');
  const [selected, setSelected] = useState<SpotVM | null>(null);
  const mid = q.data?.midpoint ?? null;
  const spotsQ = useQuery({
    queryKey: ['couple-spots', roomId, category, mid && mid.lat.toFixed(3), mid && mid.lng.toFixed(3)],
    queryFn: () => getSpots(roomId!, category),
    enabled: !!roomId && !!mid,
    staleTime: 30 * 60_000,
    retry: false,
  });
  const spots = useMemo(() => (spotsQ.data?.spots ?? []).filter((p) => budget === 'any' || p.priceTier <= Number(budget)), [spotsQ.data, budget]);

  if (q.isPending) return <Skeleton label="Loading Halfway Checker" />;
  if (!q.data) return <ErrorState kind="couple" onRetry={async () => (await q.refetch()).isSuccess} />;

  const data = q.data;
  const partnerName = memberRows.find((m) => m.userId !== myUserId)?.nickname ?? 'Your partner';

  const saveMine = async (lat: number, lng: number, label: string) => {
    if (!roomId) return;
    qc.setQueryData<HalfwayVM>(key, await saveHome(roomId, { lat, lng, label }));
    setSetting(false);
    toast('Home saved.');
  };
  const addStop = (p: SpotVM) => {
    if (!roomId) return;
    createStop(roomId, { title: p.name, stopType: p.category === 'CAFE' || p.category === 'RESTAURANT' ? 'FOOD' : 'ACTIVITY', lat: p.lat, lng: p.lng })
      .then(() => {
        void qc.invalidateQueries({ queryKey: featureKey(roomId, 'itinerary') });
        toast('Added to your plan.');
      })
      .catch((e: unknown) => failed(qc, [], e, "Couldn't add that stop."));
  };
  const meetHere = (p: SpotVM) => {
    if (!roomId) return;
    updateRoom(roomId, { meetingLat: p.lat, meetingLng: p.lng, meetingLabel: p.name })
      .then(() => {
        void qc.invalidateQueries({ queryKey: roomKey(roomId) });
        toast('Meeting point set.');
      })
      .catch((e: unknown) => failed(qc, [], e, "Couldn't set the meeting point."));
  };

  const pts = [data.mine, data.partner, mid].filter((x): x is { lat: number; lng: number } => !!x).map((p) => ({ latitude: p.lat, longitude: p.lng }));

  return (
    <>
      <Card>
        <View style={styles.home}>
          <IconBlob name="home" size={38} iconSize={20} bg={colors.surface2} />
          <View style={styles.flex}>
            <Text style={[styles.b, { color: colors.text }]}>Your home</Text>
            <Text style={[styles.fine, { color: colors.text }]}>{data.mine ? data.mine.label || 'Saved' : 'Not set yet'}</Text>
          </View>
          <Button sm fw={false} variant={data.mine ? 'ghost' : 'rosy'} label={data.mine ? 'Change' : 'Set home'} onPress={() => setSetting(true)} />
        </View>
        <View style={styles.home}>
          <IconBlob name="user" size={38} iconSize={20} bg={colors.surface2} />
          <View style={styles.flex}>
            <Text style={[styles.b, { color: colors.text }]}>{partnerName}</Text>
            <Text style={[styles.fine, { color: colors.text }]}>{data.partner ? 'Home saved' : 'Not set yet'}</Text>
          </View>
        </View>
      </Card>

      <MapView style={styles.map} initialRegion={regionFor(pts)} region={pts.length ? regionFor(pts, 1.8) : undefined} userInterfaceStyle={scheme} toolbarEnabled={false}>
        {data.mine && data.partner ? (
          <Polyline
            coordinates={[
              { latitude: data.mine.lat, longitude: data.mine.lng },
              { latitude: data.partner.lat, longitude: data.partner.lng },
            ]}
            strokeColor={brand.rosy}
            strokeWidth={4}
            lineDashPattern={[10, 8]}
          />
        ) : null}
        {data.mine ? (
          <Marker coordinate={{ latitude: data.mine.lat, longitude: data.mine.lng }} title="Your home" anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
            <Pin fill={brand.teal} ink={brand.cream} icon="home" />
          </Marker>
        ) : null}
        {data.partner ? (
          <Marker coordinate={{ latitude: data.partner.lat, longitude: data.partner.lng }} title={`${partnerName}'s home`} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
            <Pin fill={brand.blossom} ink={brand.tealDark} icon="user" />
          </Marker>
        ) : null}
        {mid ? (
          <Marker coordinate={{ latitude: mid.lat, longitude: mid.lng }} title="Halfway" anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
            <Pin fill={brand.rosy} ink={brand.cream} icon="heart" size={38} />
          </Marker>
        ) : null}
        {spots.map((p, i) => (
          <Marker key={`${p.lat},${p.lng},${p.name}`} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.name} onPress={() => setSelected(p)} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
            <Pin fill={selected === p ? brand.rosy : brand.zest} ink={brand.tealDark} n={i + 1} size={28} />
          </Marker>
        ))}
      </MapView>

      {!data.mine || !data.partner ? (
        <Fine>
          {!data.mine ? 'Set your home to start.' : `Waiting for ${partnerName} to set their home.`} The halfway point shows up once you both have.
        </Fine>
      ) : (
        <>
          <View style={[styles.progress, { backgroundColor: colors.secBlossom }]}>
            <Text style={[styles.big, { color: colors.secInk }]}>{data.distanceKm?.toFixed(1)} km apart</Text>
            <Text style={[styles.fine, { color: colors.secInk }]}>
              The midpoint is a starting point, not always the fairest place to meet. Check travel time for each of you before you decide.
            </Text>
          </View>
          <Text style={[styles.h3, { color: colors.text }]}>Date spots near the midpoint</Text>
          <ChoiceChips
            options={SPOT_CATS}
            value={category}
            onChange={(v) => {
              setCategory(v);
              setSelected(null);
            }}
          />
          <ChoiceChips options={BUDGETS} value={budget} onChange={setBudget} />
          <Fine>Budget is a rough guess by place type. Real prices aren’t available.</Fine>
          {spotsQ.isPending ? (
            <Skeleton label="Finding date spots" />
          ) : spotsQ.isError ? (
            <ErrorState kind="couple" title="Couldn't load spots." body="Try again in a moment." onRetry={async () => (await spotsQ.refetch()).isSuccess} />
          ) : !spotsQ.data?.available ? (
            <Fine>Spot suggestions are unavailable right now. Try again later.</Fine>
          ) : spots.length === 0 ? (
            <Fine>No matches near the midpoint. Try another type or budget.</Fine>
          ) : (
            spots.map((p, i) => {
              const on = selected === p;
              return (
                <View key={`${p.lat},${p.lng},${p.name}`} style={[styles.spot, { backgroundColor: colors.surface, borderColor: on ? brand.rosy : colors.line }]}>
                  <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setSelected(on ? null : p)}>
                    <Text style={[styles.b, { color: colors.text }]}>
                      {i + 1}. {p.name}
                    </Text>
                    <Text style={[styles.fine, { color: colors.text }]}>
                      {p.distanceKm.toFixed(1)} km from the midpoint · {TIER_LABEL[p.priceTier]} est.
                    </Text>
                  </Pressable>
                  {on ? (
                    <View style={styles.spotActs}>
                      <Button sm fw={false} icon="plus" label="Add to plan" disabled={!canEditPlan} onPress={() => addStop(p)} />
                      <Button sm fw={false} variant="teal" icon="flag" label="Set as meeting point" disabled={role !== 'leader'} onPress={() => meetHere(p)} />
                      {!canEditPlan || role !== 'leader' ? <Fine>{!canEditPlan ? 'Plan editing is off for members.' : 'Only the Gala Leader sets the meeting point.'}</Fine> : null}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
          <Fine>Map data © OpenStreetMap contributors.</Fine>
        </>
      )}
      {setting ? <HomeSheet onClose={() => setSetting(false)} onSave={saveMine} /> : null}
    </>
  );
}

function HomeSheet({ onClose, onSave }: { onClose: () => void; onSave: (lat: number, lng: number, label: string) => Promise<void> }) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const shown = text.trim().length < MIN_QUERY ? [] : results;

  useEffect(() => {
    const t = text.trim();
    if (t.length < MIN_QUERY) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      searchPlaces(t, ctrl.signal)
        .then(setResults)
        .catch((e: unknown) => {
          if (!isAbort(e)) setResults([]);
        })
        .finally(() => setSearching(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [text]);

  const choose = async (lat: number, lng: number, label: string) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await onSave(lat, lng, label.slice(0, 150));
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't save that. Try again.");
      setBusy(false);
    }
  };

  const fromDevice = async () => {
    setError('');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return setError('Location is blocked. Search for your place instead, or allow it in your phone settings.');
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = pos.coords;
      let label = 'My location';
      try {
        label = (await placeAt(lat, lng)).label;
      } catch {
        /* the pin is enough */
      }
      await choose(lat, lng, label);
    } catch {
      setError('Couldn’t get your location. Search for your place instead.');
    }
  };

  return (
    <Sheet title="Set your home" onClose={onClose}>
      <Fine>Only the two of you can see this. A nearby landmark or area works too.</Fine>
      <Field label="Search a place" value={text} onChangeText={setText} placeholder="e.g. Cubao, Quezon City" autoCorrect={false} />
      {searching ? <Fine>Searching…</Fine> : null}
      {shown.map((p) => (
        <Pressable key={`${p.lat},${p.lng}`} accessibilityRole="button" disabled={busy} onPress={() => void choose(p.lat, p.lng, p.label)} style={styles.result}>
          <Icon name="pin" size={18} color={colors.text} />
          <Text style={[styles.p, styles.flex, { color: colors.text }]}>{p.label}</Text>
        </Pressable>
      ))}
      <Button sm fw={false} variant="ghost" icon="nav" label="Use my current location" disabled={busy} onPress={() => void fromDevice()} />
      <Fine>Your phone will ask first. We only use it to save this pin.</Fine>
      <ErrorNote message={error} />
    </Sheet>
  );
}

/* ================= Who Knows Who Better? ================= */

const CATEGORY_LABEL: Record<QuizCategory, string> = {
  FAVORITES: 'Favorites',
  HABITS: 'Habits',
  LOVE_LANGUAGES: 'Love languages',
  PREFERENCES: 'Preferences',
  DEEP_TALK: 'Deep talk',
};
const QUIZ_CATEGORIES: ('MIX' | QuizCategory)[] = ['MIX', 'FAVORITES', 'HABITS', 'LOVE_LANGUAGES', 'PREFERENCES'];
type AnswerBody = { questionKey: string; ownAnswer?: string; guessAnswer?: string; textAnswer?: string };

function Quiz() {
  const { roomId, myUserId, nameOf } = useGala();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const q = useCoupleQuiz();
  const key = featureKey(roomId, 'couple-quiz');
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

  if (!session || picking) return <Picker busy={busy} onStart={start} onCancel={session ? () => setPicking(false) : undefined} />;
  if (session.revealed && session.result) return <QuizResults session={session} me={nameOf(myUserId)} partner={partnerName} onAgain={() => setPicking(true)} />;
  if (session.myAnswered >= session.total) {
    return (
      <View style={[styles.progress, { backgroundColor: colors.secBlossom, alignItems: 'center' }]} accessibilityLiveRegion="polite">
        <IconBlob name="clock" size={80} iconSize={40} />
        <Text style={[styles.h3, { color: colors.secInk }]}>You&apos;re done!</Text>
        <Text style={[styles.p, { color: colors.secInk, textAlign: 'center' }]}>
          Waiting for {partnerName} to finish ({session.partnerAnswered} of {session.total}). The results show up here when they do.
        </Text>
      </View>
    );
  }

  const answered = new Set(session.myAnswers.map((a) => a.questionKey));
  const question = session.questions.find((x) => !answered.has(x.key));
  if (!question) return null;
  const n = answered.size + 1;
  return (
    <>
      <Fine>
        Question {n} of {session.total}
      </Fine>
      <ProgressBar value={(answered.size / session.total) * 100} label={`${answered.size} of ${session.total} answered`} />
      <QuestionCard
        key={question.key}
        q={question}
        mode={session.mode}
        partner={partnerName}
        last={n === session.total}
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
    </>
  );
}

function Picker({ busy, onStart, onCancel }: { busy: boolean; onStart: (mode: QuizMode, category?: QuizCategory) => void; onCancel?: () => void }) {
  const { colors } = useTheme();
  const [category, setCategory] = useState<'MIX' | QuizCategory>('MIX');
  return (
    <>
      <View style={[styles.mode, { backgroundColor: colors.secBlossom }]}>
        <IconBlob name="users" size={52} />
        <Text style={[styles.h3, { color: colors.secInk }]}>Quiz</Text>
        <Text style={[styles.p, { color: colors.secInk }]}>6 questions. Pick your answer, then guess your partner&apos;s. Most right guesses wins.</Text>
        <ChoiceChips options={QUIZ_CATEGORIES.map((c) => ({ value: c, label: c === 'MIX' ? 'Mix' : CATEGORY_LABEL[c] }))} value={category} onChange={setCategory} />
        <Button label="Start quiz" busy={busy} onPress={() => onStart('QUIZ', category === 'MIX' ? undefined : category)} />
      </View>
      <View style={[styles.mode, { backgroundColor: colors.secZest }]}>
        <IconBlob name="heart" size={52} />
        <Text style={[styles.h3, { color: colors.secInk }]}>Deep Talk</Text>
        <Text style={[styles.p, { color: colors.secInk }]}>5 open questions. Write your answers, then read each other&apos;s together. No score.</Text>
        <Button variant="teal" label="Start Deep Talk" busy={busy} onPress={() => onStart('DEEP_TALK')} />
      </View>
      {onCancel ? (
        <Text accessibilityRole="button" onPress={onCancel} style={[styles.lnk, { color: colors.text, alignSelf: 'center' }]}>
          Back to results
        </Text>
      ) : null}
    </>
  );
}

function QuestionCard({ q, mode, partner, last, onAnswer }: { q: QuizQuestionVM; mode: QuizMode; partner: string; last: boolean; onAnswer: (b: AnswerBody) => Promise<boolean> }) {
  const { colors } = useTheme();
  const [own, setOwn] = useState<string | null>(null);
  const [guess, setGuess] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const ready = mode === 'QUIZ' ? !!own && !!guess : text.trim().length > 0;
  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    const ok = await onAnswer(mode === 'QUIZ' ? { questionKey: q.key, ownAnswer: own!, guessAnswer: guess! } : { questionKey: q.key, textAnswer: text.trim() });
    if (!ok) setBusy(false);
  };
  const options = (label: string, legend: string, value: string | null, onChange: (k: string) => void) => (
    <View style={styles.opts}>
      <Text style={[styles.b, { color: colors.text }]}>
        {label} <Text style={styles.fineInline}>{legend}</Text>
      </Text>
      <View style={styles.optGrid} accessibilityRole="radiogroup" accessibilityLabel={legend}>
        {q.options.map((o) => {
          const on = value === o.key;
          return (
            <Pressable
              key={o.key}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.key)}
              style={[styles.opt, on ? { backgroundColor: brand.rosy, borderColor: brand.rosy, borderBottomColor: brand.rosyDark } : { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Text style={[styles.optText, { color: on ? brand.cream : colors.text }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
  return (
    <Card style={{ gap: 14 }}>
      <Tag variant="blossom">{CATEGORY_LABEL[q.category]}</Tag>
      <Text style={[styles.qText, { color: colors.text }]}>{q.text}</Text>
      {mode === 'QUIZ' ? (
        <>
          {options('For you', 'Your answer', own, setOwn)}
          {options(`Guess ${partner}`, `What will ${partner} pick?`, guess, setGuess)}
        </>
      ) : (
        <Field label="Your answer" multiline maxLength={500} value={text} onChangeText={setText} placeholder="Take your time." />
      )}
      <Button icon="arrowr" label={last ? 'Finish' : 'Next'} disabled={!ready} busy={busy} onPress={() => void submit()} />
    </Card>
  );
}

function QuizResults({ session, me, partner, onAgain }: { session: QuizSessionVM; me: string; partner: string; onAgain: () => void }) {
  const { colors } = useTheme();
  const r = session.result!;
  const byKey = new Map(session.questions.map((x) => [x.key, x]));
  const label = (q: QuizQuestionVM | undefined, k: string | null) => q?.options.find((o) => o.key === k)?.label ?? '';
  const quiz = session.mode === 'QUIZ';
  const score = (big: string, small: string) => (
    <View style={styles.score}>
      <Text style={[styles.big, { color: colors.secInk }]}>{big}</Text>
      <Text style={[styles.fine, { color: colors.secInk }]}>{small}</Text>
    </View>
  );
  return (
    <>
      <View style={[styles.scores, { backgroundColor: quiz ? colors.secBlossom : colors.secZest }]}>
        {quiz ? (
          <>
            {score(`${r.myScore} / ${r.total}`, `${me || 'You'} guessed right`)}
            {score(`${r.partnerScore} / ${r.total}`, `${partner} guessed right`)}
            {score(`${r.sameCount} / ${r.total}`, 'Same answers')}
          </>
        ) : (
          score('Deep Talk', 'Read them out loud together.')
        )}
      </View>
      {r.items.map((it: QuizItemVM) => {
        const q = byKey.get(it.questionKey);
        return (
          <Card key={it.questionKey}>
            <Text style={[styles.b, { color: colors.text }]}>{q?.text}</Text>
            {quiz ? (
              <>
                <View style={[styles.pairBox, { backgroundColor: it.same ? brand.teal : colors.surface2 }]}>
                  <Text style={[styles.p, { color: it.same ? brand.cream : colors.text }]}>
                    <Text style={{ fontFamily: font.bodyHeavy }}>{me || 'You'}:</Text> {label(q, it.myOwn)}
                  </Text>
                  <Text style={[styles.p, { color: it.same ? brand.cream : colors.text }]}>
                    <Text style={{ fontFamily: font.bodyHeavy }}>{partner}:</Text> {label(q, it.partnerOwn)}
                  </Text>
                  <Text style={[styles.b, { color: it.same ? brand.zest : colors.rosyInk }]}>{it.same ? 'Same!' : 'Different'}</Text>
                </View>
                <Fine>
                  {me || 'You'} guessed {label(q, it.myGuess)} ({it.myCorrect ? 'right' : 'not quite'}). {partner} guessed {label(q, it.partnerGuess)} ({it.partnerCorrect ? 'right' : 'not quite'}).
                </Fine>
              </>
            ) : (
              <>
                <Text style={[styles.p, { color: colors.text }]}>
                  <Text style={{ fontFamily: font.bodyHeavy }}>{me || 'You'}:</Text> {it.myText}
                </Text>
                <Text style={[styles.p, { color: colors.text }]}>
                  <Text style={{ fontFamily: font.bodyHeavy }}>{partner}:</Text> {it.partnerText}
                </Text>
              </>
            )}
          </Card>
        );
      })}
      <Button
        icon="refresh"
        label="Play again"
        onPress={() => {
          burst();
          onAgain();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  h2: { fontFamily: font.displaySemi, fontSize: 26, textAlign: 'center' },
  h3: { fontFamily: font.displaySemi, fontSize: 20 },
  b: { fontFamily: font.bodyHeavy, fontSize: 15 },
  p: { fontFamily: font.body, fontSize: 15, lineHeight: 21 },
  fine: { fontFamily: font.body, fontSize: 13, opacity: 0.9 },
  fineInline: { fontFamily: font.body, fontSize: 13 },
  lnk: { fontFamily: font.bodyHeavy, fontSize: 14, textDecorationLine: 'underline' },
  big: { fontFamily: font.display, fontSize: 26 },
  hero: { borderRadius: 30, padding: 20, gap: 10, alignItems: 'center' },
  pair: { flexDirection: 'row', alignItems: 'center' },
  pairPerson: { flexDirection: 'row', alignItems: 'center' },
  heartb: { width: 32, height: 32, borderRadius: 16, backgroundColor: brand.rosy, alignItems: 'center', justifyContent: 'center', marginHorizontal: -6, zIndex: 1 },
  intro: { alignItems: 'center', gap: 14 },
  prevCard: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  progress: { borderRadius: 26, padding: 16, gap: 10 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 3, borderRadius: 22, padding: 12 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  memory: { gap: 6 },
  memPhoto: { width: '100%', aspectRatio: 4 / 3, borderRadius: 18 },
  by: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  picks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickBtn: { borderWidth: 4, borderRadius: 16, overflow: 'hidden' },
  pickImg: { width: 88, height: 88 },
  home: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  map: { height: 300, borderRadius: 22, overflow: 'hidden' },
  spot: { borderWidth: 3, borderRadius: 20, padding: 12, gap: 8 },
  spotActs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  mode: { borderRadius: 26, padding: 18, gap: 10 },
  opts: { gap: 8 },
  optGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opt: { borderWidth: 3, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14, flexGrow: 1, minWidth: '45%' },
  optText: { fontFamily: font.bodyHeavy, fontSize: 14, textAlign: 'center' },
  qText: { fontFamily: font.displaySemi, fontSize: 22 },
  scores: { borderRadius: 26, padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-around' },
  score: { alignItems: 'center', minWidth: 90 },
  pairBox: { borderRadius: 16, padding: 10, gap: 4, marginTop: 6 },
});
