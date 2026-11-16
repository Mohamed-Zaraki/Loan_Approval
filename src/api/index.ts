import type { DecisionInput, LoanApplication, LoanApplicationInput } from '../types';
import { httpApi } from './httpApi';

export interface LoanApi {
  listApplications(): Promise<LoanApplication[]>;
  getApplication(applicationId: string): Promise<LoanApplication>;
  createApplication(input: LoanApplicationInput): Promise<LoanApplication>;
  decideApplication(applicationId: string, input: DecisionInput): Promise<LoanApplication>;
}

/** All application data is served by the backend API connected to MySQL. */
export const api: LoanApi = httpApi;
