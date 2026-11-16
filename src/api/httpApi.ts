import type { DecisionInput, LoanApplication, LoanApplicationInput } from '../types';
import type { ManagerSession } from '../auth';

const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

type ApplicationResponse = LoanApplication | { application: LoanApplication };
type ApplicationListResponse = LoanApplication[] | { items: LoanApplication[] };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object') {
        const detail = (body as { detail?: unknown; message?: unknown }).detail;
        const fallback = (body as { message?: unknown }).message;
        if (typeof detail === 'string') message = detail;
        else if (typeof fallback === 'string') message = fallback;
      }
    } catch {
      // Keep the status-based message.
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function unwrapApplication(response: ApplicationResponse): LoanApplication {
  return 'application' in response ? response.application : response;
}

export const httpApi = {
  async loginManager(email: string, password: string): Promise<ManagerSession> {
    return request<ManagerSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async getManagerSession(): Promise<ManagerSession> {
    return request<ManagerSession>('/auth/me');
  },

  async logoutManager(): Promise<void> {
    await request<void>('/auth/logout', { method: 'POST' });
  },

  async listApplications(): Promise<LoanApplication[]> {
    const response = await request<ApplicationListResponse>('/applications');
    return Array.isArray(response) ? response : response.items;
  },

  async getApplication(applicationId: string): Promise<LoanApplication> {
    const response = await request<ApplicationResponse>(
      `/applications/${encodeURIComponent(applicationId)}`,
    );
    return unwrapApplication(response);
  },

  async createApplication(input: LoanApplicationInput): Promise<LoanApplication> {
    const response = await request<ApplicationResponse>('/applications', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return unwrapApplication(response);
  },

  async decideApplication(
    applicationId: string,
    input: DecisionInput,
  ): Promise<LoanApplication> {
    const response = await request<ApplicationResponse>(
      `/applications/${encodeURIComponent(applicationId)}/decision`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
    return unwrapApplication(response);
  },
};
