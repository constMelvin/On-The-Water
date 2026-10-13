import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Empty, StateGate } from '@/components/States';
import { Button, Fab, Field, IconButton, PageHead, SegmentedControl } from '@/components/ui';
import { deletePhoto, registerPhoto, startPhotoUpload } from '@/lib/api/gala';
import type { PhotoVM } from '@/lib/api/types';
import type { Tone } from '@/lib/otw/data';
import { driveDownload, drivePlayer, driveThumb, isVideo, uploadToDrive, type LocalFile, type StartUpload } from '@/lib/otw/drive';
import { burst, toast } from '@/lib/otw/feedback';
import { failed, removeFrom, upsertIn, usePhotos, useTabState } from '@/lib/otw/gala-queries';
import { useGala } from '@/lib/otw/gala-store';
import { featureKey } from '@/lib/otw/live';
import { shortDay } from '@/lib/otw/time';
import { TONE_COLORS } from '@/components/Avatar';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { GalaPage } from './GalaShell';

/**
 * The Gala Dump (port of otw-client/src/components/gala/dump/*). GET .../photos; files go from the phone into this
 * gala's own Google Drive folder (lib/otw/drive.ts) and are registered with POST .../photos.
 */
type Filter = 'all' | 'mine';

export function usePhotoRights() {
  const { role, room, myUserId } = useGala();
  const leader = role === 'leader';
  return {
    canAdd: leader || !!room?.permissions.membersCanAddPhotos,
    canDelete: (p: PhotoVM) => leader || (p.uploadedBy === myUserId && !!room?.permissions.membersCanDeleteOwnPhotos),
  };
}

/** Upload / delete wiring shared by the Dump and Couple Mode's "Our Photos". */
export function usePhotoActions() {
  const { roomId } = useGala();
  const qc = useQueryClient();
  const key = featureKey(roomId, 'photos');
  const summaryKey = featureKey(roomId, 'summary');
  return {
    startUpload: (async (file) => (await startPhotoUpload(roomId!, file)).uploadUrl) as StartUpload,
    register: (driveFileId: string, caption: string | null) => registerPhoto(roomId!, driveFileId, caption),
    onUploaded: (p: PhotoVM) => {
      upsertIn(qc, key, p);
      void qc.invalidateQueries({ queryKey: summaryKey });
    },
    remove: async (p: PhotoVM) => {
      if (!roomId) return;
      try {
        await deletePhoto(roomId, p.id);
        removeFrom(qc, key, p.id);
        void qc.invalidateQueries({ queryKey: summaryKey });
        toast('Photo deleted.');
      } catch (e) {
        failed(qc, [key], e, "Couldn't delete that photo.");
        throw e;
      }
    },
  };
}

export function Dump() {
  const { nameOf, myUserId, setViewState } = useGala();
  const { colors } = useTheme();
  const q = usePhotos();
  const state = useTabState(q);
  const { canAdd, canDelete } = usePhotoRights();
  const actions = usePhotoActions();
  const [filter, setFilter] = useState<Filter>('all');
  const [uploading, setUploading] = useState<false | 'pick' | 'camera'>(false);
  const [uploadedAny, setUploadedAny] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<PhotoVM | null>(null);

  const all = [...(q.data ?? [])].filter((p) => p.status !== 'FAILED').sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const photos = filter === 'mine' ? all.filter((p) => p.uploadedBy === myUserId) : all;

  const openUpload = (camera = false) => {
    if (!canAdd) return toast('The Gala Leader turned off adding photos.', 'err');
    setUploadedAny(false);
    setUploading(camera ? 'camera' : 'pick');
  };

  return (
    <GalaPage overlay={canAdd ? <Fab label="Add Photos" icon="upload" onPress={() => openUpload()} /> : null}>
      <PageHead title="The Gala Dump" sub="All the good shots, bad shots, random candids, and “send mo nga” moments in one place." />
      {canAdd ? (
        <View style={styles.headActs}>
          <Button sm fw={false} icon="upload" label="Add Photos" onPress={() => openUpload()} />
          <Button sm fw={false} variant="teal" icon="camera" label="Take Photo" onPress={() => openUpload(true)} />
        </View>
      ) : null}
      <StateGate
        state={state}
        kind="dump"
        skeleton="dump"
        onAction={() => {
          setViewState('default');
          openUpload();
        }}
        onRetry={async () => {
          setViewState('default');
          return (await q.refetch()).isSuccess;
        }}>
        {all.length === 0 ? (
          <Empty kind="dump" onAction={() => openUpload()} />
        ) : (
          <>
            <View style={styles.toolbar}>
              <SegmentedControl<Filter>
                label="Show"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: 'Everyone' },
                  { value: 'mine', label: 'Mine' },
                ]}
              />
              <Text style={[styles.fine, { color: colors.text }]}>
                {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
              </Text>
            </View>
            {photos.length ? (
              <PhotoGrid photos={photos} nameOf={nameOf} canDelete={canDelete} onOpen={setOpen} onDelete={setDeleting} />
            ) : (
              <Text style={[styles.fine, { color: colors.text }]}>You haven&apos;t added any photos yet.</Text>
            )}
          </>
        )}
      </StateGate>
      {uploading ? (
        <UploadSheet
          startWithCamera={uploading === 'camera'}
          startUpload={actions.startUpload}
          register={actions.register}
          onUploaded={(p) => {
            actions.onUploaded(p);
            setUploadedAny(true);
          }}
          onClose={() => {
            setUploading(false);
            if (uploadedAny) {
              toast('Photos uploaded.');
              burst();
            }
          }}
        />
      ) : null}
      {open !== null && photos.length > 0 ? (
        <Lightbox
          photos={photos}
          index={open}
          nameOf={nameOf}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
          canDelete={canDelete}
          onDelete={(p) => {
            setOpen(null);
            setDeleting(p);
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmSheet
          title="Delete this photo?"
          body="It will be removed from the Gala Dump for everyone."
          confirm="Delete photo"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await actions.remove(deleting);
            setDeleting(null);
          }}
        />
      ) : null}
    </GalaPage>
  );
}

