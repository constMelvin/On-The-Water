import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/ui';
import type { ChatMessageVM } from '@/lib/api/types';
import type { Tone } from '@/lib/otw/data';
import type { LocalFile } from '@/lib/otw/drive';
import { toast } from '@/lib/otw/feedback';
import { EVERYONE, activeMentionQuery, hasEveryone, insertMention, mentionIdsInBody, type Mentionable } from '@/lib/otw/mentions';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

/** Who a message @mentions, worked out from the draft when it's sent. */
export interface SendMentions {
  ids: string[];
  everyone: boolean;
}

/** A row the @ list can offer: a member, or EVERYONE. */
export interface MentionOption {
  userId: string;
  label: string;
  tone?: Tone;
}

/** Most rows the @ list shows at once. */
const MAX_MENTION_ROWS = 6;

/** Rows for an @-query: "everyone" first while it matches, then members whose nickname starts with it. */
function mentionOptions(query: string, members: MentionOption[]): MentionOption[] {
  const q = query.toLowerCase();
  const out: MentionOption[] = [];
  if (EVERYONE.startsWith(q)) out.push({ userId: EVERYONE, label: EVERYONE });
  for (const m of members) if (m.label.toLowerCase().startsWith(q)) out.push(m);
  return out.slice(0, MAX_MENTION_ROWS);
}

