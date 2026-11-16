import { httpApi } from './api/httpApi';

export interface ManagerSession {
  email: string;
  name: string;
}

export async function getManagerSession(): Promise<ManagerSession | null> {
  try {
    return await httpApi.getManagerSession();
  } catch {
    return null;
  }
}

export function signInManager(email: string, password: string): Promise<ManagerSession> {
  return httpApi.loginManager(email, password);
}

export async function signOutManager(): Promise<void> {
  await httpApi.logoutManager();
}
