# Frontend — user stories and implementation tasks

Feature: **Frontend — Presentation Layer**

Eight tasks, exactly two per user story. Every task maps to code that already exists in this
repository, so the list can be used directly as a delivery board or as implementation evidence
in the project report.

The actual code excerpt for each task is in
[FRONTEND_USER_STORIES_CODE.md](FRONTEND_USER_STORIES_CODE.md), with file paths and line ranges.

| # | User story | Tasks |
| --- | --- | --- |
| 1 | View and Review Loan Applications | 1.1 Review queue & filters · 1.2 Review drawer & decision |
| 2 | Submit Loan Application | 2.1 Submit, validate, persist · 2.2 Confirmation & tracking |
| 3 | Enter Applicant and Loan Information | 3.1 Applicant step · 3.2 Finances & loan terms |
| 4 | Display Loan Application Form | 4.1 Stepper layout & summary · 4.2 Reusable fields & upload |

---

## User story 1 — View and Review Loan Applications

> As a bank manager, I want to see every submitted application and review its details so that I
> can approve or deny the loan.

### Task 1.1 — Build the manager review queue with portfolio stats, search, status filters and sorting

**Description:** Deliver the manager's entry point: a protected console that lists every submitted application together with portfolio KPIs, and lets the manager narrow the queue by status, keyword and sort order. It turns the stored applications into a workable review list and is where status changes become visible.

**What it does**

- The manager console is gated behind the demo sign-in (`App.tsx` renders
  `ManagerLoginPage` until a the backend confirms the manager session through `auth.ts`).
- `AdminPage.tsx` loads the queue with `api.listApplications()` and shows four KPI cards
  (pending, approved, denied, total requested volume) computed in `stats`.
- The same page filters by status (`all / pending / approved / denied`) and by free text over
  name, CNIB, reference and purpose (`filtered`), with `newest / oldest / amount` sorting.
- Results render as a desktop table (`.apps-table`, mobile list fallback below 700 px) showing
  applicant, reference, purpose, amount, duration, debt ratio, age of request and status.
- `StatusBadge.tsx` renders the pending / approved / denied pill; `Toast` reports load and reset
  feedback, and `Reset demo data` restores the seed queue.

**Files:** `src/pages/AdminPage.tsx`, `src/components/StatusBadge.tsx`,
`src/components/Toast.tsx`, `src/pages/ManagerLoginPage.tsx`, `src/auth.ts`,
`src/App.tsx`, `src/styles.css` (stats, table, filter, mobile-list styles).

**Done when:** a signed-in manager sees the live queue with correct KPI counts, can combine a
status filter with a text search and a sort, and can open any row.

### Task 1.2 — Implement the review drawer with eligibility scoring, proof-of-income preview and the approve/deny decision

**Description:** Deliver the complete file-review experience: a side drawer that consolidates the applicant's identity, financial situation, requested terms, computed eligibility score and uploaded proof of income in one place. From there the manager can inspect the document and record an auditable approve or deny decision without leaving the queue.

**What it does**

- Clicking a row opens `ApplicationDrawer.tsx`, a side panel with the applicant profile,
  financials, computed debt-to-income and the requested terms.
- `assessLoan()` in `utils/loan.ts` returns the eligibility checks, score and recommendation;
  `recommendationCopy()` turns it into manager-facing guidance. It is decision support only.
- The proof-of-income section shows file name, size and upload time, renders image thumbnails and
  opens PDFs/images in the in-app `DocumentViewer.tsx` modal (blob URL, iframe/image, Escape and
  backdrop close, "Open in new tab").
- The decision form captures the manager name and reason. `handleDecision()` in `AdminPage.tsx`
  calls `api.decideApplication()`, which records decision ID, status, reason, manager and
  timestamp; the row and KPI counts update without a reload. Denials require a reason of at
  least 8 characters, approvals get a default reason, and only `pending` files can be decided.

**Files:** `src/components/ApplicationDrawer.tsx`, `src/components/DocumentViewer.tsx`,
`src/utils/loan.ts`, `src/api/demoApi.ts`, `src/api/httpApi.ts`, `src/pages/AdminPage.tsx`,
`src/styles.css` (drawer, document card, viewer styles).

**Done when:** the manager can read the full file, open the uploaded document, record a decision,
and see the updated status and audit fields immediately.

---

## User story 2 — Submit Loan Application

> As a client, I want to submit my loan application so that the bank can review my request.

### Task 2.1 — Implement the submit flow: step validation, reference generation and persistence

**Description:** Deliver the end-to-end submission path: validate every step, assemble the application payload, create the request through the API with a unique reference and persist it so it immediately reaches the manager's review queue. The task guarantees that only complete, valid applications can be submitted and that a submission is never duplicated.

**What it does**

