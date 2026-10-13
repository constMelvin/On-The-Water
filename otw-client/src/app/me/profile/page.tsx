'use client';

import { useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { Avatar, Button, Card, Icon, PageHead, SegmentedControl, Tag } from '@/components/otw';
import { setTheme, useTheme, type ThemeChoice } from '@/lib/otw/theme';
import { MeShell } from '@/components/me/MeShell';
import { ProfilePreview } from '@/components/me/ProfilePreview';
import styles from '@/components/me/profile.module.css';
import { useAccount } from '@/lib/auth/session';
import type { Tone } from '@/lib/otw/data';
import { burstEl, toast } from '@/lib/otw/feedback';
import {
  NICKNAME_MAX,
  STATUS_MAX,
  TONES,
  profilePhotoUrl,
  saveProfile,
  syncProfile,
  uploadProfilePhoto,
  useProfile,
  type Profile,
} from '@/lib/otw/profile';
import { PhotoError, processPhoto } from '@/lib/otw/profile-photo';

const TONE_LABEL: Record<Tone, string> = { rosy: 'Rosy', teal: 'Teal', zest: 'Zest', blossom: 'Blossom' };

/**
 * Profile: photo, nickname, avatar colour and a one-line status, with a live preview beside the form. Saved to the
 * account (GET/PUT /me/profile) and cached on this device (lib/otw/profile.ts); the photo goes to Google Drive on Save. Other members see the photo and colour
 * in their gala (GET /rooms/{id}/members/profiles, within about a minute); the gala nickname is changed in Gala Settings.
 */
export default function ProfilePage() {
  const { id, profile } = useProfile();
  const account = useAccount();

  return (
    <MeShell active="profile">
      <PageHead
        title="Your profile"
        sub="Make it yours. Konting glow-up lang."
        tag={<Tag icon="user">Profile</Tag>}
      />
      {id === undefined || account.signedIn === undefined ? (
        <div className={styles.layout}>
          <div className={`sk ${styles.skel}`} role="status" aria-busy="true" aria-label="Loading your profile" />
          <div className={`sk ${styles.skel}`} aria-hidden="true" />
        </div>
      ) : (
        // Remount when the account (or the first read) changes, so the form starts from what's saved.
        <ProfileEditor key={id ?? 'none'} initial={profile} accountName={account.displayName} />
      )}
    </MeShell>
  );
}

function ProfileEditor({ initial, accountName }: { initial: Profile | null; accountName: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const theme = useTheme();
  const [nickname, setNickname] = useState(initial?.nickname ?? '');
  const [status, setStatus] = useState(initial?.status ?? '');
  const [color, setColor] = useState<Tone>(initial?.color ?? 'rosy');
  // A colour is only saved once the person picked one (or already had one saved).
  const [colorPicked, setColorPicked] = useState(!!initial?.color);
  // The saved photo's Drive id, and a newly picked photo (a data URL) that goes up to Drive on Save.
  const [photoFileId, setPhotoFileId] = useState<string | undefined>(initial?.photoFileId);
  const [newPhoto, setNewPhoto] = useState<string | undefined>();
  const photo = newPhoto ?? profilePhotoUrl(photoFileId);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  // Bumps on every save so the preview card pops.
  const [popKey, setPopKey] = useState(0);

  const shownName = nickname.trim() || accountName || '?';

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // so picking the same file again still fires
    if (!file) return;
    setError('');
    setWorking(true);
    try {
      setNewPhoto(await processPhoto(file));
    } catch (err) {
      setError(err instanceof PhotoError ? err.message : 'Hindi mabasa ‘yang photo. Try another one.');
    } finally {
      setWorking(false);
    }
  };

  const save = async (e: MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const base: Profile = { nickname, status, color: colorPicked ? color : undefined, photoFileId };
    if (newPhoto) {
      // A new photo is only usable once the account has it (the server makes the Drive file viewable), so upload
      // and sync first, then keep it on this device.
      setWorking(true);
      try {
        const fileId = await uploadProfilePhoto(newPhoto);
        const next: Profile = { ...base, nickname: nickname.trim(), status: status.trim(), photoFileId: fileId };
        if (!(await syncProfile(next))) {
          toast("Couldn't save your new photo. Check your connection and try again.", 'err');
          return;
        }
        setPhotoFileId(fileId);
        setNewPhoto(undefined);
        saveProfile(next);
        burstEl(btn);
        setPopKey((k) => k + 1);
        toast('Profile saved.');
      } catch (err) {
        toast(err instanceof Error ? err.message : "That photo didn't upload. Try again.", 'err');
      } finally {
        setWorking(false);
      }
      return;
    }
    const next = base;
    if (!saveProfile(next)) {
      toast("Couldn't save your profile on this device.", 'err');
      return;
    }
    burstEl(btn);
    setPopKey((k) => k + 1);
    // Everything shows right away from the local copy; then the account copy follows.
    const synced = await syncProfile({ ...next, nickname: next.nickname.trim(), status: next.status.trim() });
    if (synced) toast('Profile saved.');
    else toast("Saved on this device. Hindi pa na-sync sa account mo, try again later.", 'err');
  };

  return (
    <div className={styles.layout}>
      <div className={styles.preview}>
        <ProfilePreview name={shownName} status={status} tone={color} photo={photo} popKey={popKey} />
      </div>

      <Card className={styles.card}>
        {/* ---- your look ---- */}
        <section className={styles.sec} aria-labelledby="pf-look">
          <h3 id="pf-look" className={styles.st}>
            Your look
          </h3>
          <div className={styles.photoRow}>
            <div className={styles.bigwrap}>
              <Avatar name={shownName} tone={color} photo={photo} size={88} />
              <button
                type="button"
                className={styles.cam}
                aria-label={photo ? 'Change photo' : 'Add a photo'}
                disabled={working}
                onClick={() => fileRef.current?.click()}
              >
                <Icon name="camera" size={18} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void onFile(e)} />
            </div>
            <div className={styles.photoBtns}>
              <Button variant="teal" sm disabled={working} onClick={() => fileRef.current?.click()}>
                <Icon name="upload" size={16} /> {photo ? 'Change photo' : 'Upload a photo'}
              </Button>
              {photo && (
                <Button
                  variant="ghost"
                  sm
                  disabled={working}
                  onClick={() => {
                    setNewPhoto(undefined);
                    setPhotoFileId(undefined);
                  }}
                >
                  Remove photo
                </Button>
              )}
            </div>
          </div>
          {error && (
            <p className={styles.err} role="alert">
              {error}
            </p>
          )}

          <div className="fl" role="radiogroup" aria-label="Avatar color">
            Avatar color
            <div className={styles.swatches}>
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={color === t}
                  aria-label={TONE_LABEL[t]}
                  className={`${styles.sw} c-${t}${color === t ? ` ${styles.swOn}` : ''}`}
                  onClick={() => {
                    setColor(t);
                    setColorPicked(true);
                  }}
                >
                  {color === t && <Icon name="check" size={18} />}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ---- about you ---- */}
        <section className={styles.sec} aria-labelledby="pf-about">
          <h3 id="pf-about" className={styles.st}>
            About you
          </h3>
          <label className="fl">
            Nickname
            <input
              className="in"
              value={nickname}
              maxLength={NICKNAME_MAX}
              placeholder={accountName || 'Ano’ng itatawag sa’yo?'}
              onChange={(e) => setNickname(e.target.value)}
            />
          </label>
          <label className="fl">
            Status (optional)
            <input
              className="in"
              value={status}
              maxLength={STATUS_MAX}
              placeholder="Always late pero sumusipot"
              onChange={(e) => setStatus(e.target.value)}
            />
            <span className={styles.counter}>
              {status.length}/{STATUS_MAX}
            </span>
          </label>
        </section>

        {/* ---- theme ---- */}
        <section className={styles.sec} aria-labelledby="pf-theme">
          <h3 id="pf-theme" className={styles.st}>
            Theme
          </h3>
          <SegmentedControl<ThemeChoice>
            label="Theme"
            value={theme.choice}
            onChange={setTheme}
            options={[
              { value: 'system', label: 'Auto' },
              { value: 'light', label: 'Light', icon: 'sun' },
              { value: 'dark', label: 'Dark', icon: 'moon' },
            ]}
          />
          <span className="fine">Auto follows your device. It applies right away and is remembered on this device.</span>
        </section>

        <p className={`fine ${styles.fine}`}>
          Saved to your account, so it follows you to other devices. Other people still see your initial for now. To
          change your name inside a gala, use that gala&apos;s Settings.
        </p>

        <div className={styles.actions}>
          <Button variant="zest" onClick={(e) => void save(e)} disabled={working}>
            <Icon name="check" size={20} /> Save
          </Button>
        </div>
      </Card>
    </div>
  );
}
