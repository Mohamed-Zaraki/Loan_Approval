export interface ManagerSession {
  email: string;
  name: string;
  signedInAt: string;
}

/**
 * Frontend-only demo credentials. Real authentication must be enforced by the
 * Python backend (hashed passwords + token/session); this gate only keeps the
 * manager console behind a sign-in screen in the UI prototype.
 */
export const DEMO_MANAGER = {
  email: 'manager@loanflow.demo',
  password: 'manager123',
  name: 'Alex Mercier',
} as const;

const SESSION_KEY = 'loanflow.manager-session.v1';

export function getManagerSession(): ManagerSession | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as ManagerSession).email === 'string' &&
      typeof (parsed as ManagerSession).name === 'string'
    ) {
      return parsed as ManagerSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function signInManager(email: string, password: string): ManagerSession {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== DEMO_MANAGER.email || password !== DEMO_MANAGER.password) {
    throw new Error('Incorrect email or password.');
  }

  const session: ManagerSession = {
    email: DEMO_MANAGER.email,
    name: DEMO_MANAGER.name,
    signedInAt: new Date().toISOString(),
  };

  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Session storage can be unavailable; the in-memory session still works.
  }

  return session;
}

export function signOutManager(): void {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage errors.
  }
}
