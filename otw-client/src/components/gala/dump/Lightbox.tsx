'use client';

import { useEffect, useRef } from 'react';
import { Icon } from '@/components/otw';
import { driveDownload, drivePlayer, isVideo } from '@/lib/otw/drive';
import { shortDay } from '@/lib/otw/time';
import type { PhotoVM } from '@/lib/api/types';
import { DriveImg } from './DriveImg';
import s from './dump.module.css';

export interface LightboxProps {
  photos: PhotoVM[];
  index: number;
  nameOf: (userId: string) => string;
  onIndex: (i: number) => void;
  onClose: () => void;
  /** Whether this viewer may delete the photo (Gala Leader, or the uploader when allowed). */
  canDelete?: (p: PhotoVM) => boolean;
  /** Asks to delete (the caller confirms first). */
  onDelete?: (p: PhotoVM) => void;
}

/** Full-screen photo viewer (reference lbHtml): arrows / swipe to browse, Escape closes; download and delete up top. */
export function Lightbox({ photos, index, nameOf, onIndex, onClose, canDelete, onDelete }: LightboxProps) {
  const n = photos.length;
  const i = ((index % n) + n) % n;
  const p = photos[i];
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => opener?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onIndex(i - 1);
      else if (e.key === 'ArrowRight') onIndex(i + 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [i, onIndex, onClose]);

  if (!p) return null;
  return (
    <div
      className={s.lb}
      role="dialog"
      aria-modal="true"
      aria-label="Photo and video viewer"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        if (start === null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > 50) onIndex(dx < 0 ? i + 1 : i - 1);
      }}
    >
      <div className={s.lbBar}>
        <a
          className={`ibtn ${s.lbA}`}
          href={driveDownload(p.driveFileId)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Download this ${isVideo(p.mimeType) ? 'video' : 'photo'}`}
          title="Download"
        >
          <Icon name="download" size={24} />
        </a>
        {onDelete && canDelete?.(p) && (
          <button
            type="button"
            className={`ibtn ${s.lbA}`}
            onClick={() => onDelete(p)}
            aria-label={`Delete this ${isVideo(p.mimeType) ? 'video' : 'photo'}`}
            title="Delete"
          >
            <Icon name="trash" size={24} />
          </button>
        )}
        <button ref={closeRef} type="button" className={`ibtn ${s.lbA}`} onClick={onClose} aria-label="Close" title="Close">
          <Icon name="x" size={26} />
        </button>
      </div>
      <div className={s.stage}>
        <button type="button" className={`ibtn ${s.lbN}`} onClick={() => onIndex(i - 1)} aria-label="Previous photo">
          <Icon name="chevl" size={30} />
        </button>
        <div className={s.lbImg}>
          {isVideo(p.mimeType) ? (
            // Drive's own player (the file is viewable by link).
            <iframe
              key={p.id}
              src={drivePlayer(p.driveFileId)}
              title={p.caption || 'Gala video'}
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          ) : (
            <DriveImg key={p.id} fileId={p.driveFileId} w={2000} alt={p.caption || 'Gala photo'} />
          )}
        </div>
        <button type="button" className={`ibtn ${s.lbN}`} onClick={() => onIndex(i + 1)} aria-label="Next photo">
          <Icon name="chevr" size={30} />
        </button>
      </div>
      <div className={s.lbCap}>
        {p.caption && <b>{p.caption}</b>}
        <span>
          {nameOf(p.uploadedBy)} · {shortDay(p.createdAt)}
        </span>
        <span className={s.lbC}>
          {i + 1} / {n}
        </span>
      </div>
    </div>
  );
}
