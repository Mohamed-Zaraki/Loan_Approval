const MY_APPLICATIONS_KEY = 'loanflow.my-applications.v1';

export function getRememberedApplicationIds(): string[] {
  try {
    const raw = window.localStorage.getItem(MY_APPLICATIONS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
}

export function rememberApplication(applicationId: string): void {
  try {
    const ids = getRememberedApplicationIds().filter((id) => id !== applicationId);
    ids.unshift(applicationId);
    window.localStorage.setItem(MY_APPLICATIONS_KEY, JSON.stringify(ids.slice(0, 25)));
  } catch {
    // Storage can be unavailable in private mode; tracking is non-critical.
  }
}

export function clearRememberedApplications(): void {
  try {
    window.localStorage.removeItem(MY_APPLICATIONS_KEY);
  } catch {
    // Ignore storage errors.
  }
}
