import * as React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { type GalaRole } from './types';

interface GalaDashboardShellProps {
  code: string;
  role: GalaRole;
  onRoleChange?: (role: GalaRole) => void;
  children: React.ReactNode;
}

export function GalaDashboardShell({
  code,
  role,
  onRoleChange,
  children,
}: GalaDashboardShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Gala Dashboard Top Bar */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-xl font-bold tracking-tight text-primary hover:opacity-80 transition-opacity"
              >
                OTW
              </Link>
              <span className="text-muted-foreground">/</span>
              <h1 className="text-lg font-semibold tracking-tight">Gala Dashboard</h1>
              <Badge variant="outline" className="font-mono text-xs">
                Code: {code}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gala Code: <span className="font-mono font-semibold text-foreground">{code}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Role switch toggle for scaffold development and preview */}
            <div className="flex items-center gap-1.5 text-xs bg-muted p-1 rounded-lg">
              <span className="text-muted-foreground px-2 font-medium">View Role:</span>
              <button
                type="button"
                onClick={() => onRoleChange?.('LEADER')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  role === 'LEADER'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Leader View
              </button>
              <button
                type="button"
                onClick={() => onRoleChange?.('MEMBER')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  role === 'MEMBER'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Member View
              </button>
            </div>

            <nav className="flex items-center gap-2">
              <Link
                href="/"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
              >
                Home
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6">
        {children}
      </main>
    </div>
  );
}

export default GalaDashboardShell;
