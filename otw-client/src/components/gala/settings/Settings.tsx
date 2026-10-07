'use client';

/**
 * Settings tab. Reference: src/proto2.js views.settings + the CF confirm sheets in proto3.js.
 * - Gala Leader: details (PATCH /rooms/{id}), access (code, PUT .../password, POST .../code),
 *   members (DELETE .../members/{userId}), member permissions (PATCH), archive / delete.
 * - Member: their nickname in this gala (PATCH .../members/me) and leaving (POST .../members/me/leave).
 */
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Card, Icon, PageHead, Sheet, Switch, Tag } from '@/components/otw';
import { burstEl, toast } from '@/lib/otw/feedback';
import { useGala } from '@/lib/otw/gala-store';
import { featureKey, roomKey } from '@/lib/otw/live';
import { galaRoute, normCode, rememberRoom } from '@/lib/otw/gala-registry';
import {
  archiveRoom,
  changeGalaPassword,
  deleteRoom,
  leaveRoom,
  regenerateCode,
  removeMember,
  updateMyNickname,
  updateRoom,
  type UpdateRoomInput,
} from '@/lib/api/gala';
import type { RoomDto } from '@/lib/api/rooms';
import { meKeys } from '@/lib/api/me-queries';
import type { RoomPermissionsVM } from '@/lib/api/types';
import { LocationPicker } from '@/components/plan/LocationPicker';
import { ConfirmSheet } from '../ConfirmSheet';
import { galaHref } from '../nav';
import { useCopyCode } from '../useCopyCode';
import { Skeleton } from '../States';
import s from './settings.module.css';

const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

type Confirm = { kind: 'leave' | 'reset' | 'archive' | 'delete' } | { kind: 'remove'; userId: string; name: string };

const PERMS: [key: keyof RoomPermissionsVM, label: string][] = [
  ['membersCanEditPlan', 'Edit the plan'],
  ['membersCanAddPhotos', 'Add photos'],
  ['membersCanDeleteOwnPhotos', 'Delete only their own photos'],
  ['locationSharingEnabled', 'Share live location'],
];

