# API contract — loan approval system

Base URL used by the frontend: `VITE_API_URL` (for example `/api` through the Vite proxy, or
`http://127.0.0.1:8000/api`). All bodies are JSON. The frontend accepts bare objects or
`{ "application": ... }` / `{ "items": [...] }` envelopes.

## Domain types

```jsonc
// Applicant
{
  "applicantId": "APL-1001",
  "fullName": "Sarah Mitchell",
  "idCardNumber": "109876543210987651",
  "age": 34,
  "job": "Senior product designer",
  "hasCDI": true,
  "isMarried": true,
  "numberOfChildren": 1
}

// LoanApplicationInput (sent by the client)
{
  "applicant": {
    "fullName": "Sarah Mitchell",
    "idCardNumber": "109876543210987651",
    "age": 34,
    "job": "Senior product designer",
    "hasCDI": true,
    "isMarried": true,
    "numberOfChildren": 1
  },
  "monthlyIncome": 5200,
  "totalDebt": 480,
  "savings": 18000,
  "incomeDocument": {
    "name": "payslips-aug-oct-2026.pdf",
    "mimeType": "application/pdf",
    "size": 482301,
    "uploadedAt": "2026-11-02T15:45:00Z"
  },
  "loanAmount": 24000,
  "loanDuration": 48,
  "loanPurpose": "Home renovation",
  "missedPayments": 0
}

// LoanApplication (returned by the API)
{
  "applicationId": "LA-2026-0001",
  "applicant": { "...": "Applicant with applicantId" },
  "monthlyIncome": 5200,
  "totalDebt": 480,
  "savings": 18000,
  "incomeVerified": true,
  "incomeDocument": {
    "name": "payslips-aug-oct-2026.pdf",
    "mimeType": "application/pdf",
    "size": 482301,
    "uploadedAt": "2026-11-02T15:45:00Z",
    "dataUrl": "data:application/pdf;base64,..."
  },
  "loanAmount": 24000,
  "loanDuration": 48,
  "loanPurpose": "Home renovation",
  "missedPayments": 0,
  "status": "pending",                  // pending | approved | denied
  "createdAt": "2026-11-02T15:47:00Z",
  "decision": null
}

// LoanDecision
{
  "decisionId": "DEC-5004",
  "status": "approved",                 // approved | denied
  "reason": "Strong verified income and a low debt ratio.",
  "decisionDate": "2026-11-03T10:12:00Z",
  "managerName": "M. Laurent"
}
```

`loanDuration` is in months. Money values are numbers in the same currency as the UI (`EUR` by
default, configurable in `src/config.ts`).

`idCardNumber` is the 18-digit Algerian biometric ID number (CNIB), stored as digits only.
`incomeDocument` is required by the UI; `incomeVerified` is derived from its presence. In the
browser demo the file is embedded as a `dataUrl`, but a real backend should accept a multipart
upload and store a document reference rather than the payload itself.

## Endpoints

### `GET /applications`

Returns all applications, newest first. Optional query parameters for a future server-side
filter: `status`, `q`.

Response `200`:

```json
{ "items": [ { "applicationId": "LA-2026-0001", "...": "..." } ] }
```

A bare array is also accepted.

### `GET /applications/{applicationId}`

Returns one application, used by the client tracking view.

Response `200`: a `LoanApplication` (bare or wrapped in `application`).
Response `404`: `{ "detail": "Application not found." }`

### `POST /applications`

Creates a pending application from a `LoanApplicationInput`.

Behavior expected from the backend:

1. Generate `applicantId`, `applicationId`, `createdAt` and `status = "pending"`.
2. Persist the applicant and the application in MySQL in one transaction.
3. Return the full `LoanApplication`.

Response `201`:

```json
{
  "application": {
    "applicationId": "LA-2026-0007",
    "status": "pending",
    "createdAt": "2026-11-04T18:48:00Z",
    "decision": null,
    "...": "..."
  }
}
```

