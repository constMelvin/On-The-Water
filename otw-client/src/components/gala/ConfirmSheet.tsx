'use client';

import { useState } from 'react';
import { Button, Sheet } from '@/components/otw';

export interface ConfirmSheetProps {
  title: string;
  body: string;
  confirm: string;
  /** Resolves when done; the sheet stays open (button re-enabled) if it throws. */
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

/** Yes / Cancel sheet for destructive actions (reference CF: delete photo, leave, new code, remove, archive, delete). */
export function ConfirmSheet({ title, body, confirm, onConfirm, onClose }: ConfirmSheetProps) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } catch {
      setBusy(false);
    }
  };
  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void go()} disabled={busy}>
            {confirm}
          </Button>
        </>
      }
    >
      <p>{body}</p>
    </Sheet>
  );
}