const TONES: Tone[] = ['rosy', 'teal', 'zest', 'blossom'];
function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Grid of square Drive thumbnails (two columns on phones). */
export function PhotoGrid({
  photos,
  nameOf,
  canDelete,
  onOpen,
  onDelete,
}: {
  photos: PhotoVM[];
  nameOf: (id: string) => string;
  canDelete?: (p: PhotoVM) => boolean;
  onOpen: (i: number) => void;
  onDelete?: (p: PhotoVM) => void;
}) {
  return (
    <View style={styles.grid}>
      {photos.map((p, i) => (
        <Tile key={p.id} p={p} who={nameOf(p.uploadedBy)} onOpen={() => onOpen(i)} onDelete={onDelete && canDelete?.(p) ? () => onDelete(p) : undefined} />
      ))}
    </View>
  );
}

function Tile({ p, who, onOpen, onDelete }: { p: PhotoVM; who: string; onOpen: () => void; onDelete?: () => void }) {
  const [broken, setBroken] = useState(false);
  const t = TONE_COLORS[TONES[hash(p.id) % TONES.length]];
  const video = isVideo(p.mimeType);
  const label = p.caption || (video ? 'Video' : 'Photo');
  return (
    <View style={styles.phw}>
      <Pressable accessibilityRole="imagebutton" accessibilityLabel={`Open ${video ? 'video' : 'photo'}: ${label}`} onPress={onOpen} style={[styles.ph, { backgroundColor: t.bg }]}>
        <Icon name="image" size={32} color={t.fg} />
        {!broken ? <Image source={{ uri: driveThumb(p.driveFileId, 600) }} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setBroken(true)} /> : null}
        {video ? (
          <View style={styles.play}>
            <Icon name="chevr" size={22} color={brand.cream} />
          </View>
        ) : null}
        <View style={styles.cap}>
          <Text style={styles.capB} numberOfLines={1}>
            {label}
          </Text>
          <Text style={styles.capI} numberOfLines={1}>
            {who} · {shortDay(p.createdAt)}
          </Text>
        </View>
      </Pressable>
      {onDelete ? (
        <View style={styles.del}>
          <IconButton icon="trash" size={18} color={brand.tealDark} label={`Delete ${video ? 'video' : 'photo'}`} onPress={onDelete} />
        </View>
      ) : null}
    </View>
  );
}

