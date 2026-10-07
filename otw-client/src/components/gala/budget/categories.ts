import type { IconName } from '@/lib/otw/icons';
import type { BudgetCategory } from '@/lib/otw/budget';
import s from './budget.module.css';

/** Reference BC + BCOL: field, label, icon, split-bar / legend color class. Order matters (it is the bar order). */
export const CATS: [key: BudgetCategory, label: string, icon: IconName, color: string][] = [
  ['transportAmount', 'Transportation', 'bus', s.teal],
  ['stayAmount', 'Stay', 'home', s.rosy],
  ['foodAmount', 'Food', 'food', s.zest],
  ['activitiesAmount', 'Activities', 'flag', s.blossom],
  ['otherAmount', 'Other', 'more', s.tealDark],
];

/**
 * Colours for this device's custom categories, by their colour slot: the two brand colours the five defaults
 * don't use (rosy-dark, zest-dark), then the default five again with a cream stripe so a repeat never looks
 * like its twin. The legend always prints name + amount, so colour is never the only cue.
 */
const CUSTOM_COLORS = [s.rosyDark, s.zestDark, s.sTeal, s.sRosy, s.sZest, s.sBlossom, s.sTealDark];
export const customColor = (tone: number): string => CUSTOM_COLORS[tone % CUSTOM_COLORS.length];

/** One line of the estimate: a default category or a custom one (the split bar and legend draw these). */
export interface BudgetLine {
  key: string;
  label: string;
  color: string;
  /** Pesos. */
  amount: number;
}
