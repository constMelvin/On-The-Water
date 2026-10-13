/**
 * OTW design system for React Native, ported from otw-client/src/styles/otw.css (.btn, .in, .fl, .ferr, .card,
 * .tag, .seg, .ico, .phead). Solid offset shadows are drawn as a layer behind the face (RN has no hard
 * box-shadow), so they never turn grey.
 */
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';
import { LOC, ST, type AttendanceKey, type LocationKey } from '@/lib/otw/data';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand, type Theme } from '@/theme/tokens';

/* ---------------- page ---------------- */

export type Section = 'page' | 'rosy' | 'zest' | 'teal' | 'blossom' | 'tdark';

/** Background + default text colour of a full-bleed section (.bg-* in otw.css). */
export function sectionColors(section: Section, c: Theme): { bg: string; ink: string } {
  switch (section) {
    case 'rosy':
      return { bg: c.secRosy, ink: brand.cream };
    case 'zest':
      return { bg: c.secZest, ink: c.secInk };
    case 'teal':
      return { bg: c.secTeal, ink: brand.cream };
    case 'blossom':
      return { bg: c.secBlossom, ink: c.secInk };
    case 'tdark':
      return { bg: c.secTdark, ink: brand.cream };
    default:
      return { bg: c.bgPage, ink: c.text };
  }
}

/** Page wrapper: section background, safe area, scrolls by default. */
export function Screen({
  children,
  scroll = true,
  section = 'page',
  style,
  edges = ['top', 'left', 'right'],
}: {
  children: ReactNode;
  scroll?: boolean;
  section?: Section;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  const { colors } = useTheme();
  const { bg } = sectionColors(section, colors);
  const inner = [styles.screenInner, style];
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: bg }]} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={inner} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

/** h2 + sub, with an optional tag above (PageHead on the web). */
export function PageHead({ title, sub, tag, color }: { title: string; sub?: string; tag?: ReactNode; color?: string }) {
  const { colors } = useTheme();
  const ink = color ?? colors.text;
  return (
    <View style={styles.phead}>
      {tag}
      <Text style={[styles.h2, { color: ink }]}>{title}</Text>
      {sub ? <Text style={[styles.sub, { color: ink }]}>{sub}</Text> : null}
    </View>
  );
}

export function Title({ children, style, ...rest }: TextProps & { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text {...rest} style={[styles.h2, { color: colors.text }, style]}>
      {children}
    </Text>
  );
}

export function H3({ children, style, ...rest }: TextProps & { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text {...rest} style={[styles.h3, { color: colors.text }, style]}>
      {children}
    </Text>
  );
}

export function Body({ children, style, muted, ...rest }: TextProps & { children: ReactNode; muted?: boolean }) {
  const { colors } = useTheme();
  return (
    <Text {...rest} style={[styles.body, { color: colors.text, opacity: muted ? 0.85 : 1 }, style]}>
      {children}
    </Text>
  );
}

/** Small print (.fine). */
export function Fine({ children, style, ...rest }: TextProps & { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text {...rest} style={[styles.fine, { color: colors.text }, style]}>
      {children}
    </Text>
  );
}

