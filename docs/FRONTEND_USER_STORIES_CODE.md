# Frontend — code for each user story task

Feature: **Frontend — Presentation Layer**

Each section below contains the actual implementation for one task. Code is copied from the project files; the line ranges refer to the files as they are now. Long sections are split into the files and responsibilities that make up the task.

Companion document: [FRONTEND_USER_STORIES_TASKS.md](FRONTEND_USER_STORIES_TASKS.md).

| Story | Task | Code |
| --- | --- | --- |
| View and Review Loan Applications | 1.1 | `App.tsx`, `auth.ts`, `AdminPage.tsx`, `styles.css` |
| View and Review Loan Applications | 1.2 | `ApplicationDrawer.tsx`, `DocumentViewer.tsx`, `demoApi.ts` |
| Submit Loan Application | 2.1 | `ClientPage.tsx`, `demoApi.ts`, `storage.ts`, `api/index.ts` |
| Submit Loan Application | 2.2 | `ClientPage.tsx` |
| Enter Applicant and Loan Information | 3.1 | `ClientPage.tsx`, `Fields.tsx`, `config.ts` |
| Enter Applicant and Loan Information | 3.2 | `ClientPage.tsx`, `loan.ts`, `config.ts` |
| Display Loan Application Form | 4.1 | `ClientPage.tsx`, `styles.css` |
| Display Loan Application Form | 4.2 | `Fields.tsx`, `DocumentUpload.tsx`, `documents.ts`, `config.ts` |

---

## Task 1.1 — Manager review queue with portfolio stats, search, status filters and sorting

Protected manager console that turns stored applications into a review queue: KPI counts, keyword search, status filters, sorting, desktop table and mobile cards.

### `src/App.tsx` — lines 45–62

The manager route renders the console only when a session exists; otherwise the login page is shown.

```tsx
  return (
    <div className="app">
      <Header
        view={view}
        onNavigate={navigate}
        manager={manager}
        onSignOut={handleSignOut}
      />
      {view === 'landing' && <LandingPage onNavigate={navigate} />}
      {view === 'client' && <ClientPage />}
      {view === 'admin' &&
        (manager ? (
          <AdminPage managerName={manager.name} />
        ) : (
          <ManagerLoginPage onSignIn={handleSignIn} />
        ))}
    </div>
  );
```

### Manager authentication

src/auth.ts delegates sign-in and session checks to the REST API. FastAPI verifies passwords against Argon2id hashes in MySQL and sets an HTTP-only session cookie.

### `src/pages/AdminPage.tsx` — lines 69–103

KPI aggregation plus the filtered and sorted queue used by the table and cards.

```tsx
  const stats = useMemo(
    () => ({
      pending: applications.filter((application) => application.status === 'pending').length,
      approved: applications.filter((application) => application.status === 'approved').length,
      denied: applications.filter((application) => application.status === 'denied').length,
      volume: applications.reduce((total, application) => total + application.loanAmount, 0),
    }),
    [applications],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const result = applications.filter((application) => {
      if (statusFilter !== 'all' && application.status !== statusFilter) return false;
      if (!needle) return true;

      const haystack = [
        application.applicant.fullName,
        application.applicant.idCardNumber,
        application.applicationId,
        application.loanPurpose,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });

    return result.sort((a, b) => {
      if (sort === 'amount') return b.loanAmount - a.loanAmount;
      const difference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sort === 'oldest' ? -difference : difference;
    });
  }, [applications, statusFilter, query, sort]);
```

### `src/pages/AdminPage.tsx` — lines 112–124

Decision handler: calls the API and replaces the row so the queue and KPIs update immediately.

```tsx
  async function handleDecision(application: LoanApplication, input: DecisionInput) {
    const updated = await api.decideApplication(application.applicationId, input);
    setApplications((current) =>
      current.map((item) => (item.applicationId === updated.applicationId ? updated : item)),
    );
    show(
      input.status === 'approved'
        ? `${application.applicant.fullName}’s loan was approved.`
        : `${application.applicant.fullName}’s loan was denied.`,
      'success',
    );
    return updated;
  }
```

### `src/pages/AdminPage.tsx` — lines 300–357

Desktop table row: shows applicant, reference, amount, debt ratio, status and opens the drawer on click or Enter/Space.

