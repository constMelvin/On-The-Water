/**
 * Plan a Gala contract. This is the ONE file teammates replace to wire the real flow.
 * Everything the UI needs from the backend goes through here.
 */

export interface GalaDraft {
  title: string;
  /** yyyy-mm-dd from <input type="date">. */
  date: string;
  /** hh:mm from <input type="time">. */
  startTime?: string;
  endTime?: string;
  destination: string;
  password: string;
}

export interface CreatedGala {
  code: string;
}

export const emptyDraft = (): GalaDraft => ({
  title: '',
  date: '',
  startTime: '',
  endTime: '',
  destination: '',
  password: '',
});

export const EXAMPLE_TITLE = 'Baguio Before Graduation';

/** Destination chips on step 3. */
export const PLACE_SUGGESTIONS = ['Baguio City', 'Tagaytay', 'La Union', 'Batangas'];

/** Exact copy from the reference. Validation runs only when Next is pressed. */
export const MESSAGES = {
  title: 'Give it a name first. Your GC needs something to search for.',
  date: 'Pick a date, even a tentative one. “Someday” isn\'t a date.',
  destination: "Saan tayo? Tell us where you're headed.",
  password: 'Make it at least 6 characters.',
  mismatch: 'Hindi pa magkapareho. Check the password again.',
} as const;

/** Returns the error for a step (0-3), or '' when the step is valid. */
export function validateStep(step: number, draft: GalaDraft, confirm: string): string {
  // TODO(team): add any server-side rules here (e.g. title length, banned words, date in the past).
  if (step === 0 && !draft.title.trim()) return MESSAGES.title;
  if (step === 1 && !draft.date) return MESSAGES.date;
  if (step === 2 && !draft.destination.trim()) return MESSAGES.destination;
  if (step === 3 && draft.password.length < 6) return MESSAGES.password;
  if (step === 3 && draft.password !== confirm) return MESSAGES.mismatch;
  return '';
}

/** Password strength 0-3, same rule as the reference pwMeter. */
export function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
  const n = Number(pw.length >= 6) + Number(pw.length >= 10) + Number(/[0-9]/.test(pw) && /[a-z]/i.test(pw));
  return n as 0 | 1 | 2 | 3;
}

/**
 * STUB. Creates the gala and returns its code.
 * TODO(team): replace with the real API call (create gala, make the creator the Gala Leader,
 * return the generated code). Throw on failure; the wizard shows a toast and stays on step 4.
 */
export async function createGala(draft: GalaDraft): Promise<CreatedGala> {
  void draft;
  await new Promise((r) => setTimeout(r, 700));
  return { code: 'OTW-7K2P' };
}
