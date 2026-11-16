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

The app connects to the LoanFlow MySQL database through the FastAPI service in `backend/`.

## Stack

| Layer | Choice |
| --- | --- |
| UI | React 19 + TypeScript |
| Build tool | Vite 6 |
| Styling | Hand-written CSS (no UI framework), Manrope font |
| State | React hooks |
| Persistence | FastAPI → MySQL |

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

Double-click **`start.bat`** in the project folder. It starts the API and frontend in the
background, checks the database connection, then opens http://127.0.0.1:5173 in your browser.
Use **`stop.bat`** to stop the background servers started by the launcher.

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

## MySQL database

`sql/schema.sql` defines `loan_approval_db`, and `sql/seed.sql` loads 30 example applications
with 2 managers and 30 decisions. The API reads and writes these same tables.

The schema, data dictionary, distributions, data-quality notes and intended use are documented in
[docs/DATASET_DESCRIPTION.md](docs/DATASET_DESCRIPTION.md), with a printable
[docs/LoanFlow-Dataset-Description.pdf](docs/LoanFlow-Dataset-Description.pdf).

## Run the database API

The frontend calls the FastAPI service in `backend/`; the service reads and writes the MySQL
tables created by `sql/schema.sql`.

1. For a fresh database, run `sql/schema.sql` in MySQL, then optionally run `sql/seed.sql` to
   load the sample queue. If you already have the database, run `sql/migrate_api_columns.sql`;
   do not rerun `schema.sql`, since it drops and recreates the tables.
2. In `backend/`, create a virtual environment, install `requirements.txt`, and copy
   `.env.example` to `.env`. Set `DB_USER` and `DB_PASSWORD` to your MySQL credentials. Set
   `AUTH_SECRET_KEY` to a random secret of at least 32 characters.
3. In the project root, copy `.env.example` to `.env` if it does not already exist.
4. Create a manager account once by running `python create_manager.py` from `backend/`.
   After setup, double-click `start.bat`; no terminal window needs to stay open.

For an existing database, run `sql/migrate_manager_auth.sql` once. Create a manager login from
the `backend/` directory with `python create_manager.py`; the password is entered privately in
the terminal and saved only as an Argon2id hash. The backend sets an HTTP-only session cookie,
and the manager queue and decision endpoint require that session.

The API contract is documented in [docs/API_CONTRACT.md](docs/API_CONTRACT.md). The SQL seed
identity numbers are for the manager queue; new client submissions use the frontend CNIB checks.

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
  api/                 HTTP API + shared interface
  components/          header, fields, status badge, drawer, toast, icons
  pages/               landing, client portal, manager console
  utils/               loan calculations, formatting, document handling, local tracking
  config.ts            policy thresholds, interest rate, purposes, terms
  types.ts             UML-aligned domain types
  styles.css           design system and responsive layout
docs/API_CONTRACT.md                 REST contract for the Python backend
docs/DATASET_DESCRIPTION.md          dataset description for the MySQL test data
docs/FRONTEND_USER_STORIES_TASKS.md  user stories mapped to implementation tasks
docs/FRONTEND_USER_STORIES_CODE.md   code excerpts for each task
docs/AZURE_DEVOPS_BACKLOG.csv        Feature → User Story → Task import hierarchy
docs/AZURE_DEVOPS_IMPORT.md          Azure Boards CSV import steps
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

- The manager console uses backend authentication with manager accounts stored in MySQL. Passwords
  are stored as Argon2id hashes, and the backend requires a valid session for manager-only routes.
- Client-side application tracking stores submitted IDs in `localStorage`. With a real backend,
  replace this with an authenticated “my applications” endpoint.
- Interest rate and policy thresholds are constants (`src/config.ts`) — move them to the backend
  or a configuration table if they must be changed by the bank.