```tsx
                <tbody>
                  {filtered.map((application) => {
                    const ratio = assessLoan(application).debtRatio;
                    return (
                      <tr
                        key={application.applicationId}
                        tabIndex={0}
                        onClick={() => setSelectedId(application.applicationId)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedId(application.applicationId);
                          }
                        }}
                      >
                        <td>
                          <div className="person">
                            <span className={`avatar ${avatarTone(application.applicant.fullName)}`}>
                              {initials(application.applicant.fullName)}
                            </span>
                            <div>
                              <strong>{application.applicant.fullName}</strong>
                              <span className="cell-sub">
                                {formatIdNumber(application.applicant.idCardNumber)}
                                {application.incomeDocument && (
                                  <span className="doc-flag" title="Proof of income attached">
                                    <Paperclip size={10} /> doc
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="mono">{application.applicationId}</span>
                        </td>
                        <td>{application.loanPurpose}</td>
                        <td className="num">
                          <strong>{formatCurrency(application.loanAmount)}</strong>
                          <span className="cell-sub">{application.loanDuration} months</span>
                        </td>
                        <td>
                          <RatioPill ratio={ratio} />
                        </td>
                        <td>
                          <span className="cell-sub" title={formatDate(application.createdAt)}>
                            {relativeTime(application.createdAt)}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={application.status} />
                        </td>
                        <td>
                          <ChevronRight size={16} className="row-chevron" />
                        </td>
                      </tr>
                    );
                  })}
```

### `src/styles.css` — lines 3474–3488

Below 900 px the table is hidden and the card list is used instead.

```css
  .desktop-table {
    display: none;
  }

  .mobile-list {
    display: grid;
    gap: 10px;
  }

  .app-card {
    display: block;
    width: 100%;
    text-align: left;
    padding: 16px;
  }
```

---

## Task 1.2 — Review drawer with eligibility scoring, proof-of-income preview and the approve/deny decision

Full file review in a side drawer: profile, financials, eligibility assessment, document preview, and an auditable decision form.

### `src/components/ApplicationDrawer.tsx` — lines 41–44

Assessment, recommendation copy, pending flag and the attached document.

```tsx
  const assessment = useMemo(() => assessLoan(application), [application]);
  const copy = recommendationCopy(assessment.recommendation);
  const pending = application.status === 'pending';
  const incomeDocument = application.incomeDocument;
```

### `src/components/ApplicationDrawer.tsx` — lines 59–80

Decision submission: denial requires at least 8 characters, approval gets a default reason.

```tsx
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
        managerName: manager.trim() || 'Bank manager',
      });
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Could not save the decision.');
    } finally {
      setSubmitting(null);
    }
  }
```

### `src/components/ApplicationDrawer.tsx` — lines 202–272

Proof-of-income section: thumbnail/PDF icon, file metadata and "View document".

```tsx
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
```

### `src/components/ApplicationDrawer.tsx` — lines 326–385

Decision form with manager name, reason, error box and approve/deny buttons.

```tsx
          <section className="drawer-section">
            <h3>Decision</h3>

            {pending ? (
              <div className="decision-form">
                <Field label="Manager" htmlFor="managerName">
                  <TextInput
                    id="managerName"
                    value={manager}
                    onChange={(event) => setManager(event.target.value)}
                    placeholder="Your name"
                  />
                </Field>

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
```

### `src/components/ApplicationDrawer.tsx` — lines 412–417

Document viewer mounted above the drawer.

```tsx
      {viewingDocument && incomeDocument && (
        <DocumentViewer
          document={incomeDocument}
          onClose={() => setViewingDocument(false)}
        />
      )}
```

### `src/api/demoApi.ts` — lines 424–451

Decision persisted with decision ID, status, reason, manager and timestamp; only pending files can be decided.

```ts
  async decideApplication(
    applicationId: string,
    input: DecisionInput,
  ): Promise<LoanApplication> {
    await simulateLatency();
    const applications = readStore();
    const index = applications.findIndex((item) => item.applicationId === applicationId);
    if (index === -1) throw new Error('Application not found.');

    const current = applications[index];
    if (current.status !== 'pending') throw new Error('This application has already been decided.');

    const updated: LoanApplication = {
      ...current,
      status: input.status,
      decision: {
        decisionId: uid('DEC'),
        status: input.status,
        reason: input.reason,
        decisionDate: new Date().toISOString(),
        managerName: input.managerName,
      },
    };

    applications[index] = updated;
    writeStore(applications);
    return updated;
  },
```

### `src/components/DocumentViewer.tsx` — lines 25–31

The stored data URL is converted to a blob URL so it can be rendered.

