import { router, type Href } from 'expo-router';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Icon, type IconName } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Button, Fine, blob } from '@/components/ui';
import { useGala } from '@/lib/otw/gala-store';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { MORE, galaHref } from './nav';
import { useCopyCode } from './useCopyCode';

/** Renders whichever shell sheet is open (More, Share). Same items and copy as the web. */
export function GalaSheets() {
  const { sheet, closeSheet, gala, roomId, me, myUserId } = useGala();
  const { colors } = useTheme();
  const copyCode = useCopyCode();

  if (sheet === 'more') {
    const go = (href: Href) => {
      closeSheet();
      router.navigate(href);
    };
    const cell = (key: string, label: string, i: number, onPress: () => void, icon?: IconName) => (
      <Pressable key={key} accessibilityRole="button" onPress={onPress} style={styles.mo}>
        {icon ? (
          <View style={[styles.ico, blob(i, 56), { backgroundColor: colors.surface2 }]}>
            <Icon name={icon} size={24} color={brand.rosy} />
          </View>
        ) : (
          <View style={styles.ico}>
            <Avatar name={me || '?'} userId={myUserId} size={44} />
          </View>
        )}
        <Text style={[styles.moText, { color: colors.text }]}>{label}</Text>
      </Pressable>
    );
    return (
      <Sheet title="More" onClose={closeSheet}>
        <View style={styles.morep}>
          {MORE.map((d, i) => cell(d.seg, d.label, i, () => go(galaHref(roomId!, d.seg) as Href), d.icon))}
          {cell('mygalas', 'My Galas', MORE.length, () => go('/'), 'calendar')}
          {cell('profile', 'Profile', MORE.length + 1, () => go('/profile'))}
          {cell('plan', 'Plan a Gala', MORE.length + 2, () => go('/create'), 'plus')}
          {cell('join', 'Join a Gala', MORE.length + 3, () => go('/join'), 'enter')}
        </View>
      </Sheet>
    );
  }

  if (sheet === 'share') {
    const text = `G tayo? Join our gala “${gala.title}”.\nGala code: ${gala.code}`;
    return (
      <Sheet
        title="Share Gala"
        onClose={closeSheet}
        footer={
          <>
            <Button variant="teal" icon="copy" label="Copy code" onPress={copyCode} />
            <Button variant="zest" icon="share" label="Share…" onPress={() => void Share.share({ message: text })} />
          </>
        }>
        <Fine>Send this to your GC. We never include the password.</Fine>
        <View style={[styles.sharemsg, { backgroundColor: colors.surface2 }]}>
          <Text style={[styles.shareText, { color: colors.text }]}>
            G tayo? Join our gala “{gala.title}”.{'\n'}Gala code: <Text style={{ fontFamily: font.bodyHeavy }}>{gala.code}</Text>
          </Text>
        </View>
      </Sheet>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  morep: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  mo: { width: '33.33%', alignItems: 'center', gap: 6 },
  ico: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  moText: { fontFamily: font.bodyHeavy, fontSize: 14, textAlign: 'center' },
  sharemsg: { borderRadius: 22, paddingVertical: 12, paddingHorizontal: 16 },
  shareText: { fontFamily: font.body, fontSize: 16, lineHeight: 23 },
});