export function Composer({
  onSend,
  onSendPhoto,
  canAddPhotos,
  inputRef,
  replyTo,
  replyName,
  onCancelReply,
  mentionable,
}: {
  onSend: (text: string, mentions: SendMentions) => boolean;
  onSendPhoto: (file: LocalFile, caption: string, mentions: SendMentions) => Promise<boolean>;
  canAddPhotos: boolean;
  inputRef: React.RefObject<TextInput | null>;
  /** The message being replied to (banner above the input), or null. */
  replyTo: ChatMessageVM | null;
  replyName: string;
  onCancelReply: () => void;
  /** Members I can @mention (everyone else in the gala). */
  mentionable: MentionOption[];
}) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState('');
  const [caret, setCaret] = useState(0);
  // Members picked from the @ list for this draft (kept only while their @name is still in it).
  const [picked, setPicked] = useState<Mentionable[]>([]);
  const [photo, setPhoto] = useState<LocalFile | null>(null);
  const [sending, setSending] = useState(false);

  // Replying opens the keyboard, like Messenger.
  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo, inputRef]);

  const query = activeMentionQuery(draft, caret);
  const options = query ? mentionOptions(query.query, mentionable) : [];

  const pick = async (camera: boolean) => {
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return toast('Allow the camera for OTW in your phone settings.', 'err');
    }
    const res = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const a = res.canceled ? null : res.assets[0];
    if (!a) return;
    setPhoto({ uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg', fileName: a.fileName });
    inputRef.current?.focus();
  };

  const pickMention = (o: MentionOption) => {
    if (!query) return;
    const next = insertMention(draft, query.start, caret, o.label);
    setDraft(next.text);
    setCaret(next.caret);
    setPicked((p) => (p.some((x) => x.userId === o.userId) ? p : [...p, { userId: o.userId, label: o.label }]));
    // Put the cursor after the inserted name once the new text is in.
    setTimeout(() => inputRef.current?.setSelection(next.caret, next.caret), 0);
  };

  const mentions = (): SendMentions => ({
    ids: mentionIdsInBody(draft, picked),
    everyone: picked.some((p) => p.userId === EVERYONE) && hasEveryone(draft),
  });

  const reset = () => {
    setDraft('');
    setCaret(0);
    setPicked([]);
  };

  const send = async () => {
    if (sending) return;
    if (photo) {
      setSending(true);
      const ok = await onSendPhoto(photo, draft, mentions());
      setSending(false);
      if (ok) {
        setPhoto(null);
        reset();
      }
    } else if (onSend(draft, mentions())) {
      reset();
    }
  };

  return (
    <View style={styles.composerWrap}>
      {options.length ? (
        <View style={[styles.mentions, { backgroundColor: colors.surface, borderColor: colors.line }]} accessibilityLabel="Mention someone">
          {options.map((o) => (
            <Pressable
              key={o.userId}
              accessibilityRole="button"
              accessibilityLabel={o.userId === EVERYONE ? `Mention everyone, notify all ${mentionable.length + 1} members` : `Mention ${o.label}`}
              onPress={() => pickMention(o)}
              style={({ pressed }) => [styles.mentionRow, pressed && { backgroundColor: colors.surface2 }]}>
              {o.userId === EVERYONE ? (
                <>
                  <View style={styles.mentionAll}>
                    <Icon name="users" size={16} color={brand.tealDark} />
                  </View>
                  <Text style={[styles.mentionName, { color: colors.text }]}>@everyone</Text>
                  <Text style={[styles.mentionSub, { color: colors.text }]}>Notify all {mentionable.length + 1} members</Text>
                </>
              ) : (
                <>
                  <Avatar name={o.label} tone={o.tone} size={28} userId={o.userId} />
                  <Text style={[styles.mentionName, { color: colors.text }]}>{o.label}</Text>
                </>
              )}
            </Pressable>
          ))}
        </View>
      ) : null}
      {replyTo ? (
        <View style={[styles.replyBar, { backgroundColor: colors.surface2 }]}>
          <Icon name="reply" size={18} color={colors.text} />
          <View style={styles.flex}>
            <Text style={[styles.replyName, { color: colors.text }]}>Replying to {replyName}</Text>
            <Text numberOfLines={1} style={[styles.replyText, { color: colors.text }]}>
              {replyTo.body || (replyTo.photo ? 'Photo' : '…')}
            </Text>
          </View>
          <IconButton icon="x" size={18} label="Cancel reply" onPress={onCancelReply} />
        </View>
      ) : null}
      {photo ? (
        <View style={[styles.attach, { backgroundColor: colors.surface2 }]}>
          <Image source={{ uri: photo.uri }} style={styles.attachImg} />
          <Text style={[styles.attachText, { color: colors.text }]}>{sending ? 'Sending to the chat and the Gala Dump…' : 'Goes to the chat and the Gala Dump.'}</Text>
          {!sending ? <IconButton icon="x" size={18} label="Remove photo" onPress={() => setPhoto(null)} /> : null}
        </View>
      ) : null}
      <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        {canAddPhotos ? (
          <>
            <IconButton icon="image" label="Add a photo" onPress={() => void pick(false)} />
            <IconButton icon="camera" label="Take a photo" onPress={() => void pick(true)} />
          </>
        ) : null}
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={setDraft}
          onSelectionChange={(e) => setCaret(e.nativeEvent.selection.end)}
          editable={!sending}
          maxLength={1000}
          placeholder={photo ? 'Add a caption…' : 'Say something to the gala…'}
          placeholderTextColor={colors.text + '80'}
          accessibilityLabel={photo ? 'Caption' : 'Message'}
          onSubmitEditing={() => void send()}
          returnKeyType="send"
          blurOnSubmit={false}
          style={[styles.input, { color: colors.text, backgroundColor: colors.fieldBg }]}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Send" disabled={sending} onPress={() => void send()} style={styles.send}>
          <Icon name="send" size={18} color={brand.cream} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  composerWrap: { gap: 6 },
  mentions: { borderWidth: 3, borderRadius: 20, padding: 4 },
  mentionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 14 },
  mentionAll: { width: 28, height: 28, borderRadius: 14, backgroundColor: brand.zest, alignItems: 'center', justifyContent: 'center' },
  mentionName: { fontFamily: font.bodyHeavy, fontSize: 15 },
  mentionSub: { marginLeft: 'auto', fontFamily: font.bodyBold, fontSize: 12, opacity: 0.7 },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingVertical: 6, paddingLeft: 12, paddingRight: 4, borderLeftWidth: 4, borderLeftColor: brand.teal },
  replyName: { fontFamily: font.bodyHeavy, fontSize: 13 },
  replyText: { fontFamily: font.bodyBold, fontSize: 13, opacity: 0.8 },
  attach: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, padding: 8 },
  attachImg: { width: 48, height: 48, borderRadius: 10 },
  attachText: { flex: 1, fontFamily: font.bodyBold, fontSize: 13 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 3, borderRadius: 999, padding: 4 },
  input: { flex: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, fontFamily: font.bodyBold, fontSize: 16 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: brand.rosy, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: brand.rosyDark },
});
