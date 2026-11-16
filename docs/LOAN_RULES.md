# Loan acceptance rules

This is the complete rule set the frontend applies, taken from `src/config.ts`,
`src/utils/loan.ts` and the client form validation in `src/pages/ClientPage.tsx`.

The system is **decision support**: it scores and recommends, but a bank manager records the
final approval or denial. There is no automatic acceptance.

## 1. Required eligibility checks (hard rules)

If any of these fail, the recommendation becomes **High risk** and the UI recommends denial
"unless compensating factors apply".

| # | Rule | Condition to pass | Source |
| --- | --- | --- | --- |
| 1 | Age within policy range | `18 ≤ age ≤ 70` | `POLICY.minAge` / `POLICY.maxAge` |
| 2 | Income verified | A proof-of-income document is attached | `incomeVerified` |
| 3 | Debt-to-income within limit | `(existing debt + new monthly installment) / monthly income ≤ 40%` | `POLICY.maxDebtRatio` |
| 4 | Repayment history | `missed payments in last 12 months ≤ 2` | `POLICY.maxMissedPayments` |

Debt-to-income also fails when monthly income is zero (treated as 100%).

## 2. Advisory checks (do not block on their own)

If all required checks pass but one or more of these fail, the recommendation becomes
**Manual review advised**.

| # | Rule | Condition to pass | Source |
| --- | --- | --- | --- |
| 5 | Stable employment | Applicant holds a permanent contract (CDI) | `applicant.hasCDI` |
| 6 | Savings buffer | `savings ≥ one monthly installment` | `assessment.monthlyPayment` |
| 7 | Loan-to-income guide | `loan amount / monthly income ≤ 36×` | `POLICY.maxLoanToIncome` |

## 3. Recommendation and score

```
requiredFailures = number of failed required checks (rules 1–4)
advisoryFailures = number of failed advisory checks (rules 5–7)

score = max(0, 100 − requiredFailures × 28 − advisoryFailures × 7)

if requiredFailures > 0  → "high-risk"  (High risk)
else if advisoryFailures > 0 → "review" (Manual review advised)
else → "strong" (Strong profile)
```

Examples:

| Required failed | Advisory failed | Score | Recommendation |
| --- | --- | --- | --- |
| 0 | 0 | 100 | Strong profile |
| 0 | 1 | 93 | Manual review advised |
| 0 | 2 | 86 | Manual review advised |
| 1 | 0 | 72 | High risk |
| 1 | 1 | 65 | High risk |
| 2 | 0 | 44 | High risk |
| 4 | 3 | 0 | High risk (floor) |

## 4. Financial calculations

- Monthly interest rate = `annual rate / 12`; annual rate = **6.5%** (`ANNUAL_INTEREST_RATE`).
- Monthly installment (annuity formula):

  ```
  payment = principal × r / (1 − (1 + r)^−months)
  r = annualRate / 12
  ```

  Falls back to `principal / months` when the rate is 0.
- Total repayment = `monthly payment × duration`.
- Total interest = `max(total repayment − loan amount, 0)`.
- Debt-to-income = `(total existing monthly debt + monthly installment) / monthly income`.
- Residual income = `monthly income − existing debt − monthly installment`.
- Loan-to-income = `loan amount / monthly income`.

## 5. Application intake validation (before submission)

These prevent an invalid file from being created; they are not credit rules.

| Field | Rule |
| --- | --- |
| Full name | At least 3 characters |
| National ID (CNIB) | Exactly 18 digits, not all zeros |
| Age | 18–120 at the form level (`maxValidationAge`); approval only accepts ≤ 70 |
| Occupation | Required |
| Children | Integer, 0–20 |
| Monthly income | Greater than 0 |
| Existing monthly debt | Required, ≥ 0 |
| Savings | Required, ≥ 0 |
| Proof of income | Required |
| Loan amount | €500 – €1,000,000 |
| Loan duration | 6–360 months (the dropdown offers 12, 24, 36, 48, 60, 84, 120, 180, 240) |
| Loan purpose | Must be selected |
| Missed payments | Integer, 0–50 |

## 6. Proof-of-income document rules

- Accepted formats: **PDF, JPG, PNG**.
- Maximum upload size: **3 MB**.
- PDFs are capped at **1.5 MB** in the browser demo because they are stored inline.
- Images are downscaled so the longest edge is **1600 px** and re-encoded as JPEG at 0.75
  quality before storage.
- The document is mandatory; `incomeVerified` is derived from its presence.
- Guidance shown to applicants:
  - Employees (CDI): last 3 payslips, an `attestation de salaire`, or a CNAS statement.
  - Self-employed: CASNOS certificate + latest `avis d'imposition`.
  - Retirees: `attestation de retraite`.

## 7. Manager decision rules

- Only applications with status **pending** can be decided.
- Decision is either **approved** or **denied**.
- A denial requires a reason of at least **8 characters**.
- An approval reason is optional; if left empty the default reason is
  "The application meets the bank’s eligibility criteria."
- Each decision records: decision ID, status, reason, manager name and timestamp.
- The manager sees the score and recommendation but is not blocked from deciding either way.

## 8. Policy constants

| Constant | Value |
| --- | --- |
| Minimum age (approval) | 18 |
| Maximum age (approval) | 70 |
| Maximum age (form validation) | 75 |
| Maximum debt-to-income | 40% |
| Maximum missed payments | 2 |
| Maximum loan-to-income | 36× |
| Minimum loan amount | €500 |
| Maximum loan amount | €1,000,000 |
| Minimum duration | 6 months |
| Maximum duration | 360 months |
| Annual interest rate | 6.5% |
| Currency | EUR (€) |

All thresholds live in `src/config.ts`; the assessment logic is in `src/utils/loan.ts`.
