import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { api } from '../api';
import { DocumentUpload } from '../components/DocumentUpload';
import { Field, MoneyInput, SelectInput, Switch, TextInput } from '../components/Fields';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Close,
  FileText,
  Info,
  ShieldCheck,
} from '../components/Icons';
import { StatusBadge } from '../components/StatusBadge';
import { Toast, useToast } from '../components/Toast';
import {
  ANNUAL_INTEREST_RATE,
  ID_NUMBER_DIGITS,
  LOAN_DURATIONS,
  LOAN_PURPOSES,
  POLICY,
} from '../config';
import type {
  Assessment,
  IncomeDocument,
  LoanApplication,
  LoanApplicationInput,
} from '../types';
import { assessLoan } from '../utils/loan';
import {
  formatCurrency,
  formatDate,
  formatIdNumber,
  formatPercent,
  ratioTone,
  toNumber,
} from '../utils/format';
import { getRememberedApplicationIds, rememberApplication } from '../utils/storage';

interface FormState {
  fullName: string;
  idCardNumber: string;
  age: string;
  job: string;
  hasCDI: boolean;
  isMarried: boolean;
  numberOfChildren: string;
  monthlyIncome: string;
  totalDebt: string;
  savings: string;
  incomeDocument: IncomeDocument | null;
  loanAmount: string;
  loanDuration: string;
  loanPurpose: string;
  missedPayments: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  fullName: '',
  idCardNumber: '',
  age: '',
  job: '',
  hasCDI: false,
  isMarried: false,
  numberOfChildren: '0',
  monthlyIncome: '',
  totalDebt: '',
  savings: '',
  incomeDocument: null,
  loanAmount: '',
  loanDuration: '36',
  loanPurpose: '',
  missedPayments: '0',
};

const STEPS = ['Applicant', 'Finances', 'Loan request'];

const FIELD_LABELS: Record<keyof FormState, string> = {
  fullName: 'full name',
  idCardNumber: 'CNIB number',
  age: 'age',
  job: 'occupation',
  hasCDI: 'employment status',
  isMarried: 'marital status',
  numberOfChildren: 'number of children',
  monthlyIncome: 'monthly income',
  totalDebt: 'existing monthly debt',
  savings: 'savings',
  incomeDocument: 'proof of income',
  loanAmount: 'requested amount',
  loanDuration: 'loan term',
  loanPurpose: 'loan purpose',
  missedPayments: 'missed payments',
};

function formToInput(form: FormState): LoanApplicationInput {
  return {
    applicant: {
      fullName: form.fullName.trim(),
      idCardNumber: form.idCardNumber.trim(),
      age: toNumber(form.age),
      job: form.job.trim(),
      hasCDI: form.hasCDI,
      isMarried: form.isMarried,
      numberOfChildren: toNumber(form.numberOfChildren),
    },
    monthlyIncome: toNumber(form.monthlyIncome),
    totalDebt: toNumber(form.totalDebt),
    savings: toNumber(form.savings),
    incomeVerified: form.incomeDocument !== null,
    incomeDocument: form.incomeDocument,
    loanAmount: toNumber(form.loanAmount),
    loanDuration: toNumber(form.loanDuration),
    loanPurpose: form.loanPurpose,
    missedPayments: toNumber(form.missedPayments),
  };
}

