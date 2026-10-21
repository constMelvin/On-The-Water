import { describe, expect, it } from 'vitest';
import { swipeIntent, swipeTriggersReply } from './chat-swipe';

describe('swipeIntent', () => {
  it('waits until the finger has moved enough', () => {
    expect(swipeIntent(5, 0)).toBe('none');
  });

  it('lets a mostly vertical drag scroll', () => {
    expect(swipeIntent(12, 30)).toBe('scroll');
  });

  it('locks a mostly horizontal drag into a swipe', () => {
    expect(swipeIntent(30, 5)).toBe('swipe');
    expect(swipeIntent(-30, 5)).toBe('swipe');
  });
});

describe('swipeTriggersReply', () => {
  it('replies past 64 px toward the centre', () => {
    expect(swipeTriggersReply(70, 1)).toBe(true);
    expect(swipeTriggersReply(-70, -1)).toBe(true);
  });

  it('ignores a swipe the other way or too short', () => {
    expect(swipeTriggersReply(-70, 1)).toBe(false);
    expect(swipeTriggersReply(40, 1)).toBe(false);
  });
});