```tsx
  useEffect(() => {
    if (!incomeDocument.dataUrl) return;

    const url = URL.createObjectURL(dataUrlToBlob(incomeDocument.dataUrl));
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [incomeDocument]);
```

### `src/components/DocumentViewer.tsx` — lines 66–79

Images render inline; PDFs render in an iframe.

```tsx
        <div className={`viewer-body ${isImage ? 'image' : 'pdf'}`}>
          {objectUrl ? (
            isImage ? (
              <img
                src={objectUrl}
                alt={`Uploaded document: ${incomeDocument.name}`}
              />
            ) : (
              <iframe src={objectUrl} title={`Uploaded document: ${incomeDocument.name}`} />
            )
          ) : (
            <p className="viewer-empty">This demo record has no stored file to preview.</p>
          )}
        </div>
```

---

## Task 2.1 — Submit flow: step validation, reference generation and persistence

Validates all three steps, builds the API payload, creates the application with a unique reference and stores it for the manager queue.

### `src/pages/ClientPage.tsx` — lines 82–103

Form state converted to the domain payload; the uploaded document drives incomeVerified.

```tsx
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
```

### `src/pages/ClientPage.tsx` — lines 105–162

Per-step validation rules, including the 18-digit CNIB and policy limits.

```tsx
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
```

### `src/pages/ClientPage.tsx` — lines 233–267

Submit handler: re-validates every step, calls the API, remembers the reference and shows the confirmation.

```tsx
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
      setErrors({ ...stepOneErrors, ...stepTwoErrors, ...stepThreeErrors });
      setStep(
        Object.keys(stepOneErrors).length > 0 ? 1 : Object.keys(stepTwoErrors).length > 0 ? 2 : 3,
      );
      show('Some details are missing or invalid.', 'error');
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
```

### `src/api/demoApi.ts` — lines 385–394

Sequential reference generation in the form LA-YYYY-NNNN.

```ts
function nextReference(applications: LoanApplication[]): string {
  const year = new Date().getFullYear();
  const prefix = `LA-${year}-`;
  const highest = applications.reduce((max, application) => {
    if (!application.applicationId.startsWith(prefix)) return max;
    const value = Number(application.applicationId.slice(prefix.length));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(4, '0')}`;
}
```

### `src/api/demoApi.ts` — lines 409–422

Application created with pending status, applicant ID, timestamp and no decision.

```ts
  async createApplication(input: LoanApplicationInput): Promise<LoanApplication> {
    await simulateLatency();
    const applications = readStore();
    const application: LoanApplication = {
      ...input,
      applicant: { ...input.applicant, applicantId: uid('APL') },
      applicationId: nextReference(applications),
      status: 'pending',
      createdAt: new Date().toISOString(),
      decision: null,
    };
    writeStore([application, ...applications]);
    return application;
  },
```

### `src/utils/storage.ts` — lines 15–23

The reference is stored in the client's own tracking list.

```ts
export function rememberApplication(applicationId: string): void {
  try {
    const ids = getRememberedApplicationIds().filter((id) => id !== applicationId);
    ids.unshift(applicationId);
    window.localStorage.setItem(MY_APPLICATIONS_KEY, JSON.stringify(ids.slice(0, 25)));
  } catch {
    // Storage can be unavailable in private mode; tracking is non-critical.
  }
}
```

### `src/api/index.ts` — lines 17–19

Switch between the localStorage demo API and the real HTTP API.

```ts
export const isDemo = !import.meta.env.VITE_API_URL;

