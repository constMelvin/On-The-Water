import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { dark, light, type Theme } from './tokens';

/** Auto follows the phone; Light / Dark are the person's choice (stored as `otw:theme`, like the web). */
export type ThemeMode = 'auto' | 'light' | 'dark';

interface ThemeValue {
  colors: Theme;
  scheme: 'light' | 'dark';
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const KEY = 'otw:theme';
const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('auto');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'auto') setModeState(v);
      })
      .catch(() => undefined);
  }, []);

  const scheme: 'light' | 'dark' = mode === 'auto' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const colors = scheme === 'dark' ? dark : light;

  // Root view colour: no white flash behind screens in dark mode.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bgPage);
  }, [colors.bgPage]);

  const value = useMemo<ThemeValue>(
    () => ({
      colors,
      scheme,
      mode,
      setMode: (next) => {
        setModeState(next);
        AsyncStorage.setItem(KEY, next).catch(() => undefined);
      },
    }),
    [colors, scheme, mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
