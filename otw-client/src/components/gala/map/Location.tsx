'use client';

/**
 * "Who's OTW?" (live location). Reference: src/proto2.js views.location + proto3 locPerm / loc-*.
 * - Travel status (works without GPS): PUT /rooms/{id}/members/me/travel-status.
 * - Live location (opt-in): this device sends LIVE fixes (lib/otw/location-share.ts); the map
 *   shows everyone sharing from GET /rooms/{id}/locations, kept fresh by realtime location.*.
 * Every travel status looks the same everywhere here (colour + icon): see ./travel.ts.
 */
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Card, Icon, PageHead, Sheet, Tag } from '@/components/otw';
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
import { CHOICES, ORDER, TRAVEL } from './travel';
import s from './map.module.css';

const LiveMap = dynamic(() => import('./LiveMap'), {
  ssr: false,
  loading: () => <div className={s.map} aria-label="Loading the map" />,
});

/** The picker button colour for each status (see .cHome etc. in map.module.css). */
const CHOICE_CLASS = { home: s.cHome, otw: s.cOtw, almost: s.cAlmost, there: s.cThere } as const;

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
    if (!m) return [];
    const status = statusOf(l.userId, m.travelStatus);
    return [
      {
        userId: l.userId,
        name: m.nickname,
        tone: toneOf(l.userId) ?? 'teal',
        lat: l.lat,
        lng: l.lng,
        me: l.userId === myUserId,
        status,
        moving: TRAVEL[status].moving && l.shareMode === 'LIVE',
      },
    ];
  });
  const meeting =
    room?.meetingLat != null && room?.meetingLng != null
      ? { lat: room.meetingLat, lng: room.meetingLng, label: room.meetingLabel }
      : null;
  const destination =
    room?.destinationLat != null && room?.destinationLng != null
      ? { lat: room.destinationLat, lng: room.destinationLng, label: room.destination }
      : null;
  /**
   * "12 km from the gala" for a member who is sharing, when the gala is pinned.
   * TODO(backend): a real ETA from routing ("2 minutes away"); today it is straight-line distance only.
   */
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

  const setStatus = (st: TravelStatus) => {
    setStatusOverride(st);
    updateTravelStatus(roomId, st)
      .then(() => {
        toast(`Status: ${TRAVEL[st].label}.`);
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

  const selMeta = sel ? TRAVEL[statusOf(sel.userId, sel.travelStatus)] : null;

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
          <div ref={mapRef}>
            <LiveMap
              pins={pins}
              meeting={meeting}
              destination={destination}
              selected={selected}
              onSelect={setSelected}
              focus={focus}
            />
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
            <span className={s.pbadge}>
              <Icon name="pin" size={16} />
            </span>
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
            <Tag variant={TRAVEL.ARRIVED.tag} icon={TRAVEL.ARRIVED.icon}>{`${count('ARRIVED')} arrived`}</Tag>
            <Tag variant={TRAVEL.ALMOST_THERE.tag} icon={TRAVEL.ALMOST_THERE.icon}>{`${count('ALMOST_THERE')} almost there`}</Tag>
            <Tag variant={TRAVEL.ON_THE_WAY.tag} icon={TRAVEL.ON_THE_WAY.icon}>{`${count('ON_THE_WAY')} on the way`}</Tag>
          </div>
          {sel && selMeta && (
            <div className={s.callout}>
              <Avatar name={sel.nickname} tone={toneOf(sel.userId)} size={36} userId={sel.userId} />
              <div>
                <b>
                  {sel.nickname}
                  {sel.userId === myUserId ? ' (you)' : ''}
                </b>
                <span>
                  {selMeta.label}
                  {byUser.get(sel.userId) ? ` · updated ${ago(byUser.get(sel.userId)!.updatedAt)}` : ''}
                  {away(sel.userId) ? ` · ${away(sel.userId)}` : ''}
                </span>
              </div>
              <button type="button" className="ibtn" onClick={() => setSelected(null)} aria-label="Close">
                <Icon name="x" size={18} />
              </button>
            </div>
          )}
        </Card>

        <div className={s.side}>
          <Card>
            <h3>Your status</h3>
            <p className="fine">Works with or without GPS. Friends see it either way.</p>
            <div className={s.choices} role="group" aria-label="Your status">
              {CHOICES.map((k) => {
                const m = TRAVEL[k];
                return (
                  <button
                    key={k}
                    type="button"
                    className={`${s.choice} ${CHOICE_CLASS[m.cls]}`}
                    aria-pressed={myStatus === k}
                    onClick={() => setStatus(k)}
                  >
                    <Icon name={m.icon} size={22} />
                    <b>{m.label}</b>
                  </button>
                );
              })}
            </div>
          </Card>
          <Card>
            <h3>Everyone</h3>
            {locations.length === 0 && (
              <p className="fine">Walang nagse-share pa. Everyone&apos;s still private.</p>
            )}
            <ul className={s.people}>
              {list.map((m) => {
                const loc = byUser.get(m.userId);
                const meta = TRAVEL[statusOf(m.userId, m.travelStatus)];
                const online = members.find((x) => x.id === m.userId)?.on === 1;
                const picked = selected === m.userId;
                return (
                  <li key={m.userId} className={`${s.person}${picked ? ` ${s.picked}` : ''}${loc ? '' : ` ${s.quiet}`}`}>
                    <Avatar name={m.nickname} tone={toneOf(m.userId)} size={40} online={online} userId={m.userId} />
                    <div className={s.pmain}>
                      <div className={s.ptop}>
                        <b className={s.pname}>
                          {m.nickname}
                          {m.userId === myUserId ? ' (you)' : ''}
                        </b>
                        <Tag variant={meta.tag} icon={meta.icon}>
                          {meta.label}
                        </Tag>
                      </div>
                      <div className={s.pbot}>
                        <span className={s.eta}>
                          {loc ? (
                            <>
                              <i className={s.dot} aria-hidden="true" />
                              Sharing live · {ago(loc.updatedAt)}
                              {away(m.userId) ? ` · ${away(m.userId)}` : ''}
                            </>
                          ) : (
                            <>
                              <Icon name="lock" size={14} />
                              Not sharing · private
                            </>
                          )}
                        </span>
                        {loc && (
                          <button
                            type="button"
                            className={s.locate}
                            aria-pressed={picked}
                            aria-label={`Show ${m.nickname} on the map`}
                            onClick={() => setSelected(m.userId)}
                          >
                            <Icon name="pin" size={16} /> Locate
                          </button>
                        )}
                      </div>
                    </div>
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
