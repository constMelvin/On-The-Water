import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { LockableScrollView } from './LockableScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from './ui';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Bottom sheet (the web's Sheet on mobile widths): grab bar, title + close, scrolling body, optional footer.
 * Closes on the scrim, the close button and the Android back button.
 */
export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.fill}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={[styles.scrim, { backgroundColor: colors.scrim }]} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: 16 + insets.bottom }]} accessibilityViewIsModal>
          <View style={[styles.grab, { backgroundColor: colors.line }]} />
          <View style={styles.head}>
            <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
              {title}
            </Text>
            <IconButton icon="x" label="Close" onPress={onClose} />
          </View>
          <LockableScrollView style={styles.body} contentContainerStyle={styles.bodyInner} keyboardShouldPersistTaps="handled">
            {children}
          </LockableScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.55 },
  sheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 10, maxHeight: '90%' },
  grab: { alignSelf: 'center', width: 48, height: 6, borderRadius: 3, marginBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1, fontFamily: font.displaySemi, fontSize: 22 },
  body: { flexGrow: 0 },
  bodyInner: { gap: 14, paddingVertical: 12 },
  footer: { gap: 10, paddingTop: 8 },
});