export function Settings() {
  const { role, room, roomId, gala, me, myUserId, memberRows, toneOf } = useGala();
  const router = useRouter();
  const qc = useQueryClient();
  const copyCode = useCopyCode();
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [changingPw, setChangingPw] = useState(false);

  if (!room || !roomId) return <Skeleton label="Loading settings" />;

  // Navigate away without forgetting the room first: the gala gate sends a device that no longer
  // knows the room to My Galas, which would race this push. A left / deleted room is forgotten
  // the next time its code is opened (403 / 404 from GET /rooms/{id}).
  const leaveTo = (path: string, msg: string) => {
    void qc.invalidateQueries({ queryKey: meKeys.all });
    toast(msg);
    router.push(path);
  };

  const sheets = (
    <>
      {confirm?.kind === 'leave' && (
        <ConfirmSheet
          title="Leave this gala?"
          body="You can come back any time with the gala code and password."
          confirm="Leave gala"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              await leaveRoom(roomId);
              leaveTo('/me/galas', 'You left the gala.');
            } catch (e) {
              toast(errMsg(e, "Couldn't leave the gala."), 'err');
              throw e;
            }
          }}
        />
      )}
      {confirm?.kind === 'reset' && (
        <ConfirmSheet
          title="Make a new gala code?"
          body="The old code stops working. People already in the gala stay in."
          confirm="Make new code"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              const next = await regenerateCode(roomId);
              const code = normCode(next.roomCode);
              rememberRoom(code, roomId);
              qc.setQueryData(roomKey(roomId), next);
              toast(`New gala code made: ${code}.`);
              router.replace(`${galaRoute(code)}/settings`);
            } catch (e) {
              toast(errMsg(e, "Couldn't make a new code."), 'err');
              throw e;
            }
          }}
        />
      )}
      {confirm?.kind === 'archive' && (
        <ConfirmSheet
          title="Archive this gala?"
          body="It moves to Gala History. Photos and expenses stay readable."
          confirm="Archive gala"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              await archiveRoom(roomId);
              leaveTo('/me/history', 'Gala archived. Find it in Gala History.');
            } catch (e) {
              toast(errMsg(e, "Couldn't archive the gala."), 'err');
              throw e;
            }
          }}
        />
      )}
      {confirm?.kind === 'delete' && (
        <ConfirmSheet
          title="Delete this gala?"
          body="Everyone loses the plan, expenses and photos. This can't be undone."
          confirm="Delete gala"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              await deleteRoom(roomId);
              leaveTo('/me/galas', 'Gala deleted.');
            } catch (e) {
              toast(errMsg(e, "Couldn't delete the gala."), 'err');
              throw e;
            }
          }}
        />
      )}
      {confirm?.kind === 'remove' && (
        <ConfirmSheet
          title="Remove this member?"
          body="They lose access to the gala until you let them back in."
          confirm="Remove"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              await removeMember(roomId, confirm.userId);
              void qc.invalidateQueries({ queryKey: featureKey(roomId, 'members') });
              void qc.invalidateQueries({ queryKey: featureKey(roomId, 'summary') });
              toast(`${confirm.name} removed.`);
              setConfirm(null);
            } catch (e) {
              toast(errMsg(e, `Couldn't remove ${confirm.name}.`), 'err');
              throw e;
            }
          }}
        />
      )}
      {changingPw && <PasswordSheet roomId={roomId} onClose={() => setChangingPw(false)} />}
    </>
  );

  if (role !== 'leader') {
    return (
      <>
        <PageHead title="Your settings" sub={`You're a member of ${gala.title}.`} tag={<Tag variant="blossom" icon="user">Member</Tag>} />
        <div className={s.cols}>
          <Card className={s.cTeal}>
            <h3>You in this gala</h3>
            <NicknameForm roomId={roomId} current={me} />
            <div className={s.srow2}>
              <div>
                <b>Share location on gala day</b>
                <span className="fine">Only people in this gala can see it. Turn it on from the map.</span>
              </div>
              <Button sm variant="teal" onClick={() => router.push(galaHref(gala.code, 'map'))}>
                <Icon name="nav" size={16} /> Open map
              </Button>
            </div>
          </Card>
          <Card className={s.cZest}>
            <h3>Coming back later</h3>
            <p className="fine">
              You&apos;ll need the gala code and the gala password. Ask your Gala Leader if you don&apos;t have it.
            </p>
            <Button sm variant="ghost" onClick={() => setConfirm({ kind: 'leave' })}>
              Leave gala
            </Button>
          </Card>
        </div>
        {sheets}
      </>
    );
  }

  const setPerm = async (key: keyof RoomPermissionsVM, value: boolean) => {
    // Instant switch; the server's room replaces it (or puts it back on failure).
    qc.setQueryData<RoomDto>(roomKey(roomId), (r) => r && { ...r, permissions: { ...r.permissions, [key]: value } });
    try {
      const saved = await updateRoom(roomId, { [key]: value });
      qc.setQueryData(roomKey(roomId), saved);
    } catch (e) {
      toast(errMsg(e, "Couldn't save your changes."), 'err');
      void qc.invalidateQueries({ queryKey: roomKey(roomId) });
    }
  };

  return (
    <>
      <PageHead
        title="Gala settings"
        sub="You lead this gala, so these controls are yours."
        tag={<Tag icon="crown">Gala Leader</Tag>}
      />
      <div className={s.cols}>
        <div className={s.col}>
          <Card className={s.cTeal}>
            <h3>Gala details</h3>
            <DetailsForm room={room} />
          </Card>
          <Card className={s.cZest}>
            <h3>Access</h3>
            <div className={s.srow2}>
              <div>
                <b>Gala Code</b>
                <span className="fine">{gala.code}</span>
              </div>
              <Button sm variant="teal" onClick={copyCode}>
                <Icon name="copy" size={16} /> Copy
              </Button>
            </div>
            <div className={s.srow2}>
              <div>
                <b>Gala Password</b>
                <StoredPassword />
              </div>
              <Button sm variant="ghost" onClick={() => setChangingPw(true)}>
                Change
              </Button>
            </div>
            <button type="button" className="lnk" onClick={() => setConfirm({ kind: 'reset' })}>
              Make a new gala code
            </button>
          </Card>
        </div>
        <div className={s.col}>
          <Card className={s.cTeal}>
            <h3>Members</h3>
            <ul className={s.members}>
              {memberRows.map((m) => (
                <li key={m.userId} className={s.member}>
                  <Avatar name={m.nickname} tone={toneOf(m.userId)} size={40} userId={m.userId} />
                  <span className={s.mname}>
                    {m.nickname}
                    {m.userId === myUserId ? ' (you)' : ''}
                  </span>
                  {m.role === 'HOST' ? (
                    <Tag icon="crown">Leader</Tag>
                  ) : (
                    <button
                      type="button"
                      className="ibtn"
                      aria-label={`Remove ${m.nickname}`}
                      onClick={() => setConfirm({ kind: 'remove', userId: m.userId, name: m.nickname })}
                    >
                      <Icon name="x" size={18} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
          <Card className={s.cZest}>
            <h3>What members can do</h3>
            {PERMS.map(([key, label]) => (
              <div key={key} className={s.srow2}>
                <b>{label}</b>
                <Switch checked={room.permissions[key]} label={label} onChange={(v) => void setPerm(key, v)} />
              </div>
            ))}
          </Card>
          <Card className={`${s.cRosy} ${s.danger}`}>
            <h3>Danger zone</h3>
            <div className={s.actions}>
              <Button sm variant="ghost" onClick={() => setConfirm({ kind: 'archive' })}>
                Archive gala
              </Button>
              <Button sm onClick={() => setConfirm({ kind: 'delete' })}>
                Delete gala
              </Button>
            </div>
          </Card>
        </div>
      </div>
      {sheets}
    </>
  );
}

/* ---------------- leader: details ---------------- */

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '');

function DetailsForm({ room }: { room: RoomDto }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(room.title);
  const [destination, setDestination] = useState(room.destination);
  // The destination's map pin (Who's OTW? shows it); typing over the text drops it until a place is picked.
  const [pin, setPin] = useState(
    room.destinationLat != null && room.destinationLng != null ? { lat: room.destinationLat, lng: room.destinationLng } : null
  );
  const [startDate, setStartDate] = useState(room.startDate);
  const [endDate, setEndDate] = useState(room.endDate ?? '');
  const [startTime, setStartTime] = useState(hhmm(room.startTime));
  const [endTime, setEndTime] = useState(hhmm(room.endTime));
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    if (!title.trim() || !destination.trim() || !startDate) {
      toast('Add a title, a destination and a start date.', 'err');
      return;
    }
    if (endDate && endDate < startDate) {
      toast("The end date can't be before the start.", 'err');
      return;
    }
    const body: UpdateRoomInput = {
      title: title.trim(),
      destination: destination.trim(),
      ...(pin && { destinationLat: pin.lat, destinationLng: pin.lng }),
      startDate,
      ...(endDate && { endDate }),
      // Clear first, then set what's filled in, so an emptied time really goes away.
      clearTimes: true,
      ...(startTime && { startTime }),
      ...(startTime && endTime && { endTime }),
    };
    const btn = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    setBusy(true);
    try {
      const saved = await updateRoom(room.id, body);
      qc.setQueryData(roomKey(room.id), saved);
      toast('Saved.');
      if (btn) burstEl(btn);
    } catch (err) {
      toast(errMsg(err, "Couldn't save your changes."), 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} style={{ display: 'contents' }}>
      <label className="fl">
        Title
        <input className="in" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <div className="two-in">
        <label className="fl">
          Start date
          <input className="in" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="fl">
          End date (optional)
          <input className="in" type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>
      <div className="two-in">
        <label className="fl">
          Start time (optional)
          <input className="in" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </label>
        <label className="fl">
          End time (optional)
          <input className="in" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </label>
      </div>
      <div className="fl">
        <label htmlFor="settings-destination">Destination</label>
        <LocationPicker
          id="settings-destination"
          value={destination}
          onChange={(v, coords) => {
            setDestination(v);
            setPin(coords ?? null);
          }}
          maxLength={150}
          placeholder="Search a place, e.g. Baguio City"
          inputClassName="in"
        />
        <span className="fine">
          {pin ? 'Pinned on the map in Who’s OTW?.' : 'Pick a suggestion or tap “Pick on map” to pin it on the map.'}
        </span>
      </div>
      <div>
        <Button sm type="submit" disabled={busy}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

/* ---------------- leader: password ---------------- */

const PW_KEY = 'otw:gala-password';

/** The password this device generated at Plan a Gala (sessionStorage), else dots. */
function StoredPassword() {
  const [pw, setPw] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(PW_KEY);
      // Read after mount: the server render has no sessionStorage.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setPw(stored);
    } catch {
      /* storage blocked */
    }
  }, []);
  if (!pw) return <span className="fine">••••••••••</span>;
  return (
    <span className="fine">
      {shown ? pw : '••••••••••'}{' '}
      <button type="button" className="lnk" onClick={() => setShown((v) => !v)}>
        {shown ? 'Hide' : 'Show'}
      </button>
    </span>
  );
}

function PasswordSheet({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    if (pw.length < 6 || pw.length > 72) {
      toast('Use 6 to 72 characters.', 'err');
      return;
    }
    setBusy(true);
    try {
      await changeGalaPassword(roomId, pw);
      try {
        sessionStorage.setItem(PW_KEY, pw);
      } catch {
        /* storage blocked */
      }
      toast('Gala password changed. Share the new one with your group.');
      onClose();
    } catch (err) {
      toast(errMsg(err, "Couldn't change the password."), 'err');
      setBusy(false);
    }
  };
  return (
    <Sheet
      title="Change the Gala Password"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            Save password
          </Button>
        </>
      }
    >
      <form onSubmit={save} style={{ display: 'contents' }}>
        <label className="fl">
          New gala password
          <input
            className="in"
            type="text"
            autoComplete="off"
            minLength={6}
            maxLength={72}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
        </label>
        <p className="fine">People already in the gala stay in. Anyone coming back on a new device needs the new one.</p>
      </form>
    </Sheet>
  );
}

/* ---------------- member: nickname ---------------- */

function NicknameForm({ roomId, current }: { roomId: string; current: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState(current);
  const [busy, setBusy] = useState(false);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const nickname = name.trim();
    if (busy || !nickname || nickname === current) return;
    setBusy(true);
    try {
      await updateMyNickname(roomId, nickname);
      void qc.invalidateQueries({ queryKey: featureKey(roomId, 'members') });
      toast('Name saved.');
    } catch (err) {
      toast(errMsg(err, "Couldn't save your name."), 'err');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={save} style={{ display: 'contents' }}>
      <label className="fl">
        Your name
        <input className="in" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div>
        <Button sm type="submit" disabled={busy || !name.trim() || name.trim() === current}>
          Save name
        </Button>
      </div>
    </form>
  );
}
