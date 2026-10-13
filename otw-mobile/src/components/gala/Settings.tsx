import { useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { LocationField } from '@/components/LocationField';
import { PickerField } from '@/components/PickerField';
import { Sheet } from '@/components/Sheet';
import { Skeleton } from '@/components/States';
import { Button, Card, Field, Fine, IconButton, Lnk, PageHead, Switch, Tag } from '@/components/ui';
import { archiveRoom, changeGalaPassword, deleteRoom, leaveRoom, regenerateCode, removeMember, updateMyNickname, updateRoom, type UpdateRoomInput } from '@/lib/api/gala';
import type { RoomDto } from '@/lib/api/rooms';
import type { RoomPermissionsVM } from '@/lib/api/types';
import { burst, toast } from '@/lib/otw/feedback';
import { normCode, rememberRoom } from '@/lib/otw/gala-registry';
import { useGala } from '@/lib/otw/gala-store';
import { kv } from '@/lib/otw/kv';
import { featureKey, roomKey } from '@/lib/otw/live';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { GalaPage } from './GalaShell';
import { galaHref } from './nav';
import { useCopyCode } from './useCopyCode';

/**
 * Settings (port of otw-client/src/components/gala/settings/Settings.tsx). Gala Leader: details, access (code,
 * password, new code), members, member permissions, archive / delete. Member: nickname and leaving.
 */
const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
type Confirm = { kind: 'leave' | 'reset' | 'archive' | 'delete' } | { kind: 'remove'; userId: string; name: string };

const PERMS: [key: keyof RoomPermissionsVM, label: string][] = [
  ['membersCanEditPlan', 'Edit the plan'],
  ['membersCanAddPhotos', 'Add photos'],
  ['membersCanDeleteOwnPhotos', 'Delete only their own photos'],
  ['locationSharingEnabled', 'Share live location'],
];

/** The password this phone set at Plan a Gala (or last changed it to). */
export const PW_KEY = 'otw:gala-password';

export function Settings() {
  const { role, room, roomId, gala, me, myUserId, memberRows, toneOf } = useGala();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const copyCode = useCopyCode();
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [changingPw, setChangingPw] = useState(false);

  if (!room || !roomId) {
    return (
      <GalaPage>
        <Skeleton label="Loading settings" />
      </GalaPage>
    );
  }

  const leaveTo = (msg: string) => {
    void qc.invalidateQueries({ queryKey: ['me'] });
    toast(msg);
    router.replace('/');
  };

  const sheets = (
    <>
      {confirm?.kind === 'leave' ? (
        <ConfirmSheet
          title="Leave this gala?"
          body="You can come back any time with the gala code and password."
          confirm="Leave gala"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              await leaveRoom(roomId);
              leaveTo('You left the gala.');
            } catch (e) {
              toast(errMsg(e, "Couldn't leave the gala."), 'err');
              throw e;
            }
          }}
        />
      ) : null}
      {confirm?.kind === 'reset' ? (
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
              setConfirm(null);
            } catch (e) {
              toast(errMsg(e, "Couldn't make a new code."), 'err');
              throw e;
            }
          }}
        />
      ) : null}
      {confirm?.kind === 'archive' ? (
        <ConfirmSheet
          title="Archive this gala?"
          body="It moves to Mga Drawing. Photos and expenses stay readable."
          confirm="Archive gala"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              await archiveRoom(roomId);
              leaveTo('Gala archived. Find it in Mga Drawing.');
            } catch (e) {
              toast(errMsg(e, "Couldn't archive the gala."), 'err');
              throw e;
            }
          }}
        />
      ) : null}
      {confirm?.kind === 'delete' ? (
        <ConfirmSheet
          title="Delete this gala?"
          body="Everyone loses the plan, expenses and photos. This can't be undone."
          confirm="Delete gala"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              await deleteRoom(roomId);
              leaveTo('Gala deleted.');
            } catch (e) {
              toast(errMsg(e, "Couldn't delete the gala."), 'err');
              throw e;
            }
          }}
        />
      ) : null}
      {confirm?.kind === 'remove' ? (
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
      ) : null}
      {changingPw ? <PasswordSheet roomId={roomId} onClose={() => setChangingPw(false)} /> : null}
    </>
  );

  if (role !== 'leader') {
    return (
      <GalaPage>
        <PageHead title="Your settings" sub={`You're a member of ${gala.title}.`} tag={<Tag variant="blossom" icon="user">Member</Tag>} />
        <Card shadow={brand.tealDark}>
          <Text style={[styles.h3, { color: colors.text }]}>You in this gala</Text>
          <NicknameForm roomId={roomId} current={me} />
          <View style={styles.srow2}>
            <View style={styles.flex}>
              <Text style={[styles.b, { color: colors.text }]}>Share location on gala day</Text>
              <Fine>Only people in this gala can see it. Turn it on from the map.</Fine>
            </View>
            <Button sm fw={false} variant="teal" icon="nav" label="Open map" onPress={() => router.navigate(galaHref(roomId, 'map') as Href)} />
          </View>
        </Card>
        <Card bg={brand.zest} shadow={brand.zestDark}>
          <Text style={[styles.h3, { color: brand.tealDark }]}>Coming back later</Text>
          <Text style={[styles.fine, { color: brand.tealDark }]}>You&apos;ll need the gala code and the gala password. Ask your Gala Leader if you don&apos;t have it.</Text>
          <Button sm fw={false} variant="ghost" color={brand.tealDark} label="Leave gala" onPress={() => setConfirm({ kind: 'leave' })} />
        </Card>
        {sheets}
      </GalaPage>
    );
  }

  const setPerm = async (key: keyof RoomPermissionsVM, value: boolean) => {
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
    <GalaPage>
      <PageHead title="Gala settings" sub="You lead this gala, so these controls are yours." tag={<Tag icon="crown">Gala Leader</Tag>} />
      <Card shadow={brand.tealDark}>
        <Text style={[styles.h3, { color: colors.text }]}>Gala details</Text>
        <DetailsForm room={room} />
      </Card>

      <Card bg={brand.zest} shadow={brand.zestDark}>
        <Text style={[styles.h3, { color: brand.tealDark }]}>Access</Text>
        <View style={styles.srow2}>
          <View style={styles.flex}>
            <Text style={[styles.b, { color: brand.tealDark }]}>Gala Code</Text>
            <Text style={[styles.fine, { color: brand.tealDark }]}>{gala.code}</Text>
          </View>
          <Button sm fw={false} variant="teal" icon="copy" label="Copy" onPress={copyCode} />
        </View>
        <View style={styles.srow2}>
          <View style={styles.flex}>
            <Text style={[styles.b, { color: brand.tealDark }]}>Gala Password</Text>
            <StoredPassword />
          </View>
          <Button sm fw={false} variant="ghost" color={brand.tealDark} label="Change" onPress={() => setChangingPw(true)} />
        </View>
        <Lnk label="Make a new gala code" color={brand.tealDark} onPress={() => setConfirm({ kind: 'reset' })} style={{ textAlign: 'left' }} />
      </Card>

      <Card shadow={brand.tealDark}>
        <Text style={[styles.h3, { color: colors.text }]}>Members</Text>
        {memberRows.map((m) => (
          <View key={m.userId} style={styles.member}>
            <Avatar name={m.nickname} tone={toneOf(m.userId)} size={40} userId={m.userId} />
            <Text style={[styles.mname, { color: colors.text }]} numberOfLines={1}>
              {m.nickname}
              {m.userId === myUserId ? ' (you)' : ''}
            </Text>
            {m.role === 'HOST' ? (
              <Tag icon="crown">Leader</Tag>
            ) : (
              <IconButton icon="x" size={18} label={`Remove ${m.nickname}`} onPress={() => setConfirm({ kind: 'remove', userId: m.userId, name: m.nickname })} />
            )}
          </View>
        ))}
      </Card>

      <Card bg={brand.zest} shadow={brand.zestDark}>
        <Text style={[styles.h3, { color: brand.tealDark }]}>What members can do</Text>
        {PERMS.map(([key, label]) => (
          <View key={key} style={styles.srow2}>
            <Text style={[styles.b, styles.flex, { color: brand.tealDark }]}>{label}</Text>
            <Switch checked={room.permissions[key]} label={label} onChange={(v) => void setPerm(key, v)} />
          </View>
        ))}
      </Card>

      <Card shadow={brand.rosyDark} style={{ borderColor: brand.rosy }}>
        <Text style={[styles.h3, { color: colors.rosyInk }]}>Danger zone</Text>
        <View style={styles.actions}>
          <Button sm fw={false} variant="ghost" label="Archive gala" onPress={() => setConfirm({ kind: 'archive' })} />
          <Button sm fw={false} label="Delete gala" onPress={() => setConfirm({ kind: 'delete' })} />
        </View>
      </Card>
      {sheets}
    </GalaPage>
  );
}

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '');