export const api: LoanApi = isDemo ? demoApi : httpApi;
```

---

## Task 2.2 — Confirmation screen and client tracking timeline

Confirms receipt with the reference and estimated payment, then lets the client follow each request through status, timeline and decision.

### `src/pages/ClientPage.tsx` — lines 178–195

Remembered references are resolved to live applications.

```tsx
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
```

### `src/pages/ClientPage.tsx` — lines 781–830

Confirmation panel: reference, amount, estimated monthly payment and current status.

```tsx
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
```

### `src/pages/ClientPage.tsx` — lines 864–906

Request cards with reference, amount, purpose, status badge and decision details.

```tsx
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
```

### `src/pages/ClientPage.tsx` — lines 909–939

Three-stage timeline: submitted, under review, decision issued.

```tsx
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
```

---

## Task 3.1 — Applicant step with CNIB, age, occupation, family and employment inputs

Identity step of the form with the 18-digit CNIB, age bounds, occupation, children, marital status and CDI switch.

### `src/pages/ClientPage.tsx` — lines 108–129

Step 1 validation: name, exactly 18 CNIB digits, age range, occupation and children.

```tsx
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
```

### `src/pages/ClientPage.tsx` — lines 351–448

Applicant step markup, including CNIB formatting on input and the two switches.

```tsx
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
```

### `src/components/Fields.tsx` — lines 15–32

Field wrapper: label, hint and inline error.

```tsx
export function Field({ label, htmlFor, hint, error, className = '', children }: FieldProps) {
  return (
    <div className={`field ${className}`}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <span className="field-error" id={`${htmlFor}-error`}>
          <AlertTriangle size={13} />
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  );
}
```

### `src/components/Fields.tsx` — lines 38–46

Text input with an accessible invalid state.

```tsx
export function TextInput({ invalid = false, className = '', ...props }: TextInputProps) {
  return (
    <input
      {...props}
      className={`input ${invalid ? 'invalid' : ''} ${className}`}
      aria-invalid={invalid || undefined}
    />
  );
}
```

### `src/components/Fields.tsx` — lines 99–119

Accessible switch used for CDI and marital status.

```tsx
export function Switch({ id, checked, onChange, label, description }: SwitchProps) {
  return (
    <div className="switch-card">
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        className="switch"
        onClick={() => onChange(!checked)}
      >
        <span className="sr-only">{label}</span>
      </button>
      <div className="switch-text">
        <strong id={`${id}-label`}>{label}</strong>
        <span>{description}</span>
      </div>
    </div>
  );
}
```

### `src/config.ts` — lines 10–14

CNIB length constant.

```ts
/**
 * Algeria's biometric national identity card (CNIB) carries an 18-digit
 * number. Spaces are stripped before validation.
 */
export const ID_NUMBER_DIGITS = 18;
```

### `src/config.ts` — lines 26–37

Age limits used by the form and the assessment.

```ts
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
```

---

## Task 3.2 — Finances and loan-term steps with live payment and debt-ratio assessment

Captures income, debt, savings, missed payments and loan terms, then computes the installment, debt ratio, residual income and eligibility checks live.

### `src/config.ts` — lines 26–51

Policy thresholds, loan purposes and allowed durations.

```ts
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
```

### `src/utils/loan.ts` — lines 10–19

Annuity formula used for the monthly installment.

```ts
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
```

### `src/utils/loan.ts` — lines 33–38

Derived figures: repayment, interest, debt-to-income, residual income and loan-to-income.

```ts
  const monthlyPayment = calculateMonthlyPayment(loanAmount, ANNUAL_INTEREST_RATE, loanDuration);
  const totalRepayment = monthlyPayment * Math.max(loanDuration, 0);
  const totalInterest = Math.max(totalRepayment - loanAmount, 0);
  const debtRatio = monthlyIncome > 0 ? (totalDebt + monthlyPayment) / monthlyIncome : 1;
  const residualIncome = monthlyIncome - totalDebt - monthlyPayment;
  const loanToIncome = monthlyIncome > 0 ? loanAmount / monthlyIncome : Infinity;
```

### `src/utils/loan.ts` — lines 40–112

Required and advisory checks, score and recommendation.

```ts
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
```

### `src/pages/ClientPage.tsx` — lines 451–548

Finances step, including the mandatory proof-of-income upload.

```tsx
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
```

### `src/pages/ClientPage.tsx` — lines 550–631

Loan request step with amount, term, purpose and the review box.

```tsx
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
```

### `src/pages/ClientPage.tsx` — lines 675–743

Live summary: payment, interest, debt ratio against the 40% policy marker and eligibility signals.

```tsx
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
```

---

## Task 4.1 — Responsive three-step form layout, stepper and sticky summary panel

The form's presentation shell: tabs, three-step stepper, form panel plus summary aside, and the breakpoints that make it usable on smaller screens.

### `src/pages/ClientPage.tsx` — lines 278–350

Page shell, client tabs, two-column grid and the stepper state calculation.

```tsx
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
              <ShieldCheck size={15} /> Encrypted session
            </span>
          </div>
        </div>

        <div className="client-tabs" role="tablist" aria-label="Client portal sections">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'apply'}
            className={`tab ${tab === 'apply' ? 'active' : ''}`}
            onClick={() => setTab('apply')}
          >
            New application
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'track'}
            className={`tab ${tab === 'track' ? 'active' : ''}`}
            onClick={() => {
              setTab('track');
              void refreshMine();
            }}
          >
            My requests
            {mine.length > 0 && <span className="tab-count">{mine.length}</span>}
          </button>
        </div>

        {tab === 'track' ? (
          <MyRequests applications={mine} loading={mineLoading} onApply={startNew} />
        ) : submitted ? (
          <SuccessPanel application={submitted} onNew={startNew} onTrack={() => setTab('track')} />
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
```

### `src/pages/ClientPage.tsx` — lines 633–666

Back/Continue/Submit actions and the summary aside.

```tsx
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
```

### `src/styles.css` — lines 1477–1532

Two-column form grid, panel styling and stepper layout.

```css
.client-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 22px;
  align-items: start;
}

.panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: 0 1px 2px rgba(11, 18, 32, 0.04), 0 12px 32px -28px rgba(11, 18, 32, 0.4);
}

