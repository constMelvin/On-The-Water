'use client';

/**
 * Our Little Bucket List: one list per couple gala (GET/POST/PATCH/DELETE .../couple/bucket).
 * Adding, editing and removing follow the gala's "Edit the plan" toggle; ticking an item done and adding a
 * memory (a caption and a photo from this gala's Gala Dump) is open to both people. Items are never shared
 * between galas: the server filters every call by this gala's id.
 */
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Icon, ProgressBar, Sheet } from '@/components/otw';
import { peso } from '@/lib/otw/data';
import { burst, toast } from '@/lib/otw/feedback';
import { useGala } from '@/lib/otw/gala-store';
import { featureKey } from '@/lib/otw/live';
import { driveThumb } from '@/lib/otw/drive';
import { failed, removeFrom, upsertIn, useCoupleBucket, usePhotos } from '@/lib/otw/gala-queries';
import {
  createBucketItem,
  deleteBucketItem,
  updateBucketItem,
  type BucketInput,
  type BucketPatch,
} from '@/lib/api/gala';
import type { BucketItemVM } from '@/lib/api/types';
import { ErrorState, Skeleton } from '../States';
import { useCanEditPlan } from '../route/Route';
import s from './bucket.module.css';

const dateLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

export function BucketList() {
  const { roomId, nameOf, toneOf } = useGala();
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

  /** Always patches against the newest cached version, so quick taps in a row don't conflict with ourselves. */
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

  const toggle = (item: BucketItemVM, el: HTMLElement | null) => {
    const completed = !item.completed;
    // Shown right away; the server's row replaces it.
    qc.setQueryData<BucketItemVM[]>(key, (rows) =>
      rows?.map((r) => (r.id === item.id ? { ...r, completed, ...(completed ? {} : { photoId: null, memory: null }) } : r))
    );
    void patch(item.id, { completed }).then((row) => {
      if (row?.completed) {
        if (el) {
          const r = el.getBoundingClientRect();
          burst(r.left + r.width / 2, r.top + r.height / 2);
        }
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
    <div className={s.wrap}>
      <section className={`${s.progress} bg-blossom`} aria-label="Bucket list progress">
        <div>
          <b className={s.big}>
            {done.length} of {items.length}
          </b>
          <span className="fine">{items.length === 0 ? 'Nothing yet' : 'done'}</span>
        </div>
        <ProgressBar
          value={items.length ? (done.length / items.length) * 100 : 0}
          label={`${done.length} of ${items.length} bucket list items done`}
          className={s.bar}
        />
        {canEdit && (
          <Button sm variant="rosy" onClick={() => setEditing('new')}>
            <Icon name="plus" size={16} /> Add item
          </Button>
        )}
      </section>

      {items.length === 0 ? (
        <div className="empty">
          <div className="ico xl" style={{ background: 'var(--zest)', color: 'var(--rosy)' }}>
            <Icon name="flag" size={44} />
          </div>
          <h3>Nothing here yet.</h3>
          <p>{canEdit ? 'Add things you want to do together.' : 'Nothing has been added yet.'}</p>
          {canEdit && (
            <Button variant="rosy" onClick={() => setEditing('new')}>
              <Icon name="plus" size={20} /> Add item
            </Button>
          )}
        </div>
      ) : (
        <ul className={s.list} aria-label="To do">
          {todo.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              canEdit={canEdit}
              onToggle={toggle}
              onEdit={() => setEditing(item)}
              onDelete={() => setConfirmDelete(item)}
            />
          ))}
          {todo.length === 0 && <li className={s.allDone}>Everything is done!</li>}
        </ul>
      )}

      <section aria-labelledby="bucket-memories">
        <h3 id="bucket-memories" className={s.h}>
          Memories
        </h3>
        {done.length === 0 ? (
          <p className="fine">Finished items show up here.</p>
        ) : (
          <ul className={s.memories}>
            {done.map((item) => (
              <li key={item.id} className={s.memory}>
                {item.photoId && <MemoryPhoto photoId={item.photoId} title={item.title} />}
                <div className={s.memBody}>
                  <b>{item.title}</b>
                  {item.memory && <p>{item.memory}</p>}
                  <span className={s.by}>
                    {item.completedBy && <Avatar name={nameOf(item.completedBy)} tone={toneOf(item.completedBy)} size={20} userId={item.completedBy} />}
                    {item.completedAt ? dateLabel(item.completedAt.slice(0, 10)) : ''}
                  </span>
                  <button type="button" className="lnk" onClick={() => setMemoryFor(item.id)}>
                    {item.memory || item.photoId ? 'Edit memory' : 'Add memory'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <ItemSheet
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            if (!roomId) return;
            if (editing === 'new') {
              const row = await createBucketItem(roomId, input);
              upsertIn(qc, key, row);
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
      )}

      {memoryFor && (
        <MemorySheet
          item={items.find((i) => i.id === memoryFor) ?? null}
          onClose={() => setMemoryFor(null)}
          onSave={async (body) => {
            const row = await patch(memoryFor, body);
            if (row) toast('Memory saved.');
            setMemoryFor(null);
          }}
        />
      )}

      {confirmDelete && (
        <Sheet
          title="Remove item?"
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmDelete(null)} data-autofocus>
                Keep it
              </Button>
              <Button variant="rosy" onClick={() => remove(confirmDelete)}>
                <Icon name="trash" size={18} /> Remove
              </Button>
            </>
          }
        >
          <p>“{confirmDelete.title}” will be removed for both of you.</p>
        </Sheet>
      )}
    </div>
  );
}

/* ---------------- one row ---------------- */

function ItemRow({
  item,
  canEdit,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: BucketItemVM;
  canEdit: boolean;
  onToggle: (item: BucketItemVM, el: HTMLElement | null) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className={s.row}>
      <button
        type="button"
        className="cbox"
        role="checkbox"
        aria-checked={item.completed}
        aria-label={`Mark "${item.title}" as done`}
        onClick={(e) => onToggle(item, e.currentTarget)}
      >
        <Icon name="check" size={18} />
      </button>
      <div className={s.rowBody}>
        <b>{item.title}</b>
        {item.description && <span>{item.description}</span>}
        {(item.estBudget !== null || item.targetDate) && (
          <span className={s.chips}>
            {item.estBudget !== null && (
              <i>
                <Icon name="wallet" size={14} /> {peso(item.estBudget)}
              </i>
            )}
            {item.targetDate && (
              <i>
                <Icon name="calendar" size={14} /> {dateLabel(item.targetDate)}
              </i>
            )}
          </span>
        )}
      </div>
      {canEdit && (
        <span className={s.rowActions}>
          <button type="button" className="ibtn" aria-label={`Edit ${item.title}`} onClick={onEdit}>
            <Icon name="edit" size={20} />
          </button>
          <button type="button" className="ibtn" aria-label={`Remove ${item.title}`} onClick={onDelete}>
            <Icon name="trash" size={20} />
          </button>
        </span>
      )}
    </li>
  );
}

/* ---------------- a memory's photo (from this gala's Gala Dump) ---------------- */

function MemoryPhoto({ photoId, title }: { photoId: string; title: string }) {
  const photos = usePhotos();
  const photo = photos.data?.find((p) => p.id === photoId);
  if (!photo) return <span className={`${s.photo} ${s.photoOff}`} aria-hidden="true"><Icon name="image" size={28} /></span>;
  return (
    // Plain <img>: a Drive thumbnail URL (next/image would need Drive as a remote host).
    <img className={s.photo} src={driveThumb(photo.driveFileId, 480)} alt={`Memory of ${title}`} loading="lazy" />
  );
}

/* ---------------- add / edit sheet ---------------- */

function ItemSheet({
  item,
  onClose,
  onSave,
}: {
  item: BucketItemVM | null;
  onClose: () => void;
  onSave: (input: BucketInput) => Promise<void>;
}) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [budget, setBudget] = useState(item?.estBudget != null ? String(item.estBudget) : '');
  const [date, setDate] = useState(item?.targetDate ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!title.trim()) return setError('Add a title.');
    const amount = budget.trim() === '' ? undefined : Number(budget);
    if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) return setError('Enter a valid budget.');
    setError('');
    setBusy(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        estBudget: amount,
        targetDate: date || undefined,
      });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't save that. Try again.");
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={item ? 'Edit item' : 'Add item'}
      onClose={onClose}
      footer={
        <Button type="submit" form="bucket-form" variant="rosy" disabled={busy}>
          {item ? 'Save' : 'Add'}
        </Button>
      }
    >
      <form id="bucket-form" className={s.form} onSubmit={submit} noValidate>
        <label className="fl">
          Title
          <input className="in" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Watch the sunrise" />
        </label>
        <label className="fl">
          Notes (optional)
          <textarea className="in" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} />
        </label>
        <div className={s.two}>
          <label className="fl">
            Budget (₱)
            <input className="in" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0.00" />
          </label>
          <label className="fl">
            Target date
            <input className="in" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        {error && (
          <p className="ferr" role="alert">
            <Icon name="alert" size={18} />
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
}

/* ---------------- memory sheet: a caption and one photo from the Gala Dump ---------------- */

function MemorySheet({
  item,
  onClose,
  onSave,
}: {
  item: BucketItemVM | null;
  onClose: () => void;
  onSave: (body: Omit<BucketPatch, 'version'>) => Promise<void>;
}) {
  const photos = usePhotos();
  const [memory, setMemory] = useState(item?.memory ?? '');
  const [photoId, setPhotoId] = useState<string | null>(item?.photoId ?? null);
  const [busy, setBusy] = useState(false);

  if (!item) return null;
  const choices = (photos.data ?? []).filter((p) => p.status === 'READY' && (p.mimeType ?? 'image/').startsWith('image/'));

  const save = async () => {
    if (busy) return;
    setBusy(true);
    await onSave({
      memory: memory.trim(),
      ...(photoId ? { photoId } : item.photoId ? { clearPhoto: true } : {}),
    });
  };

  return (
    <Sheet
      title="Add a memory"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Skip
          </Button>
          <Button variant="rosy" onClick={save} disabled={busy}>
            Save
          </Button>
        </>
      }
    >
      <p className="fine">{item.title}</p>
      <label className="fl">
        Caption (optional)
        <textarea className="in" rows={3} maxLength={500} value={memory} onChange={(e) => setMemory(e.target.value)} placeholder="What will you remember?" />
      </label>
      <fieldset className={s.pick}>
        <legend className="fl">Photo from Gala Dump</legend>
        {photos.isPending ? (
          <p className="fine">Loading photos…</p>
        ) : choices.length === 0 ? (
          <p className="fine">No photos yet. Add some in Gala Dump first.</p>
        ) : (
          <div className={s.picks} role="radiogroup" aria-label="Memory photo">
            {choices.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={photoId === p.id}
                aria-label={p.caption || 'Photo'}
                className={`${s.pickBtn}${photoId === p.id ? ` ${s.pickOn}` : ''}`}
                onClick={() => setPhotoId(photoId === p.id ? null : p.id)}
              >
                <img src={driveThumb(p.driveFileId, 240)} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </fieldset>
    </Sheet>
  );
}