### `POST /applications/{applicationId}/decision`

Records the manager decision and returns the updated application.

Request:

```json
{
  "status": "denied",
  "reason": "Debt-to-income ratio exceeds the 40% policy limit.",
  "managerName": "M. Laurent"
}
```

Rules:

- Only applications with `status = "pending"` can be decided (otherwise `409`).
- `status` must be `approved` or `denied`.
- `reason` is required for denials (the UI enforces at least 8 characters); the backend should
  validate it too.
- Generate `decisionId` and `decisionDate` server-side, store the decision, and update the
  application status atomically.
- Return the updated `LoanApplication`.

Response `200`:

```json
{
  "application": {
    "applicationId": "LA-2026-0001",
    "status": "approved",
    "decision": {
      "decisionId": "DEC-7326F16908",
      "status": "approved",
      "reason": "The application meets the bank's eligibility criteria.",
      "decisionDate": "2026-11-04T18:48:00Z",
      "managerName": "A. Mercier"
    },
    "...": "..."
  }
}
```

## Suggested MySQL schema

```sql
CREATE TABLE applicants (
  applicant_id      VARCHAR(32) PRIMARY KEY,
  full_name         VARCHAR(120) NOT NULL,
  id_card_number    CHAR(18)     NOT NULL UNIQUE,
  age               INT          NOT NULL,
  job               VARCHAR(120) NOT NULL,
  has_cdi           BOOLEAN      NOT NULL DEFAULT FALSE,
  is_married        BOOLEAN      NOT NULL DEFAULT FALSE,
  number_of_children INT         NOT NULL DEFAULT 0
);

CREATE TABLE loan_applications (
  application_id    VARCHAR(32) PRIMARY KEY,
  applicant_id      VARCHAR(32) NOT NULL,
  monthly_income    DECIMAL(12,2) NOT NULL,
  total_debt        DECIMAL(12,2) NOT NULL,
  savings           DECIMAL(12,2) NOT NULL,
  income_verified   BOOLEAN      NOT NULL DEFAULT FALSE,
  income_document_name VARCHAR(255),
  income_document_type VARCHAR(100),
  income_document_size INT,
  income_document_url  VARCHAR(512),
  loan_amount       DECIMAL(12,2) NOT NULL,
  loan_duration     INT          NOT NULL,
  loan_purpose      VARCHAR(120) NOT NULL,
  missed_payments   INT          NOT NULL DEFAULT 0,
  status            ENUM('pending','approved','denied') NOT NULL DEFAULT 'pending',
  created_at        DATETIME     NOT NULL,
  CONSTRAINT fk_application_applicant
    FOREIGN KEY (applicant_id) REFERENCES applicants(applicant_id)
);

CREATE TABLE loan_decisions (
  decision_id       VARCHAR(32) PRIMARY KEY,
  application_id    VARCHAR(32) NOT NULL UNIQUE,
  status            ENUM('approved','denied') NOT NULL,
  reason            TEXT         NOT NULL,
  manager_name      VARCHAR(120) NOT NULL,
  decision_date     DATETIME     NOT NULL,
  CONSTRAINT fk_decision_application
    FOREIGN KEY (application_id) REFERENCES loan_applications(application_id)
);
```

## FastAPI sketch

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="LoanFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class DecisionIn(BaseModel):
    status: str  # "approved" | "denied"
    reason: str = Field(min_length=8)
    managerName: str

@app.post("/applications/{application_id}/decision")
def decide(application_id: str, payload: DecisionIn):
    # SELECT ... FOR UPDATE, validate status == "pending",
    # INSERT into loan_decisions, UPDATE loan_applications.status,
    # COMMIT, then return the joined application.
    ...
```

Run it with `uvicorn main:app --reload --port 8000`; OpenAPI docs are then available at
`http://127.0.0.1:8000/docs`. The frontend proxy in `vite.config.ts` expects port `8000`.