.form-panel {
  padding: 30px;
  position: relative;
  overflow: hidden;
}

.form-panel::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(90deg, #4f46e5, #7c3aed 40%, #06b6d4);
  opacity: 0.9;
}

.stepper {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
  padding: 12px 16px;
  border-radius: 14px;
  background: linear-gradient(180deg, #fbfbfe, #f7f8fc);
  border: 1px solid #eceff6;
}

.stepper-group {
  display: flex;
  align-items: center;
  flex: 1;
}

.stepper-group:last-child {
  flex: none;
}

.step {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--muted);
  flex: none;
}
```

### `src/styles.css` — lines 1635–1647

Form action bar and sticky summary wrapper.

```css
.form-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}

.summary-wrap {
  position: sticky;
  top: 96px;
}
```

### `src/styles.css` — lines 3444–3450

Below 1120 px the summary moves under the form.

```css
  .client-grid {
    grid-template-columns: 1fr;
  }

  .summary-wrap {
    position: static;
  }
```

### `src/styles.css` — lines 3664–3674

Below 760 px fields and switches become single-column.

```css
  .field-grid {
    grid-template-columns: 1fr;
  }

  .field-grid .span-2 {
    grid-column: span 1;
  }

  .switch-row {
    grid-template-columns: 1fr;
  }