- `ClientPage.tsx` keeps the three-step form in `FormState`, converts it to the domain input with
  `formToInput()`, and blocks navigation/submission with `validateStep()` (per-step error map,
  inline `.field-error` messages, focus on the first invalid field).
- On submit it calls `api.createApplication()` (`demoApi.createApplication` /
  `httpApi.createApplication`): the demo generates a sequential reference such as
  `LA-2026-0007`, an applicant ID, `status: 'pending'`, `createdAt` and `decision: null`, then
  writes to `localStorage` under `loanflow.demo-applications.v3`.
- The created reference is stored in the client's own list via `rememberApplication()`
  (`utils/storage.ts`), so "My requests" survives a refresh.
- Submit state is guarded (disabled button, spinner, API error surfaced as a toast) so duplicate
  submissions are not possible while the request is in flight.

**Files:** `src/pages/ClientPage.tsx`, `src/api/demoApi.ts`, `src/api/httpApi.ts`,
`src/api/index.ts`, `src/utils/storage.ts`, `src/config.ts`.

**Done when:** a valid form produces exactly one persisted application with a unique reference,
and an invalid form is blocked with field-level messages.

### Task 2.2 — Build the confirmation screen and the client tracking timeline

**Description:** Deliver the post-submission experience: an immediate confirmation showing the generated reference and estimated payment, followed by a tracking area where the client can follow every request through its status, timeline and final manager decision.

**What it does**

- `SuccessPanel` confirms receipt, shows the reference, requested amount, estimated monthly
  payment and current status, and offers "Track my request" / "New application" actions.
- `MyRequests` reloads the remembered references through `api.getApplication()` and renders one
  card per request with reference, amount, duration, purpose, submission date and `StatusBadge`.
- `RequestTimeline` shows the three stages (submitted → under review → decision), including the
  manager's reason, name and decision date when a decision exists, or the "a manager is
  reviewing your file" hint while pending.
- Empty and loading states are handled so the tab is usable before the first application.

**Files:** `src/pages/ClientPage.tsx` (`SuccessPanel`, `MyRequests`, `RequestTimeline`),
`src/components/StatusBadge.tsx`, `src/utils/storage.ts`, `src/api/demoApi.ts`.

**Done when:** after submitting, the client sees a confirmation with the reference, and the same
request appears in "My requests" with the correct live status and decision details.

---

## User story 3 — Enter Applicant and Loan Information

> As a client, I want to enter my personal, financial and loan details so that the bank can
> assess my request.

### Task 3.1 — Implement the applicant step with CNIB, age, occupation, family and employment inputs

**Description:** Deliver the identity step of the form: capture and validate the applicant's personal, family and professional details, including the 18-digit CNIB and age limits, before any financial information is requested. This establishes who is applying and whether they meet the basic intake conditions.

**What it does**

- Step 1 of `ClientPage.tsx` collects full name, national ID, age, occupation, children,
  marital status and permanent contract (`hasCDI`).
- The CNIB input formats and validates exactly 18 digits (`ID_NUMBER_DIGITS` in `config.ts`),
  strips spaces and rejects all-zero numbers; age is checked against the form limits
  (`POLICY.minAge` / `maxValidationAge`).
- `Fields.tsx` supplies `TextInput`, `SelectInput` and `Switch` so labels, hints, required marks
  and invalid states are consistent; `validateStep(0, form)` returns the step's `FormErrors`.
- Values are held in `FormState` and reset deliberately through `EMPTY_FORM` for a new
  application.

**Files:** `src/pages/ClientPage.tsx` (step 1, `validateStep`, `EMPTY_FORM`),
`src/components/Fields.tsx`, `src/config.ts`, `src/types.ts`.

**Done when:** the applicant cannot leave step 1 with a missing name/occupation, an invalid
CNIB or an out-of-range age, and valid values are carried into the submission payload.

### Task 3.2 — Implement the finances and loan-term steps with live payment and debt-ratio assessment

**Description:** Deliver the financial and loan-term steps: capture income, existing debt, savings, payment history and the requested amount, duration and purpose, then turn them into a live affordability assessment. The client sees the estimated installment, debt ratio and eligibility signals update as they type, so the request is informed before submission.

**What it does**

- Step 2 captures monthly income, existing monthly debt, savings, missed payments and the
  mandatory proof of income (`DocumentUpload`).
- Step 3 captures amount, duration (from `LOAN_DURATIONS`) and purpose (from `LOAN_PURPOSES`);
  limits come from `POLICY.minLoanAmount` / `maxLoanAmount` and the duration bounds.
- `utils/loan.ts` computes the annuity installment (`calculateMonthlyPayment`, 6.5% p.a.),
  total repayment/interest, debt-to-income, residual income and loan-to-income, and returns the
  required/advisory checks plus score and recommendation from `assessLoan()`.
