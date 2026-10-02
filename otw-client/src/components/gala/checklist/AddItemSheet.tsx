'use client';

import { useState, type FormEvent } from 'react';
import { Button, Sheet } from '@/components/otw';
import type { Member } from '@/lib/otw/data';
import { mockUserId } from '@/lib/otw/mock';

export interface AddItemSheetProps {
  members: Member[];
  onAdd: (label: string, assignedTo: string | null) => void;
  onClose: () => void;
}

/** "Add to Checklist" sheet (reference sheet addItem): what + assign to. */
export function AddItemSheet({ members, onAdd, onClose }: AddItemSheetProps) {
  const [label, setLabel] = useState('');
  const [who, setWho] = useState('');

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    onAdd(label, who || null);
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
          <Button onClick={() => submit()}>Add to Checklist</Button>
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
              <option key={m.n} value={mockUserId(m.n)}>
                {m.n}
              </option>
            ))}
          </select>
        </label>
      </form>
    </Sheet>
  );
}
