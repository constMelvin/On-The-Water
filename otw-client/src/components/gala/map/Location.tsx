'use client';

/**
 * "Who's OTW?" (live location). Reference: src/proto2.js views.location + proto3 locPerm / loc-*.
 * - Travel status (works without GPS): PUT /rooms/{id}/members/me/travel-status.
 * - Live location (opt-in): this device sends LIVE fixes (lib/otw/location-share.ts); the map
 *   shows everyone sharing from GET /rooms/{id}/locations, kept fresh by realtime location.*.
 */
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Card, Icon, PageHead, SegmentedControl, Sheet, Tag, type TagVariant } from '@/components/otw';
import { toast } from '@/lib/otw/feedback';
import { useGala } from '@/lib/otw/gala-store';
import { featureKey } from '@/lib/otw/live';
import { useLocations, useTabState } from '@/lib/otw/gala-queries';
import { startSharing, stopSharing, useSharing } from '@/lib/otw/location-share';
import { updateTravelStatus } from '@/lib/api/gala';
import { distanceKm, formatDistance } from '@/lib/otw/distance';
import type { TravelStatus } from '@/lib/api/rooms';
import { ErrorState, Skeleton } from '../States';
import type { MapFocus, MapPin } from './LiveMap';
import s from './map.module.css';

const LiveMap = dynamic(() => import('./LiveMap'), {
  ssr: false,
  loading: () => <div className={s.leaflet} aria-label="Loading the map" />,
});

const TRAVEL: Record<TravelStatus, { l: string; tag: TagVariant; icon: 'check' | 'nav' | 'clock' | 'home' }> = {
  ARRIVED: { l: 'Already there', tag: 'l-there', icon: 'check' },
  ALMOST_THERE: { l: 'Almost there', tag: 'l-almost', icon: 'nav' },
  ON_THE_WAY: { l: 'On the way', tag: 'l-otw', icon: 'clock' },
  STILL_HOME: { l: 'Still at home', tag: 'l-home', icon: 'home' },
};
const ORDER: TravelStatus[] = ['ARRIVED', 'ALMOST_THERE', 'ON_THE_WAY', 'STILL_HOME'];
/** Segmented control order (reference LOC): home, otw, almost, there. */
const CHOICES: TravelStatus[] = ['STILL_HOME', 'ON_THE_WAY', 'ALMOST_THERE', 'ARRIVED'];

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  return mins < 1 ? 'just now' : mins === 1 ? '1 min ago' : `${mins} min ago`;
}

