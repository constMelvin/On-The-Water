import { Tabs } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExitPrompt } from '@/components/ExitPrompt';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

/** OTW rule: exactly three large round icon buttons, no text labels. Active = solid teal with a teal-dark shadow. */
const TABS: { name: string; icon: IconName; label: string }[] = [
  { name: 'index', icon: 'home', label: 'My Galas' },
  { name: 'notifications', icon: 'bell', label: 'Notifications' },
  { name: 'profile', icon: 'user', label: 'Profile' },
];

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Tabs
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bgPage } }}
        tabBar={({ state, navigation }) => (
          <View style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.line, paddingBottom: 12 + insets.bottom }]}>
            {TABS.map((tab) => {
              const index = state.routes.findIndex((r) => r.name === tab.name);
              const active = state.index === index;
              return (
                <Pressable
                  key={tab.name}
                  accessibilityRole="tab"
                  accessibilityLabel={tab.label}
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    if (!active) navigation.navigate(tab.name);
                  }}>
                  {({ pressed }) => (
                    <View
                      style={[
                        styles.btn,
                        active
                          ? { backgroundColor: brand.teal, borderColor: brand.teal, borderBottomColor: brand.tealDark, borderBottomWidth: pressed ? 3 : 6 }
                          : { borderColor: colors.line },
                        pressed && { transform: [{ translateY: 3 }] },
                      ]}>
                      <Icon name={tab.icon} size={28} color={active ? brand.cream : colors.text} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}>
        {TABS.map((tab) => (
          <Tabs.Screen key={tab.name} name={tab.name} />
        ))}
      </Tabs>
      <ExitPrompt />
    </>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-evenly', paddingTop: 12, borderTopWidth: 3 },
  btn: { width: 62, height: 62, borderRadius: 31, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
});
