import { describe, expect, it } from 'vitest';
import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('keeps a normal same-site path', () => {
    expect(safeNext('/plan?x=1')).toBe('/plan?x=1');
  });
  it.each(['//evil.com', '/\\evil', 'https://evil.com'])('rejects %s', (v) => {
    expect(safeNext(v)).toBe('/');
  });
  it.each([null, undefined, ''])('falls back for %s', (v) => {
    expect(safeNext(v, '/x')).toBe('/x');
  });
  it.each(['/\t/evil.com', '/\n/evil.com', '/\0evil', '/a\rb', '/a\x7Fb'])('rejects control characters in %j', (v) => {
    expect(safeNext(v)).toBe('/');
  });
});
