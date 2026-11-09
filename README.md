# LoanFlow — loan approval frontend

A responsive frontend for a loan approval system, built around the attached UML model.
It contains two interfaces:

- **Client portal** — a guided three-step application form (applicant, finances, loan request),
  a live estimate of the installment and debt ratio, eligibility signals, a required proof of
  income upload, and a tracking view. The ID field validates the 18-digit Algerian biometric
  ID number (CNIB).
- **Manager console** — a sign-in gate, then a review queue with stats, search, status filters, a
  full application drawer, an eligibility assessment, and approve / deny actions with a
  documented reason.

The app runs **out of the box with browser demo data**. When a Python API is available, set
`VITE_API_URL` and the same UI talks to it over REST.

## Stack

| Layer | Choice |
| --- | --- |
| UI | React 19 + TypeScript |
| Build tool | Vite 6 |
| Styling | Hand-written CSS (no UI framework), Manrope font |
| State | React hooks |
| Persistence (demo) | `localStorage` |
| Persistence (live) | Python API → MySQL |

### Recommended Python backend

Since you are building the backend in Python and storing data in MySQL, I recommend:

- **FastAPI** for the REST API (typed with Pydantic, automatic OpenAPI docs at `/docs`).
- **SQLAlchemy 2.0** as the ORM and **PyMySQL** as the MySQL driver.
- **Alembic** for schema migrations.
- **Uvicorn** for the ASGI server.

FastAPI fits this project well because the frontend contract is small, the request/response
models map directly to the UML classes, and the generated docs make the integration easy to
verify. Django + DRF is the other solid option if you want the admin site, but it is heavier
than this API needs.

The expected endpoints and payloads are documented in
[docs/API_CONTRACT.md](docs/API_CONTRACT.md). The frontend accepts either a bare JSON object
or `{ "application": ... }` / `{ "items": [...] }` envelopes, so the backend shape is flexible.

## Run the frontend

### Windows — easiest

Double-click **`start.bat`** in the project folder. It installs dependencies on first run,
starts Vite and opens http://localhost:5173 in your browser.

### Terminal

```bash
npm install
npm run dev
```

Open http://localhost:5173. Stop the server with `Ctrl+C`.

Subsequent runs only need:

```bash
npm run dev
```

> On Windows PowerShell, if `npm` is blocked by the execution policy, use `npm.cmd install`
> and `npm.cmd run dev`, run the commands from CMD / Git Bash, or use `start.bat`.

Production build:

```bash
npm run build
npm run preview
```

## Demo data

Applications are stored in this browser's `localStorage`, so they survive a refresh and a
server restart. Use **Reset demo data** in the manager console to restore the sample queue,
or clear the browser storage for this site. Seeded applications include a generated sample
PDF so managers can try the in-app document preview immediately.

Demo manager login:

- Email: `manager@loanflow.demo`
- Password: `manager123`

## Connect the Python API

1. Start the backend on `http://127.0.0.1:8000`.
2. Copy `.env.example` to `.env` (the default `/api` uses the Vite proxy configured in
   `vite.config.ts`, so no CORS setup is needed in development).
3. Restart `npm run dev`.

To call the backend directly instead, set `VITE_API_URL=http://127.0.0.1:8000/api` and enable
CORS in FastAPI for `http://localhost:5173`.

If `VITE_API_URL` is unset, the app stays in demo mode and the header shows a **Demo data**
badge. Demo data can be restored from the manager console.

## UML mapping

| UML class | Frontend representation |
| --- | --- |
| `Applicant` | Step 1 form + `Applicant` type; `register` / `updateInformation` become the intake form |
| `LoanApplication` | Step 2–3 form, `LoanApplication` type, client tracking cards |
| `LoanDecision` | Decision panel in the drawer and decision record on the client card |
| `LoanApprovalService` | `src/utils/loan.ts` — installment, debt ratio, eligibility checks, recommendation, score |
| `BankManager` | Manager console: list, search, review drawer, approve / deny |

Relationships from the diagram are preserved: an applicant submits many applications, each
application has at most one decision, and the manager reviews applications and views decisions.

## Project structure

```text
src/
  api/                 demo API + HTTP API + shared interface
  components/          header, fields, status badge, drawer, toast, icons
  pages/               landing, client portal, manager console
  utils/               loan calculations, formatting, document handling, local tracking
  config.ts            policy thresholds, interest rate, purposes, terms
  types.ts             UML-aligned domain types
  styles.css           design system and responsive layout
docs/API_CONTRACT.md   REST contract for the Python backend
docs/FRONTEND_USER_STORIES_TASKS.md   user stories mapped to implementation tasks
docs/FRONTEND_USER_STORIES_CODE.md    code excerpts for each task
```

## Decision rules used for the indicative assessment

Configured in `src/config.ts`:

- Age between 18 and 70.
- A proof of income document must be uploaded (PDF, JPG or PNG; images are compressed in the
  browser before storage, PDFs are capped at 1.5 MB for the demo).
- Debt-to-income ratio at or below 40% (existing debt + estimated new installment).
- At most 2 missed payments.
- Advisory checks: permanent contract, savings covering one installment, loan ≤ 36× monthly income.

The score and recommendation are **decision support only**. The bank manager makes the final
call and the recorded reason is what the applicant sees.

The full rule set, scoring table, calculations and validation limits are documented in
[docs/LOAN_RULES.md](docs/LOAN_RULES.md) and available as a printable
[docs/LoanFlow-Loan-Rules.pdf](docs/LoanFlow-Loan-Rules.pdf).

## Scope notes

- The manager console is protected by a **frontend-only demo sign-in**:
  `manager@loanflow.demo` / `manager123` (displayed on the login screen). The session lives in
  `sessionStorage`, and the signed-in manager name prefills the decision form. Real
  authentication must be enforced by the backend.
- Client-side application tracking stores submitted IDs in `localStorage`. With a real backend,
  replace this with an authenticated “my applications” endpoint.
- Interest rate and policy thresholds are constants (`src/config.ts`) — move them to the backend
  or a configuration table if they must be changed by the bank.
