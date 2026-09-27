export type GalaRole = 'LEADER' | 'MEMBER' | 'GUEST';

export interface GalaDashboardProps {
  code: string;
  initialRole?: GalaRole;
}

export interface DashboardViewProps {
  code: string;
}
