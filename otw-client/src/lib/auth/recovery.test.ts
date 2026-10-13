import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = { resetPasswordForEmail: vi.fn(), updateUser: vi.fn() };
vi.mock('@/lib/api/supabase', () => ({ supabase: () => ({ auth }) }));

import { requestPasswordReset, updatePassword } from './recovery';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('window', { location: { origin: 'https://otw.test' } });
});

describe('requestPasswordReset', () => {
  it('sends the trimmed email with the reset page as the redirect', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    await requestPasswordReset('  me@x.com ');
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('me@x.com', { redirectTo: 'https://otw.test/reset-password' });
  });
  it('turns a Supabase error into safe copy', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: { status: 429, message: 'raw provider text' } });
    await expect(requestPasswordReset('me@x.com')).rejects.toThrow(/too many tries/i);
  });
});

describe('updatePassword', () => {
  it('updates the password on the current session', async () => {
    auth.updateUser.mockResolvedValue({ error: null });
    await updatePassword('new-secret-1');
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'new-secret-1' });
  });
  it('maps a weak password', async () => {
    auth.updateUser.mockResolvedValue({ error: { code: 'weak_password', status: 422 } });
    await expect(updatePassword('password')).rejects.toThrow(/stronger password/i);
  });
});