/** Full-screen viewer: arrows to browse; download and delete up top; videos open in Drive's player. */
export function Lightbox({
  photos,
  index,
  nameOf,
  onIndex,
  onClose,
  canDelete,
  onDelete,
}: {
  photos: PhotoVM[];
  index: number;
  nameOf: (id: string) => string;
  onIndex: (i: number) => void;
  onClose: () => void;
  canDelete?: (p: PhotoVM) => boolean;
  onDelete?: (p: PhotoVM) => void;
}) {
  const n = photos.length;
  const i = ((index % n) + n) % n;
  const p = photos[i];
  if (!p) return null;
  const video = isVideo(p.mimeType);
  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={styles.lb}>
        <View style={styles.lbBar}>
          <IconButton icon="download" color={brand.cream} label={`Download this ${video ? 'video' : 'photo'}`} onPress={() => void WebBrowser.openBrowserAsync(driveDownload(p.driveFileId))} />
          {onDelete && canDelete?.(p) ? <IconButton icon="trash" color={brand.cream} label={`Delete this ${video ? 'video' : 'photo'}`} onPress={() => onDelete(p)} /> : null}
          <IconButton icon="x" size={26} color={brand.cream} label="Close" onPress={onClose} />
        </View>
        <View style={styles.stage}>
          {video ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Play video" onPress={() => void WebBrowser.openBrowserAsync(drivePlayer(p.driveFileId))} style={styles.videoBox}>
              <Image source={{ uri: driveThumb(p.driveFileId, 1200) }} style={StyleSheet.absoluteFill} contentFit="contain" />
              <View style={[styles.play, styles.playBig]}>
                <Icon name="chevr" size={40} color={brand.cream} />
              </View>
            </Pressable>
          ) : (
            <Image source={{ uri: driveThumb(p.driveFileId, 2000) }} style={styles.lbImg} contentFit="contain" accessibilityLabel={p.caption || 'Gala photo'} />
          )}
        </View>
        <View style={styles.lbNav}>
          <IconButton icon="chevl" size={30} color={brand.cream} label="Previous photo" onPress={() => onIndex(i - 1)} />
          <View style={styles.lbCap}>
            {p.caption ? <Text style={styles.lbCapB}>{p.caption}</Text> : null}
            <Text style={styles.lbCapS}>
              {nameOf(p.uploadedBy)} · {shortDay(p.createdAt)} · {i + 1} / {n}
            </Text>
          </View>
          <IconButton icon="chevr" size={30} color={brand.cream} label="Next photo" onPress={() => onIndex(i + 1)} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

type Status = 'waiting' | 'compressing' | 'uploading' | 'saving' | 'done' | 'failed';
interface Row {
  key: string;
  file: LocalFile;
  status: Status;
  error?: string;
}
const LABEL: Record<Status, string> = { waiting: 'Waiting…', compressing: 'Getting ready…', uploading: 'Uploading…', saving: 'Saving…', done: 'Done', failed: "Didn't upload" };
const PCT: Record<Status, number> = { waiting: 0, compressing: 20, uploading: 55, saving: 85, done: 100, failed: 100 };

