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
