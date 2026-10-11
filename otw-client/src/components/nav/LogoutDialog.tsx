'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Icon, Sheet } from '@/components/otw';
import { signOut } from '@/lib/auth/session';
import { toast } from '@/lib/otw/feedback';
import { cancelLogOut, useLogOutOpen } from './logout';

/** "Sure ka na ba?": the one place that actually logs out. Safe choice ("Dito muna ako") has focus; Esc cancels. */
export function LogoutDialog() {
  const open = useLogOutOpen();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
      cancelLogOut();
      toast('Naka-log out ka na. Balik ka anytime.');
      router.push('/');
    }
  };

  return (
    <Sheet
      title="Sure ka na ba?"
      onClose={cancelLogOut}
      footer={
        <>
          <Button variant="ghost" onClick={cancelLogOut} data-autofocus>
            Dito muna ako
          </Button>
          <Button variant="rosy" onClick={confirm} disabled={busy}>
            <Icon name="logout" size={20} /> Oo, log out
          </Button>
        </>
      }
    >
      <p>Log out na talaga? Hindi mawawala ang mga gala mo. Nandito pa rin sila pagbalik mo.</p>
    </Sheet>
  );
}
