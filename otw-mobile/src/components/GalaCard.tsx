import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { MyRoomDto } from '@/api/types';
import { Icon, type IconName } from './Icon';
import { Button, Card, Tag, type TagVariant } from './ui';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

export type CardGroup = 'ongoing' | 'upcoming' | 'done' | 'draw';

/** Status tag per group (same as otw-client/src/components/me/GalaCard.tsx). */
const STAT: Record<CardGroup, [label: string, variant: TagVariant, icon: IconName]> = {
  ongoing: ['Ongoing', 'l-there', 'burst'],
  upcoming: ['Upcoming', 'st-m', 'calendar'],
  done: ['Completed', 'st-g', 'check'],
  draw: ['Mga Drawing', 'cream', 'notepad'],
};

/** "14" + "Nov" from yyyy-mm-dd (local date, no timezone shift). */
function dateChip(iso: string | null): { day: number; mon: string } | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { day: d, mon: new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short' }) };
}

/** `action` undefined = the default Open / Recap button; null = no button; anything else replaces it. */
export function GalaCard({ room, group, action }: { room: MyRoomDto; group: CardGroup; action?: React.ReactNode }) {
  const { colors } = useTheme();
  const [label, variant, icon] = STAT[group];
  const leader = room.myRole === 'HOST';
  // Group galas keep the yellow date chip; Couple Mode galas get a pink one and a "Couple" tag.
  const couple = room.type === 'COUPLE';
  const chip = dateChip(room.startDate);
  const people = room.memberCount;
  const open = () => router.push({ pathname: '/gala/[roomId]', params: { roomId: room.roomId } });

  return (
    <Card style={styles.card} onPress={open}>
      <View style={styles.top}>
        <View style={[styles.gdate, { backgroundColor: couple ? brand.blossom : brand.zest }]}>
          {chip ? (
            <>
              <Text style={styles.day}>{chip.day}</Text>
              <Text style={styles.mon}>{chip.mon}</Text>
            </>
          ) : (
            <Text style={styles.mon}>TBD</Text>
          )}
        </View>
        <View style={styles.gcb}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {room.title}
          </Text>
          <View style={styles.meta}>
            <Icon name="pin" size={14} color={colors.text} />
            <Text style={[styles.metaText, { color: colors.text }]} numberOfLines={1}>
              {room.destination}
            </Text>
            <Icon name="users" size={14} color={colors.text} />
            <Text style={[styles.metaText, { color: colors.text }]}>
              {people} {people === 1 ? 'person' : 'people'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.tags}>
        <Tag variant={variant} icon={icon}>
          {label}
        </Tag>
        <Tag variant={leader ? 'zest' : 'blossom'} icon={leader ? 'crown' : 'user'}>
          {leader ? 'Leader' : 'Member'}
        </Tag>
        {couple ? (
          <Tag variant="rosy" icon="heart">
            Couple
          </Tag>
        ) : null}
      </View>
      {action === undefined ? (
        <Button
          sm
          variant={group === 'done' ? 'cream' : 'teal'}
          label={group === 'done' ? 'Recap' : 'Open'}
          accessibilityLabel={`${group === 'done' ? 'Recap of' : 'Open'} ${room.title}`}
          onPress={group === 'done' ? () => router.push(`/gala/${room.roomId}/recap`) : open}
        />
      ) : (
        action
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  gdate: { width: 60, height: 60, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  day: { fontFamily: font.displaySemi, fontSize: 24, lineHeight: 26, color: brand.tealDark },
  mon: { fontFamily: font.bodyHeavy, fontSize: 13, lineHeight: 15, color: brand.tealDark },
  gcb: { flex: 1, gap: 4 },
  title: { fontFamily: font.displaySemi, fontSize: 20, lineHeight: 23 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  metaText: { fontFamily: font.bodyHeavy, fontSize: 14, flexShrink: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
