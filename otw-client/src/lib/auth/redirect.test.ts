import { describe, expect, it } from 'vitest';
import { isOnLoginPage, loginUrl } from './redirect';

describe('loginUrl', () => {
  it('builds a login URL that returns to the current page', () => {
    expect(loginUrl('/plan')).toBe('/login?tab=login&next=%2Fplan');
  });
  it('carries tab and ctx', () => {
    expect(loginUrl('/join?code=ABC', { tab: 'create', ctx: 'join' })).toBe(
      '/login?tab=create&ctx=join&next=%2Fjoin%3Fcode%3DABC'
    );
  });
  it('never loops: already on /login returns plain /login', () => {
    expect(loginUrl('/login?tab=login')).toBe('/login');
    expect(loginUrl('/login')).toBe('/login');
  });
  it('never produces an off-site next', () => {
    expect(loginUrl('//evil.example/x')).toBe('/login?tab=login&next=%2F');
    expect(loginUrl('https://evil.example')).toBe('/login?tab=login&next=%2F');
    expect(loginUrl('/\\evil')).toBe('/login?tab=login&next=%2F');
  });
  it('accepts the me context', () => {
    expect(loginUrl('/me/galas', { tab: 'login', ctx: 'me' })).toBe('/login?tab=login&ctx=me&next=%2Fme%2Fgalas');
  });
});

describe('isOnLoginPage', () => {
  it('matches /login and its subpaths only', () => {
    expect(isOnLoginPage('/login')).toBe(true);
    expect(isOnLoginPage('/login/x')).toBe(true);
    expect(isOnLoginPage('/loginx')).toBe(false);
    expect(isOnLoginPage('/plan')).toBe(false);
  });
});