- `SummaryCard` renders the live estimate: monthly payment, total interest, debt ratio against the
  40% policy marker, residual income and the eligibility signals, updating as the client types.

**Files:** `src/pages/ClientPage.tsx` (steps 2–3, `SummaryCard`), `src/utils/loan.ts`,
`src/config.ts`, `src/components/SummaryCard` styles in `src/styles.css`.

**Done when:** changing amount, duration, income or debt immediately updates the estimate, and
the assessment reflects the documented rules (age, verified income, DTI ≤ 40%, missed payments
≤ 2, plus advisory checks).

---

## User story 4 — Display Loan Application Form

> As a client, I want a clear, usable application form so that I can complete my request without
> confusion.

### Task 4.1 — Build the responsive three-step form layout, stepper and sticky summary panel

**Description:** Deliver the form's presentation shell: a responsive three-step experience with a clear progress stepper, consistent visual hierarchy and a summary panel that stays alongside the fields on desktop and stacks on mobile. It makes the application readable and navigable at any screen size.

**What it does**

- `ClientPage.tsx` renders the tabbed client portal ("New application" / "My requests"), a
  three-step `STEPS` stepper with completed/current/upcoming states, Back/Continue controls and
  the current step body.
- The layout pairs the form panel with the live `SummaryCard` on wide screens and stacks them on
  smaller ones; the stepper, grid and summary adapt through the `styles.css` breakpoints.
- The shared design system (tokens, panels, buttons, focus rings, spacing, typography,
  `page-in` animation) gives the form the same premium look as the landing page and console.
- The header (`Header.tsx`) exposes client/manager navigation, and the landing page
  (`LandingPage.tsx`) routes into the client portal.

**Files:** `src/pages/ClientPage.tsx`, `src/pages/LandingPage.tsx`,
`src/components/Header.tsx`, `src/styles.css`, `src/main.tsx`, `src/App.tsx`.

**Done when:** the form is usable at desktop and mobile widths, the active step is obvious, and
the summary stays visible without overlapping the fields.

### Task 4.2 — Implement reusable field controls and the drag-and-drop proof-of-income upload

**Description:** Deliver the form's input building blocks: a consistent set of labelled fields with validation states, plus a mandatory proof-of-income upload that supports drag-and-drop, type and size checks, image compression and an inline preview. These components keep every step visually and behaviourally consistent.

**What it does**

- `Fields.tsx` provides `Field` (label, hint, error, required), `TextInput`, `MoneyInput`,
  `SelectInput`, `TextArea` and `Switch`, all wired to `aria-invalid`/error styling so every step
  looks and behaves the same.
- `DocumentUpload.tsx` implements click-to-browse and drag-and-drop, a busy state, file removal,
  an inline preview card (thumbnail for images, PDF icon otherwise) and contextual guidance based
  on `hasCDI`.
- `utils/documents.ts` enforces PDF/JPG/PNG, the 3 MB cap and the 1.5 MB PDF cap, downscales
  images to a 1600 px longest edge and re-encodes them as JPEG before storage; failures are shown
  as readable messages.
- The upload is required by `validateStep`, and its presence drives `incomeVerified` in the
  submitted application.

**Files:** `src/components/Fields.tsx`, `src/components/DocumentUpload.tsx`,
`src/utils/documents.ts`, `src/config.ts`, `src/styles.css` (field, dropzone, document styles).

**Done when:** a client can attach a valid PDF/JPG/PNG by browsing or dropping it, sees a clear
preview, gets an explicit error for an invalid type/size, and cannot submit without the document.

---

## Traceability summary

| Story | Task | Primary code |
| --- | --- | --- |
| View and Review | 1.1 | `AdminPage.tsx`, `StatusBadge.tsx`, `auth.ts`, `App.tsx` |
| View and Review | 1.2 | `ApplicationDrawer.tsx`, `DocumentViewer.tsx`, `loan.ts`, `demoApi.ts` |
| Submit | 2.1 | `ClientPage.tsx`, `demoApi.ts`, `httpApi.ts`, `storage.ts` |
| Submit | 2.2 | `ClientPage.tsx`, `StatusBadge.tsx`, `storage.ts` |
| Enter information | 3.1 | `ClientPage.tsx`, `Fields.tsx`, `config.ts` |
| Enter information | 3.2 | `ClientPage.tsx`, `loan.ts`, `config.ts` |
| Display form | 4.1 | `ClientPage.tsx`, `LandingPage.tsx`, `Header.tsx`, `styles.css` |
| Display form | 4.2 | `Fields.tsx`, `DocumentUpload.tsx`, `documents.ts` |

Related rule documentation: `docs/LOAN_RULES.md` and `docs/LoanFlow-Loan-Rules.pdf`.
