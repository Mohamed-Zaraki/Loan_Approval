import { POLICY, ANNUAL_INTEREST_RATE } from '../config';
import type {
  Assessment,
  EligibilityCheck,
  LoanApplicationInput,
  Recommendation,
} from '../types';
import { formatCurrency, formatPercent } from './format';

export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  months: number,
): number {
  if (!Number.isFinite(principal) || principal <= 0 || months <= 0) return 0;
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) return principal / months;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
}

export function assessLoan(input: LoanApplicationInput): Assessment {
  const {
    applicant,
    monthlyIncome,
    totalDebt,
    savings,
    loanAmount,
    loanDuration,
    missedPayments,
    incomeVerified,
  } = input;

  const monthlyPayment = calculateMonthlyPayment(loanAmount, ANNUAL_INTEREST_RATE, loanDuration);
  const totalRepayment = monthlyPayment * Math.max(loanDuration, 0);
  const totalInterest = Math.max(totalRepayment - loanAmount, 0);
  const debtRatio = monthlyIncome > 0 ? (totalDebt + monthlyPayment) / monthlyIncome : 1;
  const residualIncome = monthlyIncome - totalDebt - monthlyPayment;
  const loanToIncome = monthlyIncome > 0 ? loanAmount / monthlyIncome : Infinity;

  const checks: EligibilityCheck[] = [
    {
      id: 'age',
      label: 'Age within policy range',
      detail: `${applicant.age} years old · allowed range ${POLICY.minAge}–${POLICY.maxAge}`,
      passed: applicant.age >= POLICY.minAge && applicant.age <= POLICY.maxAge,
      severity: 'required',
    },
    {
      id: 'income',
      label: 'Income verified',
      detail: incomeVerified
        ? 'Supporting income document attached'
        : 'No proof of income provided',
      passed: incomeVerified,
      severity: 'required',
    },
    {
      id: 'ratio',
      label: 'Debt-to-income within limit',
      detail: `${formatPercent(debtRatio)} of monthly income · limit ${POLICY.maxDebtRatio * 100}%`,
      passed: monthlyIncome > 0 && debtRatio <= POLICY.maxDebtRatio,
      severity: 'required',
    },
    {
      id: 'missed',
      label: 'Repayment history',
      detail: `${missedPayments} missed payment${missedPayments === 1 ? '' : 's'} · limit ${POLICY.maxMissedPayments}`,
      passed: missedPayments <= POLICY.maxMissedPayments,
      severity: 'required',
    },
    {
      id: 'cdi',
      label: 'Stable employment',
      detail: applicant.hasCDI ? 'Permanent contract (CDI)' : 'No permanent contract',
      passed: applicant.hasCDI,
      severity: 'advisory',
    },
    {
      id: 'savings',
      label: 'Savings buffer',
      detail: `${formatCurrency(savings)} saved · one installment is ${formatCurrency(monthlyPayment)}`,
      passed: monthlyPayment > 0 && savings >= monthlyPayment,
      severity: 'advisory',
    },
    {
      id: 'lti',
      label: 'Loan-to-income ratio',
      detail: `${
        Number.isFinite(loanToIncome) ? `${loanToIncome.toFixed(1)}×` : '—'
      } monthly income · guide ≤ ${POLICY.maxLoanToIncome}×`,
      passed: loanToIncome <= POLICY.maxLoanToIncome,
      severity: 'advisory',
    },
  ];

  const requiredFailures = checks.filter((check) => check.severity === 'required' && !check.passed).length;
  const advisoryFailures = checks.filter((check) => check.severity === 'advisory' && !check.passed).length;

  const score = Math.max(0, Math.round(100 - requiredFailures * 28 - advisoryFailures * 7));
  const recommendation: Recommendation =
    requiredFailures > 0 ? 'high-risk' : advisoryFailures > 0 ? 'review' : 'strong';

  return {
    monthlyPayment,
    totalRepayment,
    totalInterest,
    debtRatio,
    residualIncome,
    checks,
    score,
    recommendation,
  };
}

export function recommendationCopy(recommendation: Recommendation): { title: string; description: string } {
  switch (recommendation) {
    case 'strong':
      return {
        title: 'Strong profile',
        description: 'All core criteria are met and no advisory flags were raised. A low-risk candidate for approval.',
      };
    case 'review':
      return {
        title: 'Manual review advised',
        description: 'Core criteria are met, but some advisory checks failed. Weigh the applicant profile before deciding.',
      };
    case 'high-risk':
      return {
        title: 'High risk',
        description: 'One or more required criteria are not met. Denial is recommended unless compensating factors apply.',
      };
  }
}
