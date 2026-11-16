import { useEffect, useMemo, useState } from 'react';
import { Field, TextArea } from './Fields';
import { DocumentViewer } from './DocumentViewer';
import { AlertTriangle, Check, Close, Clock, Eye, FileText, ShieldCheck } from './Icons';
import { StatusBadge } from './StatusBadge';
import type { DecisionInput, LoanApplication } from '../types';
import { assessLoan, recommendationCopy } from '../utils/loan';
import {
  avatarTone,
  formatCurrency,
  formatCurrencyPrecise,
  formatDateTime,
  formatIdNumber,
  formatPercent,
  initials,
} from '../utils/format';
import {
  formatFileSize,
  isImageDocument,
} from '../utils/documents';

interface ApplicationDrawerProps {
  application: LoanApplication;
  onClose: () => void;
  onDecide: (application: LoanApplication, input: DecisionInput) => Promise<LoanApplication>;
}

export function ApplicationDrawer({
  application,
  onClose,
  onDecide,
}: ApplicationDrawerProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState<'approved' | 'denied' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState(false);

  const assessment = useMemo(() => assessLoan(application), [application]);
  const copy = recommendationCopy(assessment.recommendation);
  const pending = application.status === 'pending';
  const incomeDocument = application.incomeDocument;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  async function decide(status: 'approved' | 'denied') {
    if (submitting) return;

    if (status === 'denied' && reason.trim().length < 8) {
      setError('Add a short reason (at least 8 characters) so the applicant understands the decision.');
      return;
    }

    setError(null);
    setSubmitting(status);
    try {
      await onDecide(application, {
        status,
        reason: reason.trim() || 'The application meets the bank’s eligibility criteria.',
      });
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Could not save the decision.');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="drawer-overlay" onMouseDown={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="drawer-head">
          <div className="drawer-title-row">
            <div className="person">
              <span className={`avatar avatar-lg ${avatarTone(application.applicant.fullName)}`}>
                {initials(application.applicant.fullName)}
              </span>
              <div>
                <h2 id="drawer-title">{application.applicant.fullName}</h2>
                <p>
                  <span className="mono">{application.applicationId}</span> · submitted{' '}
                  {formatDateTime(application.createdAt)}
                </p>
              </div>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close details">
              <Close size={17} />
            </button>
          </div>
          <div className="drawer-badges">
            <StatusBadge status={application.status} />
            <span className="pill">{formatCurrency(application.loanAmount)} requested</span>
            <span className="pill">{application.loanPurpose}</span>
            <span className="pill">{application.loanDuration} months</span>
          </div>
        </header>

        <div className="drawer-body">
          <section className="drawer-section">
            <h3>Requested loan</h3>
            <div className="tile-grid">
              <div className="tile">
                <span>Amount</span>
                <strong>{formatCurrency(application.loanAmount)}</strong>
              </div>
              <div className="tile">
                <span>Term</span>
                <strong>{application.loanDuration} months</strong>
              </div>
              <div className="tile">
                <span>Est. monthly payment</span>
                <strong>{formatCurrencyPrecise(assessment.monthlyPayment)}</strong>
              </div>
              <div className="tile">
                <span>Est. total interest</span>
                <strong>{formatCurrencyPrecise(assessment.totalInterest)}</strong>
              </div>
            </div>
          </section>

          <section className="drawer-section">
            <h3>Applicant profile</h3>
            <div className="detail-grid">
              <div>
                <span>Age</span>
                <strong>{application.applicant.age} years</strong>
              </div>
              <div>
                <span>Occupation</span>
                <strong>{application.applicant.job}</strong>
              </div>
              <div>
                <span>ID card number (CNIB)</span>
                <strong>{formatIdNumber(application.applicant.idCardNumber)}</strong>
              </div>
              <div>
                <span>Permanent contract</span>
                <strong>{application.applicant.hasCDI ? 'Yes (CDI)' : 'No'}</strong>
              </div>
              <div>
                <span>Marital status</span>
                <strong>{application.applicant.isMarried ? 'Married' : 'Single'}</strong>
              </div>
              <div>
                <span>Children</span>
                <strong>{application.applicant.numberOfChildren}</strong>
              </div>
            </div>
          </section>

          <section className="drawer-section">
            <h3>Financial position</h3>
            <div className="detail-grid">
              <div>
                <span>Monthly income</span>
                <strong>{formatCurrency(application.monthlyIncome)}</strong>
              </div>
              <div>
                <span>Existing monthly debt</span>
                <strong>{formatCurrency(application.totalDebt)}</strong>
              </div>
              <div>
                <span>Savings</span>
                <strong>{formatCurrency(application.savings)}</strong>
              </div>
              <div>
                <span>Income verified</span>
                <strong className={application.incomeVerified ? 'text-green' : 'text-red'}>
                  {application.incomeVerified ? 'Yes' : 'No'}
                </strong>
              </div>
              <div>
                <span>Missed payments</span>
                <strong>{application.missedPayments}</strong>
              </div>
              <div>
                <span>Debt-to-income</span>
                <strong>{formatPercent(assessment.debtRatio)}</strong>
              </div>
            </div>
          </section>

          <section className="drawer-section">
            <div className="drawer-section-head">
              <h3>Proof of income</h3>
              {incomeDocument?.dataUrl && (
                <span className="doc-ready">
                  <Check size={11} /> Attached
                </span>
              )}
            </div>
            {incomeDocument ? (
              <div className="doc-card review">
                {isImageDocument(incomeDocument) ? (
                  <button
                    type="button"
                    className="doc-thumb-button"
                    onClick={() => setViewingDocument(true)}
                    aria-label={`Preview ${incomeDocument.name}`}
                  >
                    <img src={incomeDocument.dataUrl} alt="" className="doc-thumb" />
                    <span className="doc-thumb-overlay">
                      <Eye size={14} />
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="doc-icon doc-icon-button"
                    onClick={() => incomeDocument.dataUrl && setViewingDocument(true)}
                    aria-label={`Preview ${incomeDocument.name}`}
                  >
                    <FileText size={20} />
                  </button>
                )}

                <div className="doc-info">
                  <strong className="doc-name" title={incomeDocument.name}>
                    {incomeDocument.name}
                  </strong>
                  <span className="doc-meta">
                    {formatFileSize(incomeDocument.size)} · uploaded{' '}
                    {formatDateTime(incomeDocument.uploadedAt)}
                  </span>
                  <span className={`doc-state ${incomeDocument.dataUrl ? '' : 'muted'}`}>
                    {incomeDocument.dataUrl ? (
                      <>
                        <Check size={12} /> Available for review
                      </>
                    ) : (
                      'Stored on the server — open to review'
                    )}
                  </span>
                </div>

                {incomeDocument.dataUrl ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setViewingDocument(true)}
                  >
                    <Eye size={14} /> View document
                  </button>
                ) : (
                  <span className="doc-meta doc-unavailable">Preview unavailable</span>
                )}
              </div>
            ) : (
              <p className="track-hint">
                <FileText size={14} /> No proof of income was uploaded with this application.
              </p>
            )}
          </section>

          <section className="drawer-section">
            <h3>Eligibility assessment</h3>

            <div className={`recommendation ${assessment.recommendation}`}>
              <span className="recommendation-icon">
                {assessment.recommendation === 'strong' ? (
                  <ShieldCheck size={19} />
                ) : (
                  <AlertTriangle size={19} />
                )}
              </span>
              <div>
                <strong>{copy.title}</strong>
                <p>{copy.description}</p>
              </div>
              <span className="score">
                {assessment.score}
                <small>/100</small>
              </span>
            </div>

            <ul className="check-list">
              {assessment.checks.map((check) => {
                const state = check.passed
                  ? 'pass'
                  : check.severity === 'required'
                    ? 'fail'
                    : 'warn';
                return (
                  <li key={check.id} className={state}>
                    <span className="check-icon">
                      {check.passed ? (
                        <Check size={12} />
                      ) : check.severity === 'required' ? (
                        <Close size={12} />
                      ) : (
                        <AlertTriangle size={12} />
                      )}
                    </span>
                    <div>
                      <strong>{check.label}</strong>
                      <span className="check-detail">{check.detail}</span>
                    </div>
                    <span className="check-state">
                      {check.passed ? 'Met' : check.severity === 'required' ? 'Not met' : 'Review'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="drawer-section">
            <h3>Decision</h3>

            {pending ? (
              <div className="decision-form">
                <Field
                  label="Decision reason"
                  htmlFor="decisionReason"
                  hint="Required when denying. Shared with the applicant on their decision record."
                >
                  <TextArea
                    id="decisionReason"
                    rows={3}
                    value={reason}
                    invalid={Boolean(error)}
                    onChange={(event) => {
                      setReason(event.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Explain the basis for the decision…"
                  />
                </Field>

                {error && (
                  <div className="error-box" role="alert">
                    <AlertTriangle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="decision-actions">
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => void decide('approved')}
                    disabled={submitting !== null}
                  >
                    {submitting === 'approved' ? <span className="spinner" /> : <Check size={16} />}
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => void decide('denied')}
                    disabled={submitting !== null}
                  >
                    {submitting === 'denied' ? <span className="spinner" /> : <Close size={16} />}
                    Deny
                  </button>
                </div>
              </div>
            ) : application.decision ? (
              <div className={`decision-card ${application.status}`}>
                <span className="decision-icon">
                  {application.status === 'approved' ? <Check size={19} /> : <Close size={19} />}
                </span>
                <div>
                  <strong>
                    {application.status === 'approved' ? 'Application approved' : 'Application denied'}
                  </strong>
                  <p>{application.decision.reason}</p>
                  <span className="decision-meta">
                    {application.decision.managerName} ·{' '}
                    {formatDateTime(application.decision.decisionDate)} ·{' '}
                    {application.decision.decisionId}
                  </span>
                </div>
              </div>
            ) : (
              <p className="track-hint">
                <Clock size={14} /> No decision has been recorded yet.
              </p>
            )}
          </section>
        </div>
      </aside>

      {viewingDocument && incomeDocument && (
        <DocumentViewer
          document={incomeDocument}
          onClose={() => setViewingDocument(false)}
        />
      )}
    </div>
  );
}
