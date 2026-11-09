import type { DecisionInput, LoanApplication, LoanApplicationInput } from '../types';
import { demoApi } from './demoApi';
import { httpApi } from './httpApi';

export interface LoanApi {
  listApplications(): Promise<LoanApplication[]>;
  getApplication(applicationId: string): Promise<LoanApplication>;
  createApplication(input: LoanApplicationInput): Promise<LoanApplication>;
  decideApplication(applicationId: string, input: DecisionInput): Promise<LoanApplication>;
  resetDemoData?(): Promise<LoanApplication[]>;
}

/**
 * When VITE_API_URL is present the app talks to the Python REST API.
 * Otherwise it falls back to browser demo data so the UI is fully usable.
 */
export const isDemo = !import.meta.env.VITE_API_URL;

export const api: LoanApi = isDemo ? demoApi : httpApi;

export const canResetDemo = isDemo;