function validateStep(step: number, form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (step === 1) {
    if (form.fullName.trim().length < 3) errors.fullName = 'Enter the applicant’s full name.';

    const idDigits = form.idCardNumber.replace(/\D/g, '');
    if (idDigits.length !== ID_NUMBER_DIGITS) {
      errors.idCardNumber = `Enter the ${ID_NUMBER_DIGITS}-digit number from the biometric ID card (CNIB).`;
    } else if (/^0+$/.test(idDigits)) {
      errors.idCardNumber = 'Enter the number printed on the ID card.';
    }

    const age = toNumber(form.age);
    if (!form.age || age < POLICY.minAge || age > POLICY.maxValidationAge) {
      errors.age = `Age must be between ${POLICY.minAge} and ${POLICY.maxValidationAge}.`;
    }

    if (!form.job.trim()) errors.job = 'Enter the applicant’s occupation.';

    const children = toNumber(form.numberOfChildren);
    if (!Number.isInteger(children) || children < 0 || children > 20) {
      errors.numberOfChildren = 'Enter 0 or more children.';
    }
  }

  if (step === 2) {
    if (toNumber(form.monthlyIncome) <= 0) errors.monthlyIncome = 'Enter a monthly income above zero.';
    if (!form.totalDebt || toNumber(form.totalDebt) < 0) errors.totalDebt = 'Enter existing monthly debt (0 if none).';
    if (!form.savings || toNumber(form.savings) < 0) errors.savings = 'Enter savings (0 if none).';
    if (!form.incomeDocument) {
      errors.incomeDocument = 'Upload a proof of income document.';
    }
  }

  if (step === 3) {
    const amount = toNumber(form.loanAmount);
    if (amount < POLICY.minLoanAmount) {
      errors.loanAmount = `Minimum request is ${formatCurrency(POLICY.minLoanAmount)}.`;
    } else if (amount > POLICY.maxLoanAmount) {
      errors.loanAmount = `Maximum request is ${formatCurrency(POLICY.maxLoanAmount)}.`;
    }

    const duration = toNumber(form.loanDuration);
    if (duration < POLICY.minDuration || duration > POLICY.maxDuration) {
      errors.loanDuration = 'Choose a valid loan term.';
    }

    if (!form.loanPurpose) errors.loanPurpose = 'Choose a loan purpose.';

    const missed = toNumber(form.missedPayments);
    if (!Number.isInteger(missed) || missed < 0 || missed > 50) {
      errors.missedPayments = 'Enter a number between 0 and 50.';
    }
  }

  return errors;
}

