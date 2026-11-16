export type ApplicationStatus = 'pending' | 'approved' | 'denied';
export type DecisionStatus = 'approved' | 'denied';
export type Recommendation = 'strong' | 'review' | 'high-risk';

export interface ApplicantInput {
  fullName: string;
  idCardNumber: string;
  age: number;
  job: string;
  hasCDI: boolean;
  isMarried: boolean;
  numberOfChildren: number;
}

export interface Applicant extends ApplicantInput {
  applicantId: string;
}

/**
 * Proof of income uploaded by the applicant.
 * `dataUrl` keeps a compressed copy so the manager can preview it in the
 * browser-only demo. A real backend should store the file itself and keep
 * only a reference here.
 */
export interface IncomeDocument {
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  dataUrl?: string;
}

export interface LoanApplicationInput {
  applicant: ApplicantInput;
  monthlyIncome: number;
  totalDebt: number;
  savings: number;
  incomeVerified: boolean;
  incomeDocument: IncomeDocument | null;
  loanAmount: number;
  loanDuration: number;
  loanPurpose: string;
  missedPayments: number;
}

export interface LoanDecision {
  decisionId: string;
  status: DecisionStatus;
  reason: string;
  decisionDate: string;
  managerName: string;
}

export interface LoanApplication extends Omit<LoanApplicationInput, 'applicant'> {
  applicationId: string;
  applicant: Applicant;
  status: ApplicationStatus;
  createdAt: string;
  decision: LoanDecision | null;
}

export interface DecisionInput {
  status: DecisionStatus;
  reason: string;
}

export interface EligibilityCheck {
  id: string;
  label: string;
  detail: string;
  passed: boolean;
  severity: 'required' | 'advisory';
}

export interface Assessment {
  monthlyPayment: number;
  totalRepayment: number;
  totalInterest: number;
  debtRatio: number;
  residualIncome: number;
  checks: EligibilityCheck[];
  score: number;
  recommendation: Recommendation;
}
