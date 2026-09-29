'use client';

/**
 * TEMPORARY dev-only review switcher (phase, role, account, screen state).
 * To remove: delete this file + DevSwitcher.module.css and the <DevSwitcher /> line in GalaShell.tsx.
 */
import { useState, type ReactNode } from 'react';
import { Button, Icon, SegmentedControl } from '@/components/otw';
import { useGala, type Phase, type Role, type ViewState } from '@/lib/otw/gala-store';
import s from './DevSwitcher.module.css';

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={s.group}>
      <span className={s.label}>{label}</span>
      {children}
    </div>
  );
}

export function DevSwitcher() {
  const g = useGala();
  const [open, setOpen] = useState(false);
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className={s.demo}>
      {open && (
        <div className={s.panel} role="region" aria-label="Demo controls">
          <Group label="Phase">
            <SegmentedControl<Phase>
              label="Phase"
              value={g.phase}
              onChange={g.setPhase}
              options={[
                { value: 'planning', label: 'Planning' },
                { value: 'day', label: 'Gala day' },
                { value: 'done', label: 'Done' },
              ]}
            />
          </Group>
          <Group label="Role">
            <SegmentedControl<Role>
              label="Role"
              value={g.role}
              onChange={g.setRole}
              options={[
                { value: 'leader', label: 'Leader' },
                { value: 'member', label: 'Member' },
              ]}
            />
          </Group>
          <Group label="Account">
            <SegmentedControl<'off' | 'on'>
              label="Account"
              value={g.hasAccount ? 'on' : 'off'}
              onChange={(v) => g.setHasAccount(v === 'on')}
              options={[
                { value: 'off', label: 'No account' },
                { value: 'on', label: 'Signed in' },
              ]}
            />
          </Group>
          <Group label="Screen state">
            <SegmentedControl<ViewState>
              label="Screen state"
              value={g.viewState}
              onChange={g.setViewState}
              options={[
                { value: 'default', label: 'Default' },
                { value: 'loading', label: 'Loading' },
                { value: 'empty', label: 'Empty' },
                { value: 'error', label: 'Error' },
                { value: 'offline', label: 'Offline' },
              ]}
            />
          </Group>
        </div>
      )}
      <Button sm className={s.toggle} onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Demo controls">
        <Icon name="sliders" size={18} />
        <span>Demo</span>
      </Button>
    </div>
  );
}
