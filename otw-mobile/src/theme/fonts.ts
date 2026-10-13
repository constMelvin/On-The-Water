import { Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';

/** Loaded once in app/_layout.tsx. Fredoka: headings, buttons, numbers. Nunito 600-800: body. */
export const fontAssets = {
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
};

export const font = {
  display: 'Fredoka_700Bold',
  displaySemi: 'Fredoka_600SemiBold',
  displayMedium: 'Fredoka_500Medium',
  body: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
} as const;
