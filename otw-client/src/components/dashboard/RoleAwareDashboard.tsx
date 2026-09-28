'use client';

import * as React from 'react';
import { useState } from 'react';
import { GalaDashboardShell } from './GalaDashboardShell';
import { LeaderDashboard } from './LeaderDashboard';
import { MemberDashboard } from './MemberDashboard';
import { type GalaRole, type GalaDashboardProps } from './types';

export function RoleAwareDashboard({
  code,
  initialRole = 'LEADER',
}: GalaDashboardProps) {
  const [role, setRole] = useState<GalaRole>(initialRole);

  return (
    <GalaDashboardShell code={code} role={role} onRoleChange={setRole}>
      {role === 'LEADER' ? (
        <LeaderDashboard code={code} />
      ) : (
        <MemberDashboard code={code} />
      )}
    </GalaDashboardShell>
  );
}

export default RoleAwareDashboard;
