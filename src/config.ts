export const APP_NAME = 'LoanFlow';

/** ISO 4217 currency used across the interface. */
export const CURRENCY = 'EUR';
export const CURRENCY_SYMBOL = '€';

/** Nominal annual interest rate used for the indicative repayment estimate. */
export const ANNUAL_INTEREST_RATE = 0.065;

/**
 * Algeria's biometric national identity card (CNIB) carries an 18-digit
 * number. Spaces are stripped before validation.
 */
export const ID_NUMBER_DIGITS = 18;

/** Largest file accepted from the applicant. */
export const MAX_DOCUMENT_BYTES = 3 * 1024 * 1024;

/** PDFs are stored inline in the browser demo, so keep the original small. */
export const MAX_STORED_PDF_BYTES = 1_500_000;

/** Longest edge used when compressing a photo or scan before storing it. */
export const DOCUMENT_IMAGE_MAX_EDGE = 1600;

/** Lending policy used by the eligibility assessment. */
export const POLICY = {
  minAge: 18,
  maxAge: 70,
  maxValidationAge: 75,
  maxDebtRatio: 0.4,
  maxMissedPayments: 2,
  maxLoanToIncome: 36,
  minLoanAmount: 500,
  maxLoanAmount: 1_000_000,
  minDuration: 6,
  maxDuration: 360,
} as const;

export const LOAN_PURPOSES = [
  'Home purchase',
  'Home renovation',
  'Vehicle',
  'Education',
  'Business',
  'Debt consolidation',
  'Medical expenses',
  'Personal expenses',
  'Other',
] as const;

export const LOAN_DURATIONS = [12, 24, 36, 48, 60, 84, 120, 180, 240] as const;