export function Location() {
  const { roomId, room, role, memberRows, myUserId, toneOf, members, phase, setViewState } = useGala();
  const qc = useQueryClient();
  const q = useLocations();
  const state = useTabState(q);
  const sharing = useSharing();
  const [asking, setAsking] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [statusOverride, setStatusOverride] = useState<TravelStatus | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  if (state === 'loading' || !roomId) return <Skeleton label="Loading the map" />;
  if (state === 'error') {
    return (
      <ErrorState
        kind="dashboard"
        title="The map didn't load."
        body="Nobody's location was lost. Try again."
        onRetry={async () => {
          setViewState('default');
          return (await q.refetch()).isSuccess;
        }}
      />
    );
  }

  const allowed = role === 'leader' || !!room?.permissions.locationSharingEnabled;
  const mineHere = sharing.status !== 'off' && sharing.roomId === roomId ? sharing : null;
  const locations = q.data ?? [];
  const byUser = new Map(locations.map((l) => [l.userId, l]));
  const sharingNow = mineHere?.status === 'on' || mineHere?.status === 'starting' || byUser.has(myUserId ?? '');

  const me = memberRows.find((m) => m.userId === myUserId);
  const myStatus = statusOverride ?? me?.travelStatus ?? 'STILL_HOME';
  const statusOf = (userId: string, fallback: TravelStatus) => (userId === myUserId ? myStatus : fallback);

  const pins: MapPin[] = locations.flatMap((l) => {
    const m = memberRows.find((x) => x.userId === l.userId);
    return m
      ? [{ userId: l.userId, name: m.nickname, tone: toneOf(l.userId) ?? 'teal', lat: l.lat, lng: l.lng, me: l.userId === myUserId }]
      : [];
  });
  const meeting =
    room?.meetingLat != null && room?.meetingLng != null
      ? { lat: room.meetingLat, lng: room.meetingLng, label: room.meetingLabel }
      : null;
  const destination =
    room?.destinationLat != null && room?.destinationLng != null
      ? { lat: room.destinationLat, lng: room.destinationLng, label: room.destination }
      : null;
  /** "12 km from the gala" for a member who is sharing, when the gala is pinned. */
  const away = (userId: string) => {
    const loc = byUser.get(userId);
    return loc && destination ? `${formatDistance(distanceKm(loc, destination))} from the gala` : null;
  };

  const count = (st: TravelStatus) => memberRows.filter((m) => statusOf(m.userId, m.travelStatus) === st).length;
  const list = [...memberRows].sort(
    (a, b) => ORDER.indexOf(statusOf(a.userId, a.travelStatus)) - ORDER.indexOf(statusOf(b.userId, b.travelStatus))
  );
  const sel = selected ? memberRows.find((m) => m.userId === selected) : null;

  /** Moves the map to a spot and brings the map on screen (it sits above the list on phones). */
  const flyTo = (lat: number, lng: number, zoom: number) => {
    setFocus((f) => ({ lat, lng, zoom, n: (f?.n ?? 0) + 1 }));
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  const findMember = (userId: string) => {
    const loc = byUser.get(userId);
    if (!loc) return;
    setSelected(userId);
    flyTo(loc.lat, loc.lng, 16);
  };

  const setStatus = (st: TravelStatus) => {
    setStatusOverride(st);
    updateTravelStatus(roomId, st)
      .then(() => {
        toast(`Status: ${TRAVEL[st].l}.`);
        void qc.invalidateQueries({ queryKey: featureKey(roomId, 'members') });
        void qc.invalidateQueries({ queryKey: featureKey(roomId, 'summary') });
      })
      .catch((e: unknown) => toast(e instanceof Error && e.message ? e.message : "Couldn't update your status.", 'err'))
      .finally(() => setStatusOverride(null));
  };

  const stop = async () => {
    await stopSharing();
    qc.setQueryData(featureKey(roomId, 'locations'), locations.filter((l) => l.userId !== myUserId));
    toast('Stopped sharing your location.');
  };

  let banner;
  if (!allowed) {
    banner = (
      <div className={s.lbar}>
        <span className="ico sm">
          <Icon name="lock" size={20} />
        </span>
        <div>
          <b>Live location is off for this gala.</b>
          <span>The Gala Leader turned it off. You can still set your status by hand below.</span>
        </div>
      </div>
    );
  } else if (mineHere?.status === 'denied') {
    banner = (
      <div className={`${s.lbar} ${s.deny}`}>
        <Icon name="alert" size={24} />
        <div>
          <b>Location is blocked for OTW.</b>
          <span>
            Turn it on in your browser&apos;s site settings: open the lock icon by the address bar, set Location to
            Allow, then try again. You can still set your status by hand below.
          </span>
        </div>
        <Button sm onClick={() => startSharing(roomId)}>
          <Icon name="refresh" size={18} /> Try again
        </Button>
      </div>
    );
  } else if (mineHere?.status === 'error') {
    banner = (
      <div className={`${s.lbar} ${s.deny}`}>
        <Icon name="alert" size={24} />
        <div>
          <b>Your location isn&apos;t being shared.</b>
          <span>{mineHere.message}</span>
        </div>
        <Button sm onClick={() => startSharing(roomId)}>
          <Icon name="refresh" size={18} /> Try again
        </Button>
      </div>
    );
  } else if (sharingNow) {
    banner = (
      <div className={`${s.lbar} ${s.on}`}>
        <i className={s.live} />
        <div>
          <b>{mineHere ? "You're sharing your location." : 'Your location is shared from another device.'}</b>
          <span>
            Visible to the {memberRows.length} {memberRows.length === 1 ? 'person' : 'people'} in this gala, only while
            sharing is on.
          </span>
        </div>
        <Button sm variant="cream" onClick={() => void stop()}>
          Stop sharing
        </Button>
      </div>
    );
  } else {
    banner = (
      <div className={s.lbar}>
        <span className="ico sm">
          <Icon name="lock" size={20} />
        </span>
        <div>
          <b>Your location is private.</b>
          <span>Nobody sees where you are until you choose to share.</span>
        </div>
        <Button sm onClick={() => setAsking(true)}>
          Share my location
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHead
        title="Who's actually OTW?"
        sub="Less “Nasaan ka na?” More “2 minutes away.”"
        tag={<Tag icon="nav">OTW na ba talaga? Now you can actually see.</Tag>}
      />
      {phase === 'planning' && <p className="fine">Most people share on gala day, but it works any time.</p>}
      {banner}
      <div className={s.grid}>
        <Card className={s.mapcard}>
          <div ref={mapRef} className={s.mapwrap}>
            <LiveMap
              pins={pins}
              meeting={meeting}
              destination={destination}
              selected={selected}
              onSelect={setSelected}
              focus={focus}
            />
            {sel && (
              <div className={s.callout}>
                <Avatar name={sel.nickname} tone={toneOf(sel.userId)} size={36} />
                <div>
                  <b>
                    {sel.nickname}
                    {sel.userId === myUserId ? ' (you)' : ''}
                  </b>
                  <span>
                    {TRAVEL[statusOf(sel.userId, sel.travelStatus)].l}
                    {byUser.get(sel.userId) ? ` · updated ${ago(byUser.get(sel.userId)!.updatedAt)}` : ''}
                    {away(sel.userId) ? ` · ${away(sel.userId)}` : ''}
                  </span>
                </div>
                <button type="button" className="ibtn" onClick={() => setSelected(null)} aria-label="Close">
                  <Icon name="x" size={18} />
                </button>
              </div>
            )}
          </div>
          {(destination || meeting) && (
            <div className={s.jump}>
              {destination && (
                <Button sm variant="zest" onClick={() => flyTo(destination.lat, destination.lng, 16)}>
                  <Icon name="pin" size={18} /> Find the gala
                </Button>
              )}
              {meeting && (
                <Button sm variant="cream" onClick={() => flyTo(meeting.lat, meeting.lng, 16)}>
                  <Icon name="flag" size={18} /> Meeting point
                </Button>
              )}
            </div>
          )}
          <p className={s.place}>
            <Icon name="pin" size={18} />
            {destination ? (
              <span>
                Gala: <b>{destination.label}</b>
              </span>
            ) : (
              <span className="fine">
                {role === 'leader'
                  ? 'Pin the destination in Settings so everyone sees where the gala is.'
                  : 'The Gala Leader hasn’t pinned the destination on the map yet.'}
              </span>
            )}
          </p>
          <div className={s.mapstat}>
            <Tag variant="l-there" icon="check">{`${count('ARRIVED')} arrived`}</Tag>
            <Tag variant="l-almost" icon="nav">{`${count('ALMOST_THERE')} almost there`}</Tag>
            <Tag variant="l-otw" icon="clock">{`${count('ON_THE_WAY')} on the way`}</Tag>
          </div>
        </Card>

        <div className={s.side}>
          <Card>
            <h3>Your status</h3>
            <p className="fine">Works with or without GPS. Friends see it either way.</p>
            <SegmentedControl<TravelStatus>
              label="Your status"
              value={myStatus}
              onChange={setStatus}
              wrap
              options={CHOICES.map((k) => ({ value: k, label: TRAVEL[k].l }))}
            />
          </Card>
          <Card>
            <h3>Everyone</h3>
            {pins.length > 0 && <p className="fine">Tap someone who&apos;s sharing to find them on the map.</p>}
            <ul className={`mlist ${s.list}`}>
              {list.map((m) => {
                const loc = byUser.get(m.userId);
                const st = statusOf(m.userId, m.travelStatus);
                const online = members.find((x) => x.id === m.userId)?.on === 1;
                const body = (
                  <>
                    <Avatar name={m.nickname} tone={toneOf(m.userId)} size={36} online={online} />
                    <span className={s.who}>
                      <b>
                        {m.nickname}
                        {m.userId === myUserId ? ' (you)' : ''}
                      </b>
                      <i className={s.eta}>
                        {loc ? `Sharing live · ${ago(loc.updatedAt)}` : 'Not sharing'}
                        {away(m.userId) ? ` · ${away(m.userId)}` : ''}
                      </i>
                    </span>
                    <Tag variant={TRAVEL[st].tag}>{TRAVEL[st].l}</Tag>
                  </>
                );
                return (
                  <li key={m.userId}>
                    {loc ? (
                      <button
                        type="button"
                        className={`${s.row} ${s.find}${selected === m.userId ? ` ${s.picked}` : ''}`}
                        onClick={() => findMember(m.userId)}
                        aria-pressed={selected === m.userId}
                        aria-label={`Find ${m.nickname} on the map`}
                      >
                        {body}
                        <span className={s.go}>
                          <Icon name="nav" size={16} />
                        </span>
                      </button>
                    ) : (
                      <div className={s.row}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card>
            <h3>Privacy</h3>
            <ul className={s.mini}>
              <li>
                <Icon name="users" size={16} />
                <span>
                  <b>Who can see:</b> only people who joined this gala.
                </span>
              </li>
              <li>
                <Icon name="clock" size={16} />
                <span>
                  <b>When:</b> only while sharing is on. It stops 3 hours after the gala ends.
                </span>
              </li>
              <li>
                <Icon name="x" size={16} />
                <span>
                  <b>Stop:</b> one tap, any time, from this screen.
                </span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {asking && (
        <Sheet
          title="Share your location with the gala?"
          onClose={() => setAsking(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setAsking(false)}>
                Not now
              </Button>
              <Button
                onClick={() => {
                  setAsking(false);
                  startSharing(roomId);
                  toast("You're sharing your location.");
                }}
              >
                Share my location
              </Button>
            </>
          }
        >
          <ul className={s.mini}>
            <li>
              <Icon name="users" size={20} />
              <span>
                <b>Who can see it:</b> only people who joined this gala.
              </span>
            </li>
            <li>
              <Icon name="clock" size={20} />
              <span>
                <b>How long:</b> only while sharing is on. It stops 3 hours after the gala ends.
              </span>
            </li>
            <li>
              <Icon name="x" size={20} />
              <span>
                <b>Stopping:</b> one tap on this screen, any time.
              </span>
            </li>
          </ul>
          <p className="fine">Your browser will ask for permission next.</p>
        </Sheet>
      )}
    </>
  );
}