/** Underlined text button (.lnk). */
export function Lnk({ label, onPress, color, style }: { label: string; onPress: () => void; color?: string; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return (
    <Text accessibilityRole="link" onPress={onPress} suppressHighlighting style={[styles.lnk, { color: color ?? colors.text }, style]}>
      {label}
    </Text>
  );
}

/* ---------------- buttons ---------------- */

export type ButtonVariant = 'rosy' | 'zest' | 'teal' | 'cream' | 'ghost';

function variantColors(v: ButtonVariant, c: Theme) {
  switch (v) {
    case 'zest':
      return { bg: brand.zest, sh: brand.zestDark, fg: brand.tealDark };
    case 'teal':
      return { bg: brand.teal, sh: brand.tealDark, fg: brand.cream };
    case 'cream':
      return { bg: c.surface, sh: c.line, fg: c.text };
    case 'ghost':
      return { bg: 'transparent', sh: 'transparent', fg: c.text };
    default:
      return { bg: brand.rosy, sh: brand.rosyDark, fg: brand.cream };
  }
}

/**
 * Pill button with the OTW squish: a solid offset shadow in its own darker tone (7px, sm 4px) that the face
 * presses down into (5px, sm 3px). Never rectangular, never a grey shadow.
 */
export function Button({
  label,
  onPress,
  variant = 'rosy',
  icon,
  sm,
  fw = true,
  disabled,
  busy,
  color,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  sm?: boolean;
  /** Full width (default). False sizes the pill to its label. */
  fw?: boolean;
  disabled?: boolean;
  busy?: boolean;
  /** Ghost only: text + border colour (defaults to the theme text). */
  color?: string;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const t = variantColors(variant, colors);
  const fg = variant === 'ghost' && color ? color : t.fg;
  const depth = variant === 'ghost' ? 0 : sm ? 4 : 7;
  const press = variant === 'ghost' ? 2 : sm ? 3 : 5;
  const off = disabled || busy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      disabled={off}
      onPress={onPress}
      style={[{ paddingBottom: depth, opacity: off ? 0.5 : 1 }, fw ? styles.fw : styles.fit]}>
      {({ pressed }) => (
        <>
          {depth ? <View style={[styles.btnShadow, { top: depth, backgroundColor: t.sh }]} /> : null}
          <View
            style={[
              sm ? styles.btnSm : styles.btn,
              { backgroundColor: t.bg, transform: [{ translateY: pressed ? press : 0 }] },
              variant === 'ghost' && { borderWidth: 3, borderColor: fg, paddingVertical: sm ? 7 : 12 },
            ]}>
            {busy ? (
              <ActivityIndicator color={fg} />
            ) : (
              <>
                {icon ? <Icon name={icon} size={sm ? 16 : 20} color={fg} /> : null}
                <Text style={[sm ? styles.btnLabelSm : styles.btnLabel, { color: fg }]}>{label}</Text>
              </>
            )}
          </View>
        </>
      )}
    </Pressable>
  );
}

/** Round icon-only button (.ibtn). */
export function IconButton({ icon, label, onPress, color, size = 22 }: { icon: IconName; label: string; onPress: () => void; color?: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.ibtn, pressed && { backgroundColor: colors.surface2 }]}>
      <Icon name={icon} size={size} color={color ?? colors.text} />
    </Pressable>
  );
}

/* ---------------- cards ---------------- */

/** .card: surface fill, 26px radius, solid 6px offset shadow (line colour unless `shadow` is given). */
export function Card({
  children,
  onPress,
  style,
  shadow,
  bg,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  shadow?: string;
  bg?: string;
}) {
  const { colors } = useTheme();
  const fill = bg ?? colors.surface;
  const body = (pressed: boolean) => (
    <>
      <View style={[styles.cardShadow, { backgroundColor: shadow ?? colors.line }]} />
      <View style={[styles.card, { backgroundColor: fill, borderColor: fill }, pressed && styles.cardPressed, style]}>{children}</View>
    </>
  );
  if (!onPress) return <View style={styles.cardWrap}>{body(false)}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.cardWrap}>
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

/* ---------------- fields ---------------- */