export function ClientPage() {
  const [tab, setTab] = useState<'apply' | 'track'>('apply');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<LoanApplication | null>(null);
  const [mine, setMine] = useState<LoanApplication[]>([]);
  const [mineLoading, setMineLoading] = useState(false);
  const { toast, show, dismiss } = useToast();

  const input = useMemo(() => formToInput(form), [form]);
  const assessment = useMemo(() => assessLoan(input), [input]);

  const refreshMine = useCallback(async () => {
    const ids = getRememberedApplicationIds();
    if (ids.length === 0) {
      setMine([]);
      return;
    }

    setMineLoading(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => api.getApplication(id)));
      const found = results
        .filter((result): result is PromiseFulfilledResult<LoanApplication> => result.status === 'fulfilled')
        .map((result) => result.value);
      setMine(found);
    } finally {
      setMineLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMine();
  }, [refreshMine]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goNext() {
    const nextErrors = validateStep(step, form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      show('Please fix the highlighted fields.', 'error');
      return;
    }
    setErrors({});
    setStep((current) => Math.min(current + 1, STEPS.length));
    scrollToTop();
  }

  function goBack() {
    setErrors({});
    setStep((current) => Math.max(current - 1, 1));
    scrollToTop();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const stepOneErrors = validateStep(1, form);
    const stepTwoErrors = validateStep(2, form);
    const stepThreeErrors = validateStep(3, form);

    if (
      Object.keys(stepOneErrors).length > 0 ||
      Object.keys(stepTwoErrors).length > 0 ||
      Object.keys(stepThreeErrors).length > 0
    ) {
      const firstInvalidStep = Object.keys(stepOneErrors).length > 0
        ? 1
        : Object.keys(stepTwoErrors).length > 0
          ? 2
          : 3;
      const firstInvalidErrors = [stepOneErrors, stepTwoErrors, stepThreeErrors][firstInvalidStep - 1];
      const invalidFields = Object.keys({ ...stepOneErrors, ...stepTwoErrors, ...stepThreeErrors }) as (keyof FormState)[];
      setErrors({ ...stepOneErrors, ...stepTwoErrors, ...stepThreeErrors });
      setStep(firstInvalidStep);
      const fieldNames = invalidFields.map((field) => FIELD_LABELS[field]);
      show(`Please check: ${fieldNames.join(', ')}.`, 'error');
      const firstField = Object.keys(firstInvalidErrors)[0];
      if (firstField) {
        window.setTimeout(() => {
          const field = document.getElementById(firstField);
          field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          field?.focus({ preventScroll: true });
        }, 0);
      }
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.createApplication(formToInput(form));
      rememberApplication(created.applicationId);
      setSubmitted(created);
      setMine((current) => [created, ...current]);
      show('Application submitted successfully.', 'success');
      scrollToTop();
    } catch (error) {
      show(error instanceof Error ? error.message : 'Could not submit the application.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function startNew() {
    setForm(EMPTY_FORM);
    setErrors({});
    setStep(1);
    setSubmitted(null);
    setTab('apply');
    scrollToTop();
  }

  function selectTab(next: 'apply' | 'track') {
    setTab(next);
    if (next === 'track') void refreshMine();
  }

  function handleTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = tab === 'apply' ? 'track' : 'apply';
    selectTab(next);
    window.setTimeout(() => document.getElementById(`tab-${next}`)?.focus(), 0);
  }

  return (
    <main className="page">
      <div className="container">
        <div className="page-head">
          <div>
            <span className="eyebrow">Client portal</span>
            <h1>Apply for a loan</h1>
            <p>
              Share your profile, income and requested terms. A bank manager reviews every
              application and records the final decision.
            </p>
          </div>
          <div className="head-actions">
            <span className="secure-note">
              <ShieldCheck size={15} /> Applicant session
            </span>
          </div>
        </div>

        <div className="client-tabs" role="tablist" aria-label="Client portal sections">
          <button
            type="button"
            id="tab-apply"
            role="tab"
            aria-selected={tab === 'apply'}
            tabIndex={tab === 'apply' ? 0 : -1}
            className={`tab ${tab === 'apply' ? 'active' : ''}`}
            onClick={() => selectTab('apply')}
            onKeyDown={handleTabKeyDown}
          >
            New application
          </button>
          <button
            type="button"
            id="tab-track"
            role="tab"
            aria-selected={tab === 'track'}
            tabIndex={tab === 'track' ? 0 : -1}
            className={`tab ${tab === 'track' ? 'active' : ''}`}
            onClick={() => selectTab('track')}
            onKeyDown={handleTabKeyDown}
          >
            My requests
            {mine.length > 0 && <span className="tab-count">{mine.length}</span>}
          </button>
        </div>

        <div
          className="client-tab-panel"
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
        >
          {tab === 'track' ? (
            <MyRequests applications={mine} loading={mineLoading} onApply={startNew} />
          ) : submitted ? (
            <SuccessPanel
              application={submitted}
              onNew={startNew}
              onTrack={() => selectTab('track')}
            />
          ) : (
          <div className="client-grid">
            <section className="panel form-panel">
              <div className="stepper" aria-label={`Step ${step} of ${STEPS.length}`}>
                {STEPS.map((label, index) => {
                  const number = index + 1;
                  const state = number < step ? 'done' : number === step ? 'active' : '';
                  return (
                    <div className="stepper-group" key={label}>
                      {index > 0 && (
                        <span
                          className={`step-line ${number <= step ? 'done' : ''}`}
                          aria-hidden="true"
                        />
                      )}
                      <div className={`step ${state}`}>
                        <span className="step-num">{number < step ? <Check size={13} /> : number}</span>
                        <span className="step-label">{label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSubmit} noValidate>
                {step === 1 && (
                  <div className="step-body">
                    <h2>Applicant details</h2>
                    <p className="step-sub">Tell us who is applying for this loan.</p>

                    <div className="field-grid">
                      <Field
                        label="Full name"
                        htmlFor="fullName"
                        error={errors.fullName}
                        className="span-2"
                      >
                        <TextInput
                          id="fullName"
                          autoComplete="name"
                          placeholder="e.g. Sarah Mitchell"
                          value={form.fullName}
                          invalid={Boolean(errors.fullName)}
                          onChange={(event) => update('fullName', event.target.value)}
                        />
                      </Field>

                      <Field
                        label="National ID number (CNIB)"
                        htmlFor="idCardNumber"
                        error={errors.idCardNumber}
                        hint={`${ID_NUMBER_DIGITS} digits, as printed on the biometric ID card.`}
                      >
                        <TextInput
                          id="idCardNumber"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="e.g. 109 876 543 210 987 654"
                          maxLength={ID_NUMBER_DIGITS + 5}
                          value={formatIdNumber(form.idCardNumber)}
                          invalid={Boolean(errors.idCardNumber)}
                          onChange={(event) =>
                            update(
                              'idCardNumber',
                              event.target.value.replace(/\D/g, '').slice(0, ID_NUMBER_DIGITS),
                            )
                          }
                        />
                      </Field>

                      <Field label="Age" htmlFor="age" error={errors.age}>
                        <TextInput
                          id="age"
                          type="number"
                          min={POLICY.minAge}
                          max={POLICY.maxValidationAge}
                          placeholder="e.g. 34"
                          value={form.age}
                          invalid={Boolean(errors.age)}
                          onChange={(event) => update('age', event.target.value)}
                        />
                      </Field>

                      <Field label="Occupation" htmlFor="job" error={errors.job}>
                        <TextInput
                          id="job"
                          placeholder="e.g. Product designer"
                          value={form.job}
                          invalid={Boolean(errors.job)}
                          onChange={(event) => update('job', event.target.value)}
                        />
                      </Field>

                      <Field label="Children" htmlFor="numberOfChildren" error={errors.numberOfChildren}>
                        <TextInput
                          id="numberOfChildren"
                          type="number"
                          min={0}
                          step={1}
                          value={form.numberOfChildren}
                          invalid={Boolean(errors.numberOfChildren)}
                          onChange={(event) => update('numberOfChildren', event.target.value)}
                        />
                      </Field>
                    </div>

                    <div className="switch-row">
                      <Switch
                        id="hasCDI"
                        checked={form.hasCDI}
                        onChange={(checked) => update('hasCDI', checked)}
                        label="Permanent contract (CDI)"
                        description="The applicant holds an open-ended employment contract."
                      />
                      <Switch
                        id="isMarried"
                        checked={form.isMarried}
                        onChange={(checked) => update('isMarried', checked)}
                        label="Married"
                        description="Household status may affect affordability."
                      />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="step-body">
                    <h2>Financial position</h2>
                    <p className="step-sub">
                      Monthly figures, before the new loan installment is added.
                    </p>

                    <div className="field-grid">
                      <Field
                        label="Monthly net income"
                        htmlFor="monthlyIncome"
                        error={errors.monthlyIncome}
                      >
                        <MoneyInput
                          id="monthlyIncome"
                          placeholder="0"
                          min={0}
                          step={50}
                          value={form.monthlyIncome}
                          invalid={Boolean(errors.monthlyIncome)}
                          onChange={(event) => update('monthlyIncome', event.target.value)}
                        />
                      </Field>

                      <Field
                        label="Existing monthly debt"
                        htmlFor="totalDebt"
                        error={errors.totalDebt}
                        hint="Loans, credit cards, rent commitments."
                      >
                        <MoneyInput
                          id="totalDebt"
                          placeholder="0"
                          min={0}
                          step={10}
                          value={form.totalDebt}
                          invalid={Boolean(errors.totalDebt)}
                          onChange={(event) => update('totalDebt', event.target.value)}
                        />
                      </Field>

                      <Field label="Savings" htmlFor="savings" error={errors.savings}>
                        <MoneyInput
                          id="savings"
                          placeholder="0"
                          min={0}
                          step={100}
                          value={form.savings}
                          invalid={Boolean(errors.savings)}
                          onChange={(event) => update('savings', event.target.value)}
                        />
                      </Field>

                      <Field
                        label="Missed payments"
                        htmlFor="missedPayments"
                        error={errors.missedPayments}
                        hint="In the last 12 months."
                      >
                        <TextInput
                          id="missedPayments"
                          type="number"
                          min={0}
                          step={1}
                          value={form.missedPayments}
                          invalid={Boolean(errors.missedPayments)}
                          onChange={(event) => update('missedPayments', event.target.value)}
                        />
                      </Field>
                    </div>

                    <div className="upload-section">
                      <div className="upload-head">
                        <div>
                          <h3>Proof of income</h3>
                          <p>Attach one document that confirms your declared monthly income.</p>
                        </div>
                        <span className="required-pill">Required</span>
                      </div>

                      <DocumentUpload
                        id="incomeDocument"
                        value={form.incomeDocument}
                        onChange={(document) => update('incomeDocument', document)}
                        invalid={Boolean(errors.incomeDocument)}
                        hasCDI={form.hasCDI}
                      />
                    </div>

                    <div className="inline-note">
                      <Info size={16} />
                      <span>
                        Your debt-to-income ratio is calculated with the estimated installment of
                        this new loan. A ratio under {POLICY.maxDebtRatio * 100}% is required by policy.
                      </span>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="step-body">
                    <h2>Loan request</h2>
                    <p className="step-sub">Set the amount, term and purpose of the financing.</p>

                    <div className="field-grid">
                      <Field label="Requested amount" htmlFor="loanAmount" error={errors.loanAmount}>
                        <MoneyInput
                          id="loanAmount"
                          placeholder="0"
                          min={POLICY.minLoanAmount}
                          max={POLICY.maxLoanAmount}
                          step={500}
                          value={form.loanAmount}
                          invalid={Boolean(errors.loanAmount)}
                          onChange={(event) => update('loanAmount', event.target.value)}
                        />
                      </Field>

                      <Field label="Term" htmlFor="loanDuration" error={errors.loanDuration}>
                        <SelectInput
                          id="loanDuration"
                          value={form.loanDuration}
                          invalid={Boolean(errors.loanDuration)}
                          onChange={(event) => update('loanDuration', event.target.value)}
                        >
                          {LOAN_DURATIONS.map((months) => (
                            <option key={months} value={months}>
                              {months} months
                            </option>
                          ))}
                        </SelectInput>
                      </Field>

                      <Field label="Purpose" htmlFor="loanPurpose" error={errors.loanPurpose} className="span-2">
                        <SelectInput
                          id="loanPurpose"
                          value={form.loanPurpose}
                          invalid={Boolean(errors.loanPurpose)}
                          onChange={(event) => update('loanPurpose', event.target.value)}
                        >
                          <option value="">Select a purpose</option>
                          {LOAN_PURPOSES.map((purpose) => (
                            <option key={purpose} value={purpose}>
                              {purpose}
                            </option>
                          ))}
                        </SelectInput>
                      </Field>
                    </div>

                    <div className="review-box">
                      <h3>Review before submitting</h3>
                      <dl>
                        <div>
                          <dt>Applicant</dt>
                          <dd>{form.fullName || '—'}</dd>
                        </div>
                        <div>
                          <dt>Monthly income</dt>
                          <dd>{form.monthlyIncome ? formatCurrency(toNumber(form.monthlyIncome)) : '—'}</dd>
                        </div>
                        <div>
                          <dt>Amount</dt>
                          <dd>{form.loanAmount ? formatCurrency(toNumber(form.loanAmount)) : '—'}</dd>
                        </div>
                        <div>
                          <dt>Term</dt>
                          <dd>{form.loanDuration} months</dd>
                        </div>
                        <div>
                          <dt>Purpose</dt>
                          <dd>{form.loanPurpose || '—'}</dd>
                        </div>
                        <div>
                          <dt>Income proof</dt>
                          <dd>{form.incomeDocument ? form.incomeDocument.name : 'Not uploaded'}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                )}

                <div className="form-actions">
                  {step > 1 ? (
                    <button type="button" className="btn btn-ghost" onClick={goBack}>
                      <ArrowLeft size={16} /> Back
                    </button>
                  ) : (
                    <span />
                  )}

                  {step < STEPS.length ? (
                    <button type="button" className="btn btn-primary" onClick={goNext}>
                      Continue <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? (
                        <>
                          <span className="spinner" /> Submitting…
                        </>
                      ) : (
                        <>
                          Submit application <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </section>

            <aside className="summary-wrap">
              <SummaryCard form={form} assessment={assessment} />
            </aside>
          </div>
          )}
        </div>
      </div>

      <Toast toast={toast} onClose={dismiss} />
    </main>
  );
}

function SummaryCard({ form, assessment }: { form: FormState; assessment: Assessment }) {
  const amount = toNumber(form.loanAmount);
  const income = toNumber(form.monthlyIncome);
  const ready = amount > 0 && income > 0;
  const tone = ratioTone(assessment.debtRatio);

  return (
    <div className="panel summary">
      <div className="summary-head">
        <span className="summary-eyebrow">Estimated offer</span>
        <h3>Application summary</h3>

        <div className="summary-payment">
          {ready ? (
            <>
              <span>{formatCurrency(assessment.monthlyPayment)}</span>
              <small>/ month</small>
            </>
          ) : (
            <span className="summary-payment-empty">No estimate yet</span>
          )}
        </div>
        <p className="summary-sub">
          {ready
            ? `${formatCurrency(amount)} over ${form.loanDuration} months at ${(ANNUAL_INTEREST_RATE * 100).toFixed(1)}% p.a.`
            : 'Enter an amount and income to see an estimate.'}
        </p>
      </div>

      <div className="summary-body">
        <div className="summary-rows">
          <div>
            <span>Requested</span>
            <strong>{amount > 0 ? formatCurrency(amount) : '—'}</strong>
          </div>
          <div>
            <span>Total interest</span>
            <strong>{ready ? formatCurrency(assessment.totalInterest) : '—'}</strong>
          </div>
          <div>
            <span>Debt ratio</span>
            <strong className={`ratio-text ${tone}`}>
              {ready ? formatPercent(assessment.debtRatio) : '—'}
            </strong>
          </div>
          <div>
            <span>Residual income</span>
            <strong>{ready ? formatCurrency(assessment.residualIncome) : '—'}</strong>
          </div>
        </div>

        <div className="ratio">
          <div className="ratio-head">
            <span>Debt-to-income</span>
            <span>{ready ? formatPercent(assessment.debtRatio) : '—'}</span>
          </div>
          <div className="ratio-track">
            <span
              className={`ratio-fill ${ready ? tone : 'empty'}`}
              style={{ width: `${ready ? Math.min(Math.max(assessment.debtRatio, 0) * 100, 100) : 0}%` }}
            />
            <i className="ratio-limit" style={{ left: `${POLICY.maxDebtRatio * 100}%` }} />
          </div>
          <div className="ratio-legend">
            <span>0%</span>
            <span>Policy limit {POLICY.maxDebtRatio * 100}%</span>
            <span>100%</span>
          </div>
        </div>

        {ready ? (
          <div className="checklist">
            <h4>Eligibility signals</h4>
            {assessment.checks.map((check) => (
              <div
                key={check.id}
                className={`check-item ${check.passed ? 'pass' : check.severity === 'required' ? 'fail' : 'warn'}`}
              >
                <span className="check-icon">
                  {check.passed ? (
                    <Check size={13} />
                  ) : check.severity === 'required' ? (
                    <Close size={13} />
                  ) : (
                    <Info size={13} />
                  )}
                </span>
                <strong>{check.label}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="summary-empty">
            <Info size={17} />
            <span>Fill in the income and requested amount to see your indicative assessment.</span>
          </div>
        )}

        <p className="disclaimer">
          Indicative estimate only. Final terms and the approval decision are set by the bank.
        </p>
      </div>
    </div>
  );
}

function SuccessPanel({
  application,
  onNew,
  onTrack,
}: {
  application: LoanApplication;
  onNew: () => void;
  onTrack: () => void;
}) {
  const assessment = assessLoan(application);
  return (
    <section className="panel success-panel">
      <div className="success-icon">
        <Check size={30} />
      </div>
      <h2>Application received</h2>
      <p>
        Your request has been added to the manager’s review queue. You can follow its progress
        from the “My requests” tab at any time.
      </p>
      <span className="success-ref">{application.applicationId}</span>

      <div className="success-grid">
        <div className="success-stat">
          <span>Requested amount</span>
          <strong>{formatCurrency(application.loanAmount)}</strong>
        </div>
        <div className="success-stat">
          <span>Est. monthly payment</span>
          <strong>{formatCurrency(assessment.monthlyPayment)}</strong>
        </div>
        <div className="success-stat">
          <span>Current status</span>
          <strong className="status-inline">
            <Clock size={14} /> Pending review
          </strong>
        </div>
      </div>

      <div className="success-actions">
        <button type="button" className="btn btn-primary" onClick={onTrack}>
          Track this request <ArrowRight size={16} />
        </button>
        <button type="button" className="btn btn-ghost" onClick={onNew}>
          Start another application
        </button>
      </div>
    </section>
  );
}

function MyRequests({
  applications,
  loading,
  onApply,
}: {
  applications: LoanApplication[];
  loading: boolean;
  onApply: () => void;
}) {
  if (loading) {
    return (
      <div className="panel loading-panel">
        <span className="spinner" /> Loading your requests…
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="panel empty-state">
        <div className="empty-icon">
          <FileText size={24} />
        </div>
        <h3>No applications yet</h3>
        <p>Once you submit a loan request it will appear here with its live decision status.</p>
        <button type="button" className="btn btn-primary" onClick={onApply}>
          Start an application <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="track-list">
      {applications.map((application) => (
        <article className="panel track-card" key={application.applicationId}>
          <div className="track-top">
            <div>
              <span className="track-ref">{application.applicationId}</span>
              <h3>
                {formatCurrency(application.loanAmount)} · {application.loanDuration} months
              </h3>
              <p className="track-meta">
                {application.loanPurpose} · submitted {formatDate(application.createdAt)}
              </p>
            </div>
            <StatusBadge status={application.status} />
          </div>

          <RequestTimeline application={application} />

          {application.decision ? (
            <div className={`decision-note ${application.status}`}>
              <span className="decision-note-icon">
                {application.status === 'approved' ? <Check size={16} /> : <Close size={16} />}
              </span>
              <div>
                <strong>
                  {application.status === 'approved' ? 'Loan approved' : 'Loan denied'}
                </strong>
                <p>{application.decision.reason}</p>
                <span className="decision-meta">
                  {application.decision.managerName} · {formatDate(application.decision.decisionDate)}
                </span>
              </div>
            </div>
          ) : (
            <p className="track-hint">
              <Clock size={14} /> A bank manager is reviewing your file. No action is needed.
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

function RequestTimeline({ application }: { application: LoanApplication }) {
  const decided = application.status !== 'pending';
  return (
    <div className="track-timeline">
      <div className="tl-step done">
        <span className="tl-dot">
          <Check size={12} />
        </span>
        Submitted
      </div>
      <span className={`tl-line ${decided ? 'done' : ''}`} />
      <div className={`tl-step ${decided ? 'done' : ''}`}>
        <span className="tl-dot">{decided ? <Check size={12} /> : <Clock size={12} />}</span>
        Under review
      </div>
      <span className={`tl-line ${decided ? 'done' : ''}`} />
      <div className={`tl-step ${decided ? 'done' : ''}`}>
        <span className="tl-dot">
          {application.status === 'approved' ? (
            <Check size={12} />
          ) : application.status === 'denied' ? (
            <Close size={12} />
          ) : (
            <Clock size={12} />
          )}
        </span>
        {decided ? 'Decision issued' : 'Awaiting decision'}
      </div>
    </div>
  );
}