/** "Add Photos" sheet: pick photos and videos or take one; one progress row each, retry on failure. */
export function UploadSheet({
  startUpload,
  register,
  onUploaded,
  onClose,
  startWithCamera,
}: {
  startUpload: StartUpload;
  register: (driveFileId: string, caption: string | null) => Promise<PhotoVM>;
  onUploaded: (p: PhotoVM) => void;
  onClose: () => void;
  startWithCamera?: boolean;
}) {
  const { colors } = useTheme();
  const [rows, setRows] = useState<Row[]>([]);
  const [caption, setCaption] = useState('');
  const [started, setStarted] = useState(false);
  const busy = rows.some((r) => r.status !== 'done' && r.status !== 'failed' && r.status !== 'waiting');
  const finished = rows.length > 0 && rows.every((r) => r.status === 'done' || r.status === 'failed');
  const set = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const run = async (list: Row[]) => {
    for (const r of list) {
      try {
        const id = await uploadToDrive(r.file, startUpload, (stage) => set(r.key, { status: stage }));
        set(r.key, { status: 'saving' });
        const photo = await register(id, caption.trim() || null);
        onUploaded(photo);
        set(r.key, { status: 'done' });
      } catch (e) {
        set(r.key, { status: 'failed', error: e instanceof Error ? e.message : "Didn't upload" });
      }
    }
  };

  const add = (files: LocalFile[]) => {
    if (!files.length) return;
    const next = files.map((file, i) => ({ key: `${Date.now()}-${i}`, file, status: 'waiting' as Status }));
    setRows((rs) => [...rs, ...next]);
    void run(next);
  };

  const pick = async (camera: boolean) => {
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return toast('Allow the camera for OTW in your phone settings.', 'err');
    }
    const res = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, quality: 1 });
    if (res.canceled) return;
    add(res.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType ?? (a.type === 'video' ? 'video/mp4' : 'image/jpeg'), fileName: a.fileName })));
  };

  if (startWithCamera && !started) {
    setStarted(true);
    void pick(true);
  }

  const firstError = rows.find((r) => r.status === 'failed')?.error;
  return (
    <Sheet
      title="Add Photos"
      onClose={onClose}
      footer={
        <>
          <Button label="Done" onPress={onClose} disabled={!finished} />
          <Button variant="ghost" label="Cancel" onPress={onClose} />
        </>
      }>
      <View style={[styles.drop, { borderColor: colors.line }]}>
        <Icon name="upload" size={36} color={brand.rosy} />
        <Text style={[styles.dropB, { color: colors.text }]}>Add photos or videos</Text>
        <Text style={[styles.fine, { color: colors.text }]}>Pick them from your phone or take one now</Text>
        <View style={styles.dropBtns}>
          <Button sm fw={false} variant="teal" label="Choose files" disabled={busy} onPress={() => void pick(false)} />
          <Button sm fw={false} icon="camera" label="Take a photo" disabled={busy} onPress={() => void pick(true)} />
        </View>
      </View>
      <Field label="Caption (optional)" maxLength={140} placeholder="Sunset sa Burnham" value={caption} onChangeText={setCaption} />
      {rows.map((r) => (
        <View key={r.key} style={[styles.uprow, { backgroundColor: colors.surface2 }]}>
          <Text style={[styles.un, { color: colors.text }]} numberOfLines={1}>
            {r.file.fileName || (isVideo(r.file.mimeType) ? 'Video' : 'Photo')}
          </Text>
          <View style={[styles.ubar, { backgroundColor: colors.surface }]}>
            <View style={{ width: `${PCT[r.status]}%`, height: '100%', backgroundColor: r.status === 'failed' ? brand.rosy : brand.teal, borderRadius: 4 }} />
          </View>
          <Text style={[styles.us, { color: colors.text }]}>{LABEL[r.status]}</Text>
          {r.status === 'failed' ? (
            <IconButton
              icon="refresh"
              size={16}
              label="Retry"
              onPress={() => {
                set(r.key, { status: 'waiting', error: undefined });
                void run([{ ...r, status: 'waiting' }]);
              }}
            />
          ) : null}
        </View>
      ))}
      {firstError ? <Text style={[styles.fine, { color: colors.rosyInk }]}>{firstError}</Text> : null}
      <Text style={[styles.fine, { color: colors.text }]}>
        Everything goes to this gala&apos;s own Google Drive folder. Videos up to 300 MB. Anyone with a file&apos;s link can view it.
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  fine: { fontFamily: font.body, fontSize: 14, opacity: 0.9 },
  headActs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  phw: { width: '50%', padding: 5 },
  ph: { aspectRatio: 1, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  play: { position: 'absolute', width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(31,99,118,0.85)', alignItems: 'center', justifyContent: 'center' },
  playBig: { width: 72, height: 72, borderRadius: 36 },
  cap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(31,99,118,0.78)' },
  capB: { fontFamily: font.bodyHeavy, fontSize: 13, color: brand.cream },
  capI: { fontFamily: font.bodyBold, fontSize: 11, color: brand.cream },
  del: { position: 'absolute', top: 10, right: 10, backgroundColor: brand.cream, borderRadius: 20 },
  lb: { flex: 1, backgroundColor: '#000' },
  lbBar: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, padding: 8 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lbImg: { width: '100%', height: '100%' },
  videoBox: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  lbNav: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  lbCap: { flex: 1, alignItems: 'center' },
  lbCapB: { fontFamily: font.bodyHeavy, fontSize: 15, color: brand.cream, textAlign: 'center' },
  lbCapS: { fontFamily: font.bodyBold, fontSize: 13, color: brand.cream, opacity: 0.85 },
  drop: { borderWidth: 3, borderStyle: 'dashed', borderRadius: 24, padding: 18, alignItems: 'center', gap: 6 },
  dropB: { fontFamily: font.displaySemi, fontSize: 18 },
  dropBtns: { flexDirection: 'row', gap: 8, marginTop: 6 },
  uprow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 8 },
  un: { width: 90, fontFamily: font.bodyBold, fontSize: 13 },
  ubar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  us: { fontFamily: font.bodyBold, fontSize: 12, width: 92, textAlign: 'right' },
});