/** .fl label + .in input: teal 3px border, 20px radius, 4px line shadow; rosy while focused or wrong. */
export function Field({
  label,
  error,
  hint,
  password,
  look = 'teal',
  code,
  ...input
}: TextInputProps & {
  label: string;
  /** true marks the field wrong; a string also shows it under the field (instead of the hint). */
  error?: boolean | string;
  hint?: string;
  password?: boolean;
  /** 'teal' = .in (teal border); 'line' = the Join / Plan flow inputs (line border, 18px radius). */
  look?: 'teal' | 'line';
  /** Big centred Fredoka text for a gala code (.codeInput). */
  code?: boolean;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  const bad = !!error;
  const hot = focused || bad;
  const rest = look === 'line' ? colors.line : brand.teal;
  const radius = look === 'line' ? 18 : 20;
  return (
    <View style={styles.fl}>
      <Text style={[styles.flLabel, { color: colors.text }]}>{label}</Text>
      <View style={{ paddingBottom: 4 }}>
        <View style={[styles.inShadow, { borderRadius: radius, backgroundColor: hot ? brand.rosyDark : colors.line }]} />
        <TextInput
          placeholderTextColor={colors.text + '80'}
          {...input}
          secureTextEntry={password ? !show : input.secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={[
            styles.in,
            { borderRadius: radius },
            code && styles.inCode,
            password && styles.inPassword,
            { backgroundColor: colors.fieldBg, color: colors.text, borderColor: bad ? brand.rosyDark : focused ? brand.rosy : rest },
          ]}
        />
        {password ? (
          <View style={styles.eye}>
            <IconButton icon={show ? 'eyeoff' : 'eye'} label={show ? 'Hide password' : 'Show password'} onPress={() => setShow((v) => !v)} />
          </View>
        ) : null}
      </View>
      {typeof error === 'string' && error ? (
        <Text accessibilityRole="alert" style={[styles.fieldErr, { color: colors.rosyInk }]}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.hint, { color: look === 'line' ? brand.teal : colors.text }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

/** .ferr: alert icon + message in a rosy-bordered box. Renders nothing without a message. */
export function ErrorNote({ message, children }: { message?: string | null; children?: ReactNode }) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={[styles.ferr, { backgroundColor: colors.surface }]}>
      <Icon name="alert" size={18} color={colors.rosyInk} />
      <Text style={[styles.ferrText, { color: colors.rosyInk }]}>
        {message}
        {children}
      </Text>
    </View>
  );
}

/* ---------------- tags, segmented control, icon blob ---------------- */

/** Attendance badge: icon + text, never colour alone (web StatusBadge). */
export function StatusBadge({ status }: { status: AttendanceKey }) {
  const st = ST[status];
  return (
    <Tag variant={st.cls} icon={st.i}>
      {st.b}
    </Tag>
  );
}

/** Live location badge (Still at home / On the way / Almost there / Already there). */
export function LocationBadge({ status }: { status: LocationKey }) {
  const l = LOC[status];
  return <Tag variant={l.cls}>{l.l}</Tag>;
}

export type TagVariant = 'zest' | 'rosy' | 'teal' | 'blossom' | 'cream' | 'st-g' | 'st-m' | 'st-x' | 'l-home' | 'l-otw' | 'l-almost' | 'l-there';

/** .tag variants (otw.css): fill + ink; l-home also has a teal-dark ring. */
const TAGS: Record<TagVariant, { bg: string; fg: string; ring?: string }> = {
  zest: { bg: brand.zest, fg: brand.tealDark },
  rosy: { bg: brand.rosy, fg: brand.cream },
  teal: { bg: brand.teal, fg: brand.cream },
  'st-g': { bg: brand.teal, fg: brand.cream },
  'l-otw': { bg: brand.teal, fg: brand.cream },
  blossom: { bg: brand.blossom, fg: brand.tealDark },
  cream: { bg: brand.cream, fg: brand.tealDark },
  'st-m': { bg: brand.zest, fg: brand.tealDark },
  'l-almost': { bg: brand.zest, fg: brand.tealDark },
  'st-x': { bg: brand.blossom, fg: brand.rosyDark },
  'l-home': { bg: brand.cream, fg: brand.tealDark, ring: brand.tealDark },
  'l-there': { bg: brand.rosy, fg: brand.cream },
};

export function Tag({ children, variant = 'zest', icon }: { children: ReactNode; variant?: TagVariant; icon?: IconName }) {
  const t = TAGS[variant];
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }, t.ring ? { borderWidth: 2, borderColor: t.ring, paddingVertical: 2, paddingHorizontal: 10 } : null]}>
      {icon ? <Icon name={icon} size={14} color={t.fg} /> : null}
      <Text style={[styles.tagText, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.seg, { backgroundColor: colors.surface2 }]}>
      {options.map((o) => {
        const on = o.value === value;
        const fg = on ? brand.cream : colors.text;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segBtn, on && styles.segOn]}>
            {o.icon ? <Icon name={o.icon} size={16} color={fg} /> : null}
            <Text style={[styles.segText, { color: fg }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Asymmetric radii for a hand-cut feel (BLOBS on the web), as [tl, tr, br, bl] fractions of the size. */
const BLOBS = [
  [0.48, 0.58, 0.4, 0.6],
  [0.5, 0.44, 0.55, 0.45],
  [0.46, 0.58, 0.5, 0.42],
  [0.5, 0.52, 0.4, 0.6],
];

export function blob(i: number, size: number): ViewStyle {
  const [tl, tr, br, bl] = BLOBS[i % BLOBS.length];
  return {
    borderTopLeftRadius: tl * size,
    borderTopRightRadius: tr * size,
    borderBottomRightRadius: br * size,
    borderBottomLeftRadius: bl * size,
  };
}

/** .ico: icon on a surface blob, rosy by default. */
export function IconBlob({
  name,
  index = 0,
  size = 52,
  iconSize,
  color = brand.rosy,
  bg,
  shadow,
}: {
  name: IconName;
  index?: number;
  size?: number;
  iconSize?: number;
  color?: string;
  bg?: string;
  shadow?: string;
}) {
  const { colors } = useTheme();
  const shape = blob(index, size);
  return (
    <View style={{ paddingBottom: shadow ? 6 : 0 }}>
      {shadow ? <View style={[StyleSheet.absoluteFill, shape, { top: 6, backgroundColor: shadow }]} /> : null}
      <View style={[{ width: size, height: size, backgroundColor: bg ?? colors.surface, alignItems: 'center', justifyContent: 'center' }, shape]}>
        <Icon name={name} size={iconSize ?? Math.round(size * 0.5)} color={color} />
      </View>
    </View>
  );
}

/* ---------------- progress, checkbox, fab, choice chips ---------------- */

/** .bar: rounded track with a teal fill (value 0-100). */
export function ProgressBar({ value, label, color = brand.teal }: { value: number; label?: string; color?: string }) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[styles.bar, { backgroundColor: colors.surface2 }]}>
      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

/** .cbox: rounded square, teal with a tick when checked. */
export function CheckBox({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={[styles.cbox, checked ? styles.cboxOn : { borderColor: brand.teal, backgroundColor: colors.fieldBg }]}>
      {checked ? <Icon name="check" size={18} color={brand.cream} /> : null}
    </Pressable>
  );
}

/** On / off switch (.switch): teal track when on, cream knob. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      hitSlop={6}
      style={[styles.sw, { backgroundColor: checked ? brand.teal : colors.surface2, borderBottomColor: checked ? brand.tealDark : colors.line }]}>
      <View style={[styles.knob, { alignSelf: checked ? 'flex-end' : 'flex-start' }]} />
    </Pressable>
  );
}

/** Floating round "add" button, bottom right of a gala screen (.fab). */
export function Fab({ label, onPress, icon = 'plus' }: { label: string; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.fabWrap}>
      {({ pressed }) => (
        <>
          <View style={[styles.fabShadow]} />
          <View style={[styles.fab, { transform: [{ translateY: pressed ? 4 : 0 }] }]}>
            <Icon name={icon} size={30} color={brand.cream} />
          </View>
        </>
      )}
    </Pressable>
  );
}

/** Pick one of a few options as wrapping pills (stands in for the web's <select>). */
export function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.fl}>
      {label ? <Text style={[styles.flLabel, { color: colors.text }]}>{label}</Text> : null}
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.chips}>
        {options.map((o) => {
          const on = o.value === value;
          const fg = on ? brand.cream : colors.text;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.value)}
              style={[styles.chip, on ? styles.chipOn : { borderColor: colors.line, backgroundColor: colors.surface }]}>
              {o.icon ? <Icon name={o.icon} size={16} color={fg} /> : null}
              <Text style={[styles.chipText, { color: fg }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center} accessibilityLabel={label}>
      <ActivityIndicator color={colors.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  sw: { width: 56, height: 32, borderRadius: 16, padding: 4, borderBottomWidth: 3, justifyContent: 'center' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: brand.cream },
  bar: { height: 16, borderRadius: 99, overflow: 'hidden' },
  barFill: { height: 16, borderRadius: 99 },
  cbox: { width: 32, height: 32, borderRadius: 11, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  cboxOn: { backgroundColor: brand.teal, borderColor: brand.teal, borderBottomColor: brand.tealDark },
  fabWrap: { position: 'absolute', right: 18, bottom: 18, paddingBottom: 6 },
  fabShadow: { position: 'absolute', left: 0, right: 0, top: 6, bottom: 0, borderRadius: 32, backgroundColor: brand.rosyDark },
  fab: { width: 64, height: 64, borderRadius: 32, backgroundColor: brand.rosy, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 3, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  chipOn: { backgroundColor: brand.teal, borderColor: brand.teal, borderBottomColor: brand.tealDark },
  chipText: { fontFamily: font.bodyHeavy, fontSize: 14 },
  flex: { flex: 1 },
  fw: { alignSelf: 'stretch' },
  fit: { alignSelf: 'flex-start' },
  bold: { fontFamily: font.bodyBold },
  screenInner: { paddingHorizontal: 20, paddingVertical: 20, gap: 16, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  phead: { gap: 8, alignItems: 'flex-start' },
  h2: { fontFamily: font.displaySemi, fontSize: 32, lineHeight: 36, letterSpacing: -0.5 },
  h3: { fontFamily: font.displaySemi, fontSize: 20, lineHeight: 24 },
  sub: { fontFamily: font.bodyBold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 22 },
  fine: { fontFamily: font.body, fontSize: 14, lineHeight: 20, opacity: 0.85 },
  lnk: { fontFamily: font.bodyHeavy, fontSize: 16, textDecorationLine: 'underline', textAlign: 'center', paddingVertical: 6 },

  btnShadow: { position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: 999 },
  btn: { borderRadius: 999, minHeight: 50, paddingVertical: 15, paddingHorizontal: 28, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  btnSm: { borderRadius: 999, minHeight: 38, paddingVertical: 10, paddingHorizontal: 18, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  btnLabel: { fontFamily: font.displaySemi, fontSize: 19, lineHeight: 22 },
  btnLabelSm: { fontFamily: font.displaySemi, fontSize: 16, lineHeight: 19 },
  ibtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  cardWrap: { paddingBottom: 6 },
  cardShadow: { position: 'absolute', left: 0, right: 0, top: 6, bottom: 0, borderRadius: 26 },
  card: { borderWidth: 3, borderRadius: 26, padding: 20, gap: 8 },
  cardPressed: { transform: [{ translateY: 3 }] },

  fl: { gap: 8 },
  flLabel: { fontFamily: font.bodyHeavy, fontSize: 15 },
  inShadow: { position: 'absolute', left: 0, right: 0, top: 4, bottom: 0, borderRadius: 20 },
  in: { borderWidth: 3, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 12, fontFamily: font.bodyBold, fontSize: 17 },
  inPassword: { paddingRight: 56 },
  inCode: { fontFamily: font.displaySemi, fontSize: 24, letterSpacing: 3, textAlign: 'center' },
  hint: { fontFamily: font.bodyBold, fontSize: 13 },
  fieldErr: { fontFamily: font.bodyHeavy, fontSize: 13 },
  eye: { position: 'absolute', right: 8, top: 0, bottom: 4, justifyContent: 'center' },

  ferr: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 3, borderColor: brand.rosyDark },
  ferrText: { flex: 1, fontFamily: font.bodyHeavy, fontSize: 15, lineHeight: 20 },

  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12, alignSelf: 'flex-start' },
  tagText: { fontFamily: font.bodyHeavy, fontSize: 13 },

  seg: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 999, padding: 4, gap: 2, alignSelf: 'flex-start' },
  segBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 15 },
  segOn: { backgroundColor: brand.teal, borderBottomWidth: 3, borderBottomColor: brand.tealDark },
  segText: { fontFamily: font.bodyHeavy, fontSize: 15 },
});
