'use client';

import { useState } from 'react';
import { Icon } from '@/components/otw';
import type { Tone } from '@/lib/otw/data';
import { isVideo } from '@/lib/otw/drive';
import { shortDay } from '@/lib/otw/time';
import type { PhotoVM } from '@/lib/api/types';
import { DriveImg } from './DriveImg';
import s from './dump.module.css';

const TONES: Tone[] = ['rosy', 'teal', 'zest', 'blossom'];

/** Stable pseudo-random number from an id, for the tile's tone. */
function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface PhotoGridProps {
  photos: PhotoVM[];
  nameOf: (userId: string) => string;
  /** Whether the trash button shows on this photo. */
  canDelete?: (p: PhotoVM) => boolean;
  onOpen: (index: number) => void;
  onDelete?: (p: PhotoVM) => void;
  /** Two columns (Couple Mode's "Our Photos"). */
  two?: boolean;
}

/** Grid of equal square Drive thumbnails (reference .masonry / .phw / .ph). */
export function PhotoGrid({ photos, nameOf, canDelete, onOpen, onDelete, two }: PhotoGridProps) {
  return (
    <div className={`${s.masonry}${two ? ` ${s.m2}` : ''}`}>
      {photos.map((p, i) => (
        <Tile
          key={p.id}
          p={p}
          who={nameOf(p.uploadedBy)}
          onOpen={() => onOpen(i)}
          onDelete={onDelete && canDelete?.(p) ? () => onDelete(p) : undefined}
        />
      ))}
    </div>
  );
}

function Tile({ p, who, onOpen, onDelete }: { p: PhotoVM; who: string; onOpen: () => void; onDelete?: () => void }) {
  const [broken, setBroken] = useState(false);
  const h = hash(p.id);
  const tone = TONES[h % TONES.length];
  const video = isVideo(p.mimeType);
  const label = p.caption || (video ? 'Video' : 'Photo');
  return (
    <div className={s.phw}>
      <button
        type="button"
        className={`${s.ph} c-${tone}`}
        onClick={onOpen}
        aria-label={`Open ${video ? 'video' : 'photo'}: ${label}`}
      >
        <Icon name="image" size={32} className={s.phI} />
        {!broken && <DriveImg fileId={p.driveFileId} alt="" loading="lazy" onFail={() => setBroken(true)} />}
        {video && (
          <span className={s.play} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
          </span>
        )}
        <span className={s.cap}>
          <b>{label}</b>
          <i>
            {who} · {shortDay(p.createdAt)}
          </i>
        </span>
      </button>
      {onDelete && (
        <button type="button" className={`ibtn ${s.del}`} onClick={onDelete} aria-label={`Delete ${video ? 'video' : 'photo'}`}>
          <Icon name="trash" size={18} />
        </button>
      )}
    </div>
  );
}
