'use client';

/**
 * The Gala Dump (photos and videos). Reference: src/proto2.js views.dump + lbHtml, proto3 upload /
 * delPhoto, dump-*.png. Data is GET /rooms/{roomId}/photos: only this gala's files. They are
 * uploaded by the browser into this gala's own Google Drive folder (lib/otw/drive.ts) and
 * registered with POST .../photos. Realtime photo.* keeps everyone's grid current.
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Icon, SegmentedControl } from '@/components/otw';
import { burst, toast } from '@/lib/otw/feedback';
import { useGala } from '@/lib/otw/gala-store';
import { featureKey } from '@/lib/otw/live';
import { failed, removeFrom, upsertIn, usePhotos, useTabState } from '@/lib/otw/gala-queries';
import { deletePhoto, registerPhoto, startPhotoUpload } from '@/lib/api/gala';
import type { PhotoVM } from '@/lib/api/types';
import { ConfirmSheet } from '../ConfirmSheet';
import { Empty, StateGate } from '../States';
import { PhotoGrid } from './PhotoGrid';
import { Lightbox } from './Lightbox';
import { UploadSheet } from './UploadSheet';
import s from './dump.module.css';

type Filter = 'all' | 'mine';

const burstMid = () => burst(window.innerWidth / 2, window.innerHeight / 2);

/** Photo permissions from the room (host always; members per the Gala Leader's switches). */
export function usePhotoRights() {
  const { role, room, myUserId } = useGala();
  const leader = role === 'leader';
  return {
    canAdd: leader || !!room?.permissions.membersCanAddPhotos,
    canDelete: (p: PhotoVM) =>
      leader || (p.uploadedBy === myUserId && !!room?.permissions.membersCanDeleteOwnPhotos),
  };
}

/** Upload / delete / view wiring shared by the Dump and Couple Mode's "Our Photos". */
export function usePhotoActions() {
  const { roomId } = useGala();
  const qc = useQueryClient();
  const key = featureKey(roomId, 'photos');
  const summaryKey = featureKey(roomId, 'summary');
  return {
    startUpload: async (file: { fileName: string; mimeType: string; size: number }) =>
      (await startPhotoUpload(roomId!, file)).uploadUrl,
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
  const q = usePhotos();
  const state = useTabState(q);
  const { canAdd, canDelete } = usePhotoRights();
  const actions = usePhotoActions();

  const [filter, setFilter] = useState<Filter>('all');
  const [uploading, setUploading] = useState(false);
  const [uploadedAny, setUploadedAny] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<PhotoVM | null>(null);

  // Newest first; only verified photos (the server marks them READY after the Drive check).
  const all = [...(q.data ?? [])]
    .filter((p) => p.status !== 'FAILED')
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const photos = filter === 'mine' ? all.filter((p) => p.uploadedBy === myUserId) : all;

  const openUpload = () => {
    if (!canAdd) {
      toast('The Gala Leader turned off adding photos.', 'err');
      return;
    }
    setUploadedAny(false);
    setUploading(true);
  };

  return (
    <>
      <div className={`phead ${s.head}`}>
        <div>
          <h2 className="h2">The Gala Dump</h2>
          <p className="sub">
            All the good shots, bad shots, random candids, and “send mo nga” moments in one place.
          </p>
        </div>
        <div className={`${s.headActs} hide-m`}>
          {canAdd && (
            <Button onClick={openUpload}>
              <Icon name="upload" size={20} /> Add Photos
            </Button>
          )}
          {all.length > 0 && (
            <Button variant="ghost" onClick={() => setOpen(0)}>
              View Photos
            </Button>
          )}
        </div>
      </div>

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
        }}
      >
        {all.length === 0 ? (
          <Empty kind="dump" onAction={openUpload} />
        ) : (
          <>
            <div className={s.toolbar}>
              <SegmentedControl<Filter>
                label="Show"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: 'Everyone' },
                  { value: 'mine', label: 'Mine' },
                ]}
              />
              <span className="fine">
                {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
              </span>
            </div>
            {photos.length ? (
              <PhotoGrid
                photos={photos}
                nameOf={nameOf}
                canDelete={canDelete}
                onOpen={setOpen}
                onDelete={setDeleting}
              />
            ) : (
              <p className="fine">You haven&apos;t added any photos yet.</p>
            )}
          </>
        )}
      </StateGate>

      {canAdd && (
        <button type="button" className={s.fab} onClick={openUpload} aria-label="Add Photos">
          <Icon name="upload" size={28} />
        </button>
      )}

      {uploading && (
        <UploadSheet
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
              burstMid();
            }
          }}
        />
      )}

      {open !== null && photos.length > 0 && (
        <Lightbox photos={photos} index={open} nameOf={nameOf} onIndex={setOpen} onClose={() => setOpen(null)} />
      )}

      {deleting && (
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
      )}
    </>
  );
}