function DetailsForm({ room }: { room: RoomDto }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(room.title);
  const [destination, setDestination] = useState(room.destination);
  const [pin, setPin] = useState(room.destinationLat != null && room.destinationLng != null ? { lat: room.destinationLat, lng: room.destinationLng } : null);
  const [startDate, setStartDate] = useState(room.startDate);
  const [endDate, setEndDate] = useState(room.endDate ?? '');
  const [startTime, setStartTime] = useState(hhmm(room.startTime));
  const [endTime, setEndTime] = useState(hhmm(room.endTime));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (busy) return;
    if (!title.trim() || !destination.trim() || !startDate) return toast('Add a title, a destination and a start date.', 'err');
    if (endDate && endDate < startDate) return toast("The end date can't be before the start.", 'err');
    const body: UpdateRoomInput = {
      title: title.trim(),
      destination: destination.trim(),
      ...(pin && { destinationLat: pin.lat, destinationLng: pin.lng }),
      startDate,
      ...(endDate && { endDate }),
      clearTimes: true,
      ...(startTime && { startTime }),
      ...(startTime && endTime && { endTime }),
    };
    setBusy(true);
    try {
      const saved = await updateRoom(room.id, body);
      qc.setQueryData(roomKey(room.id), saved);
      toast('Saved.');
      burst();
    } catch (err) {
      toast(errMsg(err, "Couldn't save your changes."), 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Field label="Title" maxLength={120} value={title} onChangeText={setTitle} />
      <View style={styles.two}>
        <PickerField onSurface label="Start date" mode="date" value={startDate} placeholder="Pick a day" onChange={(v) => v && setStartDate(v)} />
        <PickerField onSurface label="End date (optional)" mode="date" value={endDate} placeholder="Same day" minimumDate={new Date(`${startDate}T00:00:00`)} onChange={setEndDate} />
      </View>
      <View style={styles.two}>
        <PickerField onSurface label="Start time (optional)" mode="time" value={startTime} placeholder="--:--" onChange={setStartTime} />
        <PickerField onSurface label="End time (optional)" mode="time" value={endTime} placeholder="--:--" onChange={setEndTime} />
      </View>
      <LocationField
        label="Destination"
        value={destination}
        placeholder="Search a place, e.g. Baguio City"
        onChange={(v, coords) => {
          setDestination(v);
          setPin(coords ?? null);
        }}
      />
      <Fine>{pin ? 'Pinned on the map in Who’s OTW?.' : 'Pick a suggestion or tap “Pick on map” to pin it on the map.'}</Fine>
      <Button sm fw={false} label="Save changes" busy={busy} onPress={() => void save()} />
    </>
  );
}

function StoredPassword() {
  const [shown, setShown] = useState(false);
  const pw = kv.getItem(PW_KEY);
  if (!pw) return <Text style={[styles.fine, { color: brand.tealDark }]}>••••••••••</Text>;
  return (
    <Text style={[styles.fine, { color: brand.tealDark }]}>
      {shown ? pw : '••••••••••'}{' '}
      <Text onPress={() => setShown((v) => !v)} style={styles.inlineLnk}>
        {shown ? 'Hide' : 'Show'}
      </Text>
    </Text>
  );
}

function PasswordSheet({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (busy) return;
    if (pw.length < 6 || pw.length > 72) return toast('Use 6 to 72 characters.', 'err');
    setBusy(true);
    try {
      await changeGalaPassword(roomId, pw);
      kv.setItem(PW_KEY, pw);
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
          <Button label="Save password" busy={busy} onPress={() => void save()} />
          <Button variant="ghost" label="Cancel" onPress={onClose} />
        </>
      }>
      <Field label="New gala password" autoCapitalize="none" autoCorrect={false} maxLength={72} value={pw} onChangeText={setPw} />
      <Fine>People already in the gala stay in. Anyone coming back on a new device needs the new one.</Fine>
    </Sheet>
  );
}

function NicknameForm({ roomId, current }: { roomId: string; current: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState(current);
  const [busy, setBusy] = useState(false);
  const save = async () => {
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
    <>
      <Field label="Your name" maxLength={60} value={name} onChangeText={setName} />
      <Button sm fw={false} label="Save name" busy={busy} disabled={!name.trim() || name.trim() === current} onPress={() => void save()} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  h3: { fontFamily: font.displaySemi, fontSize: 20 },
  b: { fontFamily: font.bodyHeavy, fontSize: 15 },
  fine: { fontFamily: font.body, fontSize: 14 },
  inlineLnk: { fontFamily: font.bodyHeavy, textDecorationLine: 'underline' },
  srow2: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  mname: { flex: 1, fontFamily: font.bodyHeavy, fontSize: 15 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  two: { flexDirection: 'row', gap: 10 },
});
