import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './errors';

describe('authErrorMessage', () => {
  it('maps wrong credentials without revealing which field was wrong', () => {
    expect(authErrorMessage({ code: 'invalid_credentials' })).toBe('That email and password don’t match. Try again.');
  });
  it('maps an existing account', () => {
    expect(authErrorMessage({ code: 'user_already_exists' })).toMatch(/already has an account/i);
    expect(authErrorMessage({ code: 'email_exists' })).toMatch(/already has an account/i);
  });
  it('maps weak passwords and rate limits', () => {
    expect(authErrorMessage({ code: 'weak_password' })).toMatch(/stronger password/i);
    expect(authErrorMessage({ code: 'over_request_rate_limit' })).toMatch(/too many tries/i);
    expect(authErrorMessage({ status: 429 })).toMatch(/too many tries/i);
  });
  it('maps an invalid email', () => {
    expect(authErrorMessage({ code: 'validation_failed' })).toMatch(/valid email/i);
  });
  it('never leaks the raw provider message for unknown errors', () => {
    const msg = authErrorMessage({ code: 'something_new', message: 'AuthApiError: db constraint users_pkey' });
    expect(msg).not.toMatch(/users_pkey|AuthApiError/);
    expect(msg).toMatch(/couldn’t finish that/i);
  });
  it('handles null and undefined', () => {
    expect(authErrorMessage(null)).toMatch(/couldn’t finish that/i);
    expect(authErrorMessage(undefined)).toMatch(/couldn’t finish that/i);
  });
  it('tells an unconfirmed account to check their email', () => {
    expect(authErrorMessage({ code: 'email_not_confirmed' })).toMatch(/confirm your email first/i);
  });
  it('explains a failed confirmation email without leaking the provider text', () => {
    const msg = authErrorMessage({ code: 'unexpected_failure', status: 500, message: 'Error sending confirmation email' });
    expect(msg).toMatch(/couldn’t send your confirmation email/i);
  });
  it('says when the network is down', () => {
    expect(authErrorMessage({ message: 'Failed to fetch' })).toMatch(/can’t reach otw/i);
  });
});
