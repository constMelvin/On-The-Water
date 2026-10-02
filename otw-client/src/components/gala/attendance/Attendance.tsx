'use client';

/**
 * Who's G? (attendance) tab. Reference: src/proto2.js views.attendance, attendance-*.png.
 * Data is real, not mocked: members and setMyStatus come from useGala() (GET .../members,
 * PATCH .../members/me/rsvp), so a change here shows on the dashboard right away.
 */
import { PageHead } from '@/components/otw';
import { useGala } from '@/lib/otw/gala-store';
import { StateGate } from '../States';
import { StatusChoice } from './StatusChoice';
import { SummaryTiles } from './SummaryTiles';
import { MemberGroups } from './MemberGroups';

export function Attendance() {
  const { viewState, liveState, setViewState, retry, openSheet } = useGala();
  // Same rule as the dashboard: the dev switcher wins, otherwise the live query state.
  const state = viewState !== 'default' ? viewState : liveState;

  // Phase 3 (states + polish) is a follow-up; this only routes loading / empty / error / offline.
  return (
    <>
      <PageHead title="So... who's G?" sub="Change your status any time. Everyone sees it right away." />
      <StateGate
        state={state}
        kind="attendance"
        onAction={() => openSheet('share')}
        onRetry={() => {
          setViewState('default');
          return retry();
        }}
      >
        <StatusChoice />
        <SummaryTiles />
        <MemberGroups />
      </StateGate>
    </>
  );
}
