import { useState } from 'react';
import { Sheet } from './Sheet';
import { Body, Button } from './ui';

/** Yes / Cancel sheet for destructive actions (delete photo, leave, new code, remove, archive, delete). */
export function ConfirmSheet({
  title,
  body,
  confirm,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirm: string;
  /** Resolves when done; the sheet stays open (button re-enabled) if it throws. */
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
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
          <Button label={confirm} onPress={() => void go()} busy={busy} />
          <Button variant="ghost" label="Cancel" onPress={onClose} />
        </>
      }>
      <Body>{body}</Body>
    </Sheet>
  );
}