```

---

## Task 4.2 — Reusable field controls and the drag-and-drop proof-of-income upload

Shared inputs with consistent validation styling, plus an upload widget with drag-and-drop, type/size enforcement, compression and preview.

### `src/components/Fields.tsx` — lines 15–32

Field wrapper shows either the hint or the error, never both.

```tsx
export function Field({ label, htmlFor, hint, error, className = '', children }: FieldProps) {
  return (
    <div className={`field ${className}`}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <span className="field-error" id={`${htmlFor}-error`}>
          <AlertTriangle size={13} />
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  );
}
```

### `src/components/Fields.tsx` — lines 48–89

Money, select and textarea controls with invalid styling.

```tsx
interface MoneyInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function MoneyInput({ invalid = false, className = '', ...props }: MoneyInputProps) {
  return (
    <div className={`money ${invalid ? 'invalid' : ''} ${className}`}>
      <span aria-hidden="true">{CURRENCY_SYMBOL}</span>
      <input {...props} inputMode="decimal" aria-invalid={invalid || undefined} />
    </div>
  );
}

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function SelectInput({ invalid = false, className = '', children, ...props }: SelectInputProps) {
  return (
    <select
      {...props}
      className={`select ${invalid ? 'invalid' : ''} ${className}`}
      aria-invalid={invalid || undefined}
    >
      {children}
    </select>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function TextArea({ invalid = false, className = '', ...props }: TextAreaProps) {
  return (
    <textarea
      {...props}
      className={`textarea ${invalid ? 'invalid' : ''} ${className}`}
      aria-invalid={invalid || undefined}
    />
  );
}
```

### `src/components/DocumentUpload.tsx` — lines 35–57

File handling: prepares the document and supports drag-and-drop.

```tsx
  async function handleFile(file: File | undefined) {
    if (!file || busy) return;

    setBusy(true);
    setError(null);
    try {
      onChange(await prepareIncomeDocument(file));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'Could not read the selected file.',
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files?.[0]);
  }

```

### `src/components/DocumentUpload.tsx` — lines 110–150

Dropzone markup, accept list, busy state and upload error.

```tsx
  return (
    <div className="document-field">
      <label
        htmlFor={id}
        className={`dropzone ${dragging ? 'dragging' : ''} ${invalid || error ? 'invalid' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          className="dropzone-input"
          accept={DOCUMENT_ACCEPT}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            void handleFile(event.target.files?.[0])
          }
        />
        <span className="dropzone-icon">
          {busy ? <span className="spinner" /> : <Upload size={20} />}
        </span>
        <span className="dropzone-title">
          {busy ? 'Reading the document…' : 'Click to upload or drag a file here'}
        </span>
        <span className="dropzone-hint">{DOCUMENT_ACCEPT_LABEL}</span>
      </label>

      {(error || invalid) && (
        <span className="field-error">
          <AlertTriangle size={13} />
          {error ?? 'Upload a proof of income document.'}
        </span>
      )}

      <span className="field-hint">{guidance}</span>
    </div>
  );
```

### `src/utils/documents.ts` — lines 41–105

Image downscaling, type/size validation, PDF cap and data URL storage.

```ts
async function compressImage(file: File): Promise<{ dataUrl: string; mimeType: string }> {
  const original = await readAsDataUrl(file);
  const image = await loadImage(original);
  const longestEdge = Math.max(image.width, image.height);
  const scale =
    longestEdge > DOCUMENT_IMAGE_MAX_EDGE ? DOCUMENT_IMAGE_MAX_EDGE / longestEdge : 1;

  if (scale === 1 && original.length < 600_000) {
    return { dataUrl: original, mimeType: file.type };
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext('2d');
  if (!context) return { dataUrl: original, mimeType: file.type };

  // White background keeps transparent PNG scans readable once flattened to JPEG.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return { dataUrl: canvas.toDataURL(JPEG, 0.75), mimeType: JPEG };
}

export async function prepareIncomeDocument(file: File): Promise<IncomeDocument> {
  const isPdf = file.type === PDF;
  const isImage = file.type === JPEG || file.type === PNG;

  if (!isPdf && !isImage) {
    throw new Error('Upload the document as a PDF, JPG or PNG file.');
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error(
      `The file is larger than ${formatFileSize(MAX_DOCUMENT_BYTES)}. Upload a smaller scan or photo.`,
    );
  }

  if (isPdf) {
    if (file.size > MAX_STORED_PDF_BYTES) {
      throw new Error(
        'For this browser demo, PDFs must be under 1.5 MB. Upload a compressed PDF or a photo of the document.',
      );
    }

    return {
      name: file.name,
      mimeType: PDF,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      dataUrl: await readAsDataUrl(file),
    };
  }

  const image = await compressImage(file);
  return {
    name: file.name,
    mimeType: image.mimeType,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    dataUrl: image.dataUrl,
  };
}
```

### `src/config.ts` — lines 16–23

Upload size and compression constants.

```ts
/** Largest file accepted from the applicant. */
export const MAX_DOCUMENT_BYTES = 3 * 1024 * 1024;

/** PDFs are stored inline in the browser demo, so keep the original small. */
export const MAX_STORED_PDF_BYTES = 1_500_000;

/** Longest edge used when compressing a photo or scan before storing it. */
export const DOCUMENT_IMAGE_MAX_EDGE = 1600;
```

### `src/styles.css` — lines 1057–1128

Document field and dropzone styling, including drag and invalid states.

```css
.document-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.dropzone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 24px 18px;
  border: 1.5px dashed #d0d5dd;
  border-radius: 13px;
  background: #fcfcfd;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.dropzone:hover,
.dropzone.dragging {
  border-color: var(--brand);
  background: var(--brand-soft);
}

.dropzone:focus-within {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.13);
}

.dropzone.invalid {
  border-color: #f04438;
  background: var(--red-soft);
}

.dropzone.invalid:hover {
  border-color: #f04438;
}

.dropzone-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.dropzone-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: #fff;
  border: 1px solid var(--line);
  color: var(--brand);
  margin-bottom: 4px;
}

.dropzone-title {
  font-size: 12.5px;
  font-weight: 800;
}

.dropzone-hint {
  font-size: 11px;
  color: var(--muted);
}
```

---

## Notes

- Line numbers match the current files; if a file is edited later, search for the named function or class instead.
- The demo API and HTTP API implement the same `LoanApi` interface, so every screen works with either backend.
- The rules applied by the assessment are documented in [LOAN_RULES.md](LOAN_RULES.md) and [LoanFlow-Loan-Rules.pdf](LoanFlow-Loan-Rules.pdf).