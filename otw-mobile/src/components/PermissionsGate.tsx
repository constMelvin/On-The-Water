import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Linking, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';
import { Button, IconBlob } from './ui';
import { burst } from '@/lib/otw/feedback';
import { kv } from '@/lib/otw/kv';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

/**
 * First open of the app: explains every permission OTW uses and lets the person allow each one (or skip; every
 * feature asks again when it is used). Shown once per install (`otw:permissions-asked`). OTW works without any of
 * them: location is never shared until the person turns sharing on in Who's OTW?.
 */
const ASKED_KEY = 'otw:permissions-asked';

type Status = 'unknown' | 'granted' | 'denied';
type Key = 'location' | 'camera' | 'photos' | 'notifications';

const ITEMS: { key: Key; icon: IconName; title: string; why: string }[] = [
  { key: 'location', icon: 'pin', title: 'Location', why: 'For Who’s OTW? on gala day and the Halfway Checker. Only shared when you turn sharing on.' },
  { key: 'camera', icon: 'camera', title: 'Camera', why: 'Take photos for the chat and the Gala Dump.' },
  { key: 'photos', icon: 'image', title: 'Photos and videos', why: 'Pick photos for the Gala Dump, the chat and your profile.' },
  { key: 'notifications', icon: 'bell', title: 'Notifications', why: 'Know when your gala changes, someone nudges you, or voting opens.' },
];

const toStatus = (granted: boolean, canAskAgain: boolean): Status => (granted ? 'granted' : canAskAgain ? 'unknown' : 'denied');

async function check(key: Key): Promise<Status> {
  try {
    if (key === 'location') {
      const r = await Location.getForegroundPermissionsAsync();
      return toStatus(r.granted, r.canAskAgain);
    }
    if (key === 'camera') {
      const r = await ImagePicker.getCameraPermissionsAsync();
      return toStatus(r.granted, r.canAskAgain);
    }
    if (key === 'photos') {
      const r = await ImagePicker.getMediaLibraryPermissionsAsync();
      return toStatus(r.granted, r.canAskAgain);
    }
    const r = await Notifications.getPermissionsAsync();
    return toStatus(r.granted, r.canAskAgain);
  } catch {
    return 'unknown';
  }
}

async function request(key: Key): Promise<Status> {
  try {
    if (key === 'location') {
      const r = await Location.requestForegroundPermissionsAsync();
      return toStatus(r.granted, r.canAskAgain);
    }
    if (key === 'camera') {
      const r = await ImagePicker.requestCameraPermissionsAsync();
      return toStatus(r.granted, r.canAskAgain);
    }
    if (key === 'photos') {
      const r = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return toStatus(r.granted, r.canAskAgain);
    }
    const r = await Notifications.requestPermissionsAsync();
    return toStatus(r.granted, r.canAskAgain);
  } catch {
    return 'denied';
  }
}

/** Draws the permissions screen over the app on the very first open. */
export function PermissionsGate() {
  const [open, setOpen] = useState(() => kv.getItem(ASKED_KEY) !== '1');
  if (!open) return null;
  return (
    <PermissionsScreen
      onDone={() => {
        kv.setItem(ASKED_KEY, '1');
        setOpen(false);
      }}
    />
  );
}

function PermissionsScreen({ onDone }: { onDone: () => void }) {
  const { colors } = useTheme();
  const [status, setStatus] = useState<Record<Key, Status>>({ location: 'unknown', camera: 'unknown', photos: 'unknown', notifications: 'unknown' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void Promise.all(ITEMS.map(async (i) => [i.key, await check(i.key)] as const)).then((rows) => {
      if (alive) setStatus(Object.fromEntries(rows) as Record<Key, Status>);
    });
    return () => {
      alive = false;
    };
  }, []);

  const ask = async (key: Key) => {
    if (status[key] === 'denied') return void Linking.openSettings();
    setStatus((s) => ({ ...s, [key]: 'unknown' }));
    const next = await request(key);
    setStatus((s) => ({ ...s, [key]: next }));
  };

  /** Asks for everything not decided yet, one system prompt after another. */
  const allowAll = async () => {
    setBusy(true);
    for (const i of ITEMS) {
      if (status[i.key] === 'unknown') {
        const next = await request(i.key);
        setStatus((s) => ({ ...s, [i.key]: next }));
      }
    }
    setBusy(false);
    burst();
    onDone();
  };

  const allDecided = ITEMS.every((i) => status[i.key] !== 'unknown');

  return (
    <Modal visible animationType="fade" onRequestClose={onDone} statusBarTranslucent>
      <SafeAreaView style={[styles.page, { backgroundColor: colors.secBlossom }]}>
        <ScrollView contentContainerStyle={styles.inner}>
          <IconBlob name="sparkle" index={1} size={88} iconSize={40} />
          <Text style={[styles.h1, { color: colors.secInk }]}>Bago tayo mag-gala…</Text>
          <Text style={[styles.sub, { color: colors.secInk }]}>
            OTW works better with a few permissions. You choose. You can change any of them later in your phone settings.
          </Text>

          {ITEMS.map((i) => {
            const st = status[i.key];
            return (
              <View key={i.key} style={styles.cardWrap}>
                <View style={[styles.cardShadow, { backgroundColor: st === 'granted' ? brand.tealDark : colors.line }]} />
                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                  <View style={[styles.ico, { backgroundColor: st === 'granted' ? brand.teal : colors.surface2 }]}>
                    <Icon name={i.icon} size={22} color={st === 'granted' ? brand.cream : brand.rosy} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={[styles.title, { color: colors.text }]}>{i.title}</Text>
                    <Text style={[styles.why, { color: colors.text }]}>{i.why}</Text>
                  </View>
                  {st === 'granted' ? (
                    <View style={styles.ok} accessibilityLabel={`${i.title} allowed`}>
                      <Icon name="check" size={18} color={brand.cream} />
                    </View>
                  ) : (
                    <Button
                      sm
                      fw={false}
                      variant={st === 'denied' ? 'cream' : 'teal'}
                      label={st === 'denied' ? 'Settings' : 'Allow'}
                      accessibilityLabel={st === 'denied' ? `Open settings for ${i.title}` : `Allow ${i.title}`}
                      onPress={() => void ask(i.key)}
                    />
                  )}
                </View>
              </View>
            );
          })}

          {allDecided ? (
            <Button variant="zest" icon="arrowr" label="Tara, let’s go!" onPress={onDone} />
          ) : (
            <Button label="Allow all" busy={busy} onPress={() => void allowAll()} />
          )}
          <Text accessibilityRole="button" onPress={onDone} style={[styles.skip, { color: colors.secInk }]}>
            Maybe later
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1 },
  inner: { padding: 20, gap: 14, alignItems: 'stretch' },
  h1: { fontFamily: font.display, fontSize: 32, textAlign: 'center', marginTop: 4 },
  sub: { fontFamily: font.bodyBold, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  cardWrap: { paddingBottom: 5 },
  cardShadow: { position: 'absolute', left: 0, right: 0, top: 5, bottom: 0, borderRadius: 22 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, padding: 14 },
  ico: { width: 44, height: 44, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.displaySemi, fontSize: 17 },
  why: { fontFamily: font.body, fontSize: 13, lineHeight: 18, opacity: 0.9 },
  ok: { width: 34, height: 34, borderRadius: 17, backgroundColor: brand.teal, alignItems: 'center', justifyContent: 'center' },
  skip: { fontFamily: font.bodyHeavy, fontSize: 15, textAlign: 'center', textDecorationLine: 'underline', paddingVertical: 6 },
});
