/**
 * Mock store entry point. Importing this registers every feature slice (so resetRoom and
 * the dev handle window.otwMock see them all). A lane adding a new slice adds one export line here.
 */
export { DEMO_CODE, defineSlice, isDemo, mockId, resetRoom, useSlice, type Slice, type SliceDef, type Updater } from './store';
export { DEMO_MEMBERS, mockUserId, nameOf } from './members';
export { itinerary } from './itinerary';
export { checklist } from './checklist';
export { budget, perPersonOf, withTotals } from './budget';
export { expenses, splitEqually } from './expenses';
export { chat } from './chat';
export { location } from './location';
export { photos } from './photos';
export { couple } from './couple';
export { settings } from './settings';
export type * from './types';
