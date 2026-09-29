// TODO(D3-02): update with real dashboard routes when available
export const LEADER_DASHBOARD_ROUTE = '/dashboard';
export const CREATE_ACCOUNT_ROUTE = '/signup';

export interface CreateGalaInput {
  name?: string;
  tripType: 'DAY_TOUR' | 'VACATION';
  date: string;
  days: number;
  startTime: string;
  endTime: string;
  destination?: string;
  password?: string;
  [key: string]: unknown;
}

// TODO(D3-01): replace with real API
export async function createGala(input?: CreateGalaInput): Promise<{ code: string }> {
  void input;
  // Stubs resolve after about 800ms (so loading states are real)
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Gala code format: OTW- + 4 characters from ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (no 0/O/1/I)
  const allowedChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomCode = '';
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * allowedChars.length);
    randomCode += allowedChars[randomIndex];
  }

  return {
    code: `OTW-${randomCode}`,
  };
}

export const mockCreateGala = createGala;
