'use client';

import { useState, type FormEvent } from 'react';
import { Button, Sheet } from '@/components/otw';
import type { Member } from '@/lib/otw/data';

export interface AddItemSheetProps {
  members: Member[];
  onAdd: (label: string, assignedTo: string | null) => void | Promise<void>;
  onClose: () => void;
}

/** "Add to Checklist" sheet (reference sheet addItem): what + assign to. */
export function AddItemSheet({ members, onAdd, onClose }: AddItemSheetProps) {
  const [label, setLabel] = useState('');
  const [who, setWho] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await onAdd(label, who || null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      title="Add to Checklist"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            Add to Checklist
          </Button>
        </>
      }
    >
      {/* A form so Enter in the name field adds the item. */}
      <form onSubmit={submit} style={{ display: 'contents' }}>
        <label className="fl">
          What are we bringing?
          <input
            className="in"
            placeholder="Power bank, umbrella, extra shirt…"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <label className="fl">
          Assign to
          <select className="in" value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">Nobody yet</option>
            {members.map((m) => (
              <option key={m.id ?? m.n} value={m.id}>
                {m.n}
              </option>
            ))}
          </select>
        </label>
      </form>
    </Sheet>
  );
}
