'use client';

import { useRef, useState, type DragEvent } from 'react';
import { Button, Icon, Sheet } from '@/components/otw';
import { uploadToDrive, type StartUpload } from '@/lib/otw/drive';
import type { PhotoVM } from '@/lib/api/types';
import s from './dump.module.css';

type Status = 'waiting' | 'compressing' | 'uploading' | 'saving' | 'done' | 'failed';

interface Row {
  key: string;
  file: File;
  status: Status;
  error?: string;
}

const LABEL: Record<Status, string> = {
  waiting: 'Waiting…',
  compressing: 'Getting ready…',
  uploading: 'Uploading…',
  saving: 'Saving…',
  done: 'Done',
  failed: "Didn't upload",
};
const PCT: Record<Status, number> = { waiting: 0, compressing: 20, uploading: 55, saving: 85, done: 100, failed: 100 };

export interface UploadSheetProps {
  /** One-time Drive upload link in this gala's folder (POST /rooms/{id}/photos/uploads). */
  startUpload: StartUpload;
  /** Registers the uploaded Drive file with the backend (POST /rooms/{id}/photos). */
  register: (driveFileId: string, caption: string | null) => Promise<PhotoVM>;
  /** Called after every photo or video that made it, so the grid can show it right away. */
  onUploaded: (p: PhotoVM) => void;
  onClose: () => void;
}

/** "Add Photos" sheet (reference sheet upload): drop or choose photos and videos, one progress row each, retry on failure. */
export function UploadSheet({ startUpload, register, onUploaded, onClose }: UploadSheetProps) {
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [caption, setCaption] = useState('');
  const [over, setOver] = useState(false);
  const busy = rows.some((r) => r.status !== 'done' && r.status !== 'failed' && r.status !== 'waiting');
  const finished = rows.length > 0 && rows.every((r) => r.status === 'done' || r.status === 'failed');

  const set = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const run = async (list: Row[]) => {
    // One at a time: kinder to mobile data and the server's rate limit.
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

  const add = (files: FileList | null) => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (!list.length) return;
    const next = list.map((file, i) => ({ key: `${Date.now()}-${i}-${file.name}`, file, status: 'waiting' as Status }));
    setRows((rs) => [...rs, ...next]);
    void run(next);
  };

  const retry = (r: Row) => {
    set(r.key, { status: 'waiting', error: undefined });
    void run([{ ...r, status: 'waiting' }]);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    add(e.dataTransfer.files);
  };

  const firstError = rows.find((r) => r.status === 'failed')?.error;

  return (
    <Sheet
      title="Add Photos"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onClose} disabled={!finished}>
            Done
          </Button>
        </>
      }
    >
      <div
        className={`${s.drop}${over ? ` ${s.dropOn}` : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <Icon name="upload" size={36} />
        <b>Drop photos or videos here</b>
        <span>or pick them from your device</span>
        <Button sm variant="teal" onClick={() => input.current?.click()} disabled={busy}>
          Choose files
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => {
            add(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      <label className="fl">
        Caption (optional)
        <input
          className="in"
          maxLength={140}
          placeholder="Sunset sa Burnham"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
      </label>
      {rows.length > 0 && (
        <ul className={s.uplist} aria-live="polite">
          {rows.map((r) => (
            <li
              key={r.key}
              className={`${s.uprow}${r.status === 'done' ? ` ${s.ok}` : ''}${r.status === 'failed' ? ` ${s.fail}` : ''}`}
              title={r.error}
            >
              <span className={s.un}>{r.file.name}</span>
              <span className={s.ubar}>
                <i style={{ width: `${PCT[r.status]}%` }} />
              </span>
              <span className={s.us}>{LABEL[r.status]}</span>
              {r.status === 'failed' && (
                <Button sm variant="ghost" onClick={() => retry(r)} aria-label={`Retry ${r.file.name}`}>
                  <Icon name="refresh" size={16} />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {firstError && <p className="fine">{firstError}</p>}
      <p className="fine">
        Everything goes to this gala&apos;s own Google Drive folder. Videos up to 300 MB. Anyone with a file&apos;s link
        can view it.
      </p>
    </Sheet>
  );
}
