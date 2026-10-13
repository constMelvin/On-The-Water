/** Brand colours: identical in light and dark. */
export const brand = {
  rosy: "#e0417c",
  rosyDark: "#c22e64",
  zest: "#f8e140",
  zestDark: "#c9b418",
  blossom: "#eac7df",
  teal: "#2f8aa3",
  tealDark: "#1f6376",
  cream: "#fff8f2",
  zestInk: "#5a4d10", // text on zest
} as const;

export type ThemeKey =
  | "bgPage" | "surface" | "surface2" | "text" | "line" | "fieldBg" | "focus" | "rosyInk"
  | "secRosy" | "secZest" | "secTeal" | "secBlossom" | "secTdark" | "secInk" | "scrim";

/** A theme maps every surface token to any colour string. */
export type Theme = Record<ThemeKey, string>;

/** Surface tokens: these flip between light and dark (same values as tokens.css). */
export const light: Theme = {
  bgPage: brand.cream,
  surface: brand.cream,
  surface2: brand.blossom,
  text: brand.tealDark,
  line: brand.blossom,
  fieldBg: brand.cream,
  focus: brand.tealDark,
  rosyInk: brand.rosyDark,
  // full-bleed section fills: the brand colour itself in light
  secRosy: brand.rosy,
  secZest: brand.zest,
  secTeal: brand.teal,
  secBlossom: brand.blossom,
  secTdark: brand.tealDark,
  secInk: brand.tealDark,
  scrim: brand.tealDark,
};

export const dark: Theme = {
  bgPage: "#0e2229",
  surface: "#16313a",
  surface2: "#24424d",
  text: "#fff8f2",
  line: "#2d5260",
  fieldBg: "#0f272e",
  focus: brand.zest,
  rosyInk: "#ff86ad",
  // deep tints of each section colour in dark
  secRosy: "#3a1626",
  secZest: "#2e2a0e",
  secTeal: "#0f2d36",
  secBlossom: "#2b1a26",
  secTdark: "#0a1b21",
  secInk: "#fff8f2",
  scrim: "#000000",
};
