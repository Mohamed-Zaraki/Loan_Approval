# Dataset description — LoanFlow loan approval database

| Field | Value |
| --- | --- |
| Database | `loan_approval_db` |
| DBMS | MySQL 8.0+ (InnoDB, `utf8mb4` / `utf8mb4_unicode_ci`) |
| DDL | [`sql/schema.sql`](../sql/schema.sql) |
| Seed data | [`sql/seed.sql`](../sql/seed.sql) |
| Companion model | [`UML_Model_Loan_Approval.drawio`](../UML_Model_Loan_Approval.drawio) |
| Status | Synthetic test dataset — not production data |

## Dataset summary

| Item | Value |
| --- | --- |
| Tables | 4 (`bank_managers`, `applicants`, `loan_applications`, `loan_decisions`) |
| Rows | 62 (2 managers, 30 applicants, 30 applications, 30 decisions) |
| Coverage | 30 applicants, one application and one decision each |
| Currency | EUR (€) — implied by the application, no currency column |
| Time span | All rows are stamped at load time; no historical dates are seeded |
| Personal data | None. All identities, jobs and financial values are fictional |

## 1. Purpose of the dataset

The dataset supports the LoanFlow frontend and its future Python/MySQL backend. It exists to:

1. **Exercise the manager console** — populate the review queue, KPI counters, search, status filters and sorting with a realistic spread of files.
2. **Exercise the client tracking view** — provide approved, rejected and pending cases so every status and timeline state can be rendered.
3. **Validate the eligibility engine** — the financial values reproduce the documented policy checks in [`docs/LOAN_RULES.md`](LOAN_RULES.md): age, verified income, debt-to-income, missed payments, CDI, savings buffer and loan-to-income.
4. **Test the REST contract** — give the API implementation in [`docs/API_CONTRACT.md`](API_CONTRACT.md) a stable fixture for list, detail and decision endpoints.
5. **Support demonstrations and reporting** — provide aggregate figures (approval rate, requested volume, risk distribution) that can be quoted in a report or presentation.

It is **not** a training set, a credit-scoring validation set, or a representative sample of a real loan book. See [§9](#9-intended-use-and-limitations).

---

## 2. Provenance and generation method

| Aspect | Description |
| --- | --- |
| Origin | Hand-authored seed script, committed with the project |
| Source commit | `bc5313e` — “Adding a fictionalDB (30 examples) for Testing purposes” |
| Derived from | The UML class diagram `UML_Model_Loan_Approval.drawio` |
| Generation | Deterministic `INSERT` statements; no random generator, no external data source |
| Realism | Names, occupations, incomes and loan purposes are plausible but invented |
| Re-identification risk | None; no real person, address, phone number or account is present |
| Reproducibility | Re-running `schema.sql` then `seed.sql` always produces the same 62 rows |

The schema drops and recreates the four tables, then `seed.sql` re-inserts the same fixed values. There are no sequences, random functions or `NOW()`-relative values in the seed, so the **content** is reproducible; only the automatically generated timestamps differ between runs.

---

## 3. Dataset at a glance

### 3.1 Row counts

| Table | Rows | Role |
| --- | ---: | --- |
| `bank_managers` | 2 | Reviewers and decision authors |
| `applicants` | 30 | Loan applicants and their profile |
| `loan_applications` | 30 | Requested loan and financial situation |
| `loan_decisions` | 30 | Outcome of each application |
| **Total** | **62** | |

### 3.2 Decision outcome

| Status | Rows | Share | Requested amount |
| --- | ---: | ---: | ---: |
| `APPROVED` | 23 | 76.7% | €640,000 |
| `REJECTED` | 6 | 20.0% | €59,000 |
| `PENDING` | 1 | 3.3% | €14,000 |
| **Total** | **30** | **100%** | **€713,000** |

### 3.3 Key numeric ranges

| Measure | Minimum | Maximum | Average |
| --- | ---: | ---: | ---: |
| Applicant age | 22 | 58 | 36.3 |
| Monthly income | €1,300 | €6,500 | €3,900 |
| Existing monthly debt | €100 | €950 | €426.67 |
| Savings | €300 | €45,000 | €14,223.33 |
| Loan amount | €6,000 | €60,000 | €23,766.67 |
| Duration | 12 months | 60 months | 35.8 months |
| Estimated installment (6.5% APR) | €311.82 | €1,185.75 | €694.17 |
| Debt-to-income including installment | 19.98% | 70.14% | 31.68% |

Averages are simple arithmetic means over the 30 rows.

### 3.4 Classification designed into the data

The 30 files are deliberately split into two clearly separable profiles:

| Profile | Count | Characteristics | Recorded outcome |
| --- | ---: | --- | --- |
| Strong | 24 | CDI, verified income, DTI ≤ 40%, ≤ 2 missed payments, savings ≥ one installment, loan ≤ 36× income | 23 approved, 1 pending |
| High risk | 6 | Unverified income **and** DTI > 40% (4 also fail the missed-payment or savings checks) | 6 rejected |

There is no “manual review” (advisory-only failure) case in the seed, and no manager override (approved despite a failed hard rule). The dataset therefore tests the two extremes of the recommendation engine but not its middle band. This is documented again in [§8](#8-data-quality-notes).

---

## 4. Schema overview

### 4.1 Entity–relationship view

```text
applicants (30)
   │ 1
   │ submits
   ▼ 0..*
loan_applications (30) ──── 0..1 ──── loan_decisions (30)
   ▲ 0..*                                   ▲ 0..*
   │ reviews (reviewed_by_manager_id)       │ decides (decided_by_manager_id)
   │ 1                                      │ 1
bank_managers (2) ──────────────────────────┘
```

### 4.2 Relationship rules

| Relationship | Cardinality | Foreign key | On delete | On update |
| --- | --- | --- | --- | --- |
| Applicant submits applications | 1 → 0..* | `loan_applications.applicant_id` | `CASCADE` | `CASCADE` |
| Manager reviews applications | 1 → 0..* | `loan_applications.reviewed_by_manager_id` (nullable) | `SET NULL` | `CASCADE` |
| Application receives a decision | 1 → 0..1 | `loan_decisions.application_id` (**UNIQUE**) | `CASCADE` | `CASCADE` |
| Manager authors a decision | 1 → 0..* | `loan_decisions.decided_by_manager_id` (nullable) | `SET NULL` | `CASCADE` |

The schema permits an applicant to submit many applications and an application to exist without a decision. The seed is simpler: **exactly one application per applicant and exactly one decision per application**. The 1:N and 0..1 paths are supported but not represented in the data.

### 4.3 Indexes

| Index | Table | Column(s) | Purpose |
| --- | --- | --- | --- |
| `PRIMARY` | all tables | surrogate `*_id` | Row identity |
| `id_card_number` UNIQUE | `applicants` | `id_card_number` | One applicant per national ID |
| `application_id` unique | `loan_decisions` | `application_id` | Enforces the 1 → 0..1 relationship |
| `idx_loan_apps_applicant` | `loan_applications` | `applicant_id` | Applicant lookup and joins |
| `idx_loan_apps_created_at` | `loan_applications` | `created_at` | Queue ordering by date |
| `idx_loan_decisions_status` | `loan_decisions` | `status` | Status filters and KPI counts |

MySQL also creates implicit indexes for the `reviewed_by_manager_id` and `decided_by_manager_id` foreign keys.

---

## 5. Data dictionary

### 5.1 `bank_managers` — 2 rows

| Column | Type | Null | Default | Key / constraint | Description |
| --- | --- | --- | --- | --- | --- |
| `manager_id` | `INT` | no | auto-increment | PK | Surrogate manager identifier |
| `name` | `VARCHAR(150)` | no | — | — | Display name used in the console and on decisions |
| `created_at` | `TIMESTAMP` | no | `CURRENT_TIMESTAMP` | — | Row creation time |

Seeded values: `manager_id = 1` — Sarah Connor; `manager_id = 2` — Alexandre Martin.

### 5.2 `applicants` — 30 rows

| Column | Type | Null | Default | Key / constraint | Description |
| --- | --- | --- | --- | --- | --- |
| `applicant_id` | `INT` | no | auto-increment | PK | Surrogate applicant identifier |
| `full_name` | `VARCHAR(150)` | no | — | — | Applicant display name |
| `id_card_number` | `VARCHAR(50)` | no | — | UNIQUE | National identity number (CNIB in the app) |
| `age` | `INT` | no | — | `CHECK (age >= 18)` | Age in years at the time of the file |
| `job` | `VARCHAR(100)` | yes | `NULL` | — | Occupation |
| `has_cdi` | `BOOLEAN` | no | `FALSE` | — | Permanent employment contract (CDI) |
| `is_married` | `BOOLEAN` | no | `FALSE` | — | Marital status |
| `number_of_children` | `INT` | no | `0` | `CHECK (number_of_children >= 0)` | Dependent children |
| `created_at` | `TIMESTAMP` | no | `CURRENT_TIMESTAMP` | — | Row creation time |
| `updated_at` | `TIMESTAMP` | no | `CURRENT_TIMESTAMP ON UPDATE` | — | Last modification time |

Semantics: `has_cdi = TRUE` means a permanent contract and drives the *stable employment* advisory check. `is_married` and `number_of_children` are descriptive only — they are not used by the eligibility engine.

### 5.3 `loan_applications` — 30 rows

| Column | Type | Null | Default | Key / constraint | Description |
| --- | --- | --- | --- | --- | --- |
| `application_id` | `INT` | no | auto-increment | PK | Surrogate application identifier |
| `applicant_id` | `INT` | no | — | FK → `applicants` | Applicant who submitted the request |
| `monthly_income` | `DECIMAL(12,2)` | no | — | `CHECK (>= 0)` | Net monthly income in EUR |
| `total_debt` | `DECIMAL(12,2)` | no | `0.00` | `CHECK (>= 0)` | Existing monthly debt repayments in EUR |
| `savings` | `DECIMAL(12,2)` | no | `0.00` | `CHECK (>= 0)` | Available savings in EUR |
| `income_verified` | `BOOLEAN` | no | `FALSE` | — | Proof of income has been supplied/validated |
| `loan_amount` | `DECIMAL(12,2)` | no | — | `CHECK (> 0)` | Requested principal in EUR |
| `loan_duration` | `INT` | no | — | `CHECK (> 0)` | Duration in months |
| `loan_purpose` | `VARCHAR(255)` | yes | `NULL` | — | Free-text purpose of the loan |
| `missed_payments` | `INT` | no | `0` | `CHECK (>= 0)` | Missed payments in the last 12 months |
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` | Indexed | Submission timestamp |
| `reviewed_by_manager_id` | `INT` | yes | `NULL` | FK → `bank_managers` | Manager assigned to review the file |

`income_verified` is the persisted form of “a proof-of-income document is attached”. The frontend derives it from the upload; the database stores only the boolean, not the file.

### 5.4 `loan_decisions` — 30 rows

| Column | Type | Null | Default | Key / constraint | Description |
| --- | --- | --- | --- | --- | --- |
| `decision_id` | `INT` | no | auto-increment | PK | Surrogate decision identifier |
| `application_id` | `INT` | no | — | FK → `loan_applications`, UNIQUE | Application being decided |
| `status` | `ENUM` | no | `PENDING` | Indexed | Decision state: `PENDING`, `APPROVED` or `REJECTED` |
| `reason` | `TEXT` | yes | `NULL` | — | Human-readable justification shown to the client |
| `decision_date` | `DATETIME` | no | `CURRENT_TIMESTAMP` | — | Date the decision row was created |
| `decided_by_manager_id` | `INT` | yes | `NULL` | FK → `bank_managers` | Manager who recorded the decision |

The `UNIQUE` constraint on `application_id` is what enforces “at most one decision per application”. The enum uses uppercase values; the frontend uses lowercase `pending` / `approved` / `denied` (see [§8.4](#84-status-vocabulary-mismatch)).

---

## 6. Data profile

### 6.1 Applicant demographics

| Attribute | Distribution |
| --- | --- |
| Age bands | 18–29: 9 · 30–39: 11 · 40–49: 6 · 50–59: 4 |
| Employment contract | CDI: 24 (80%) · non-CDI: 6 (20%) |
| Marital status | Married: 19 (63.3%) · single: 11 (36.7%) |
| Children | 0: 11 · 1: 6 · 2: 8 · 3: 4 · 4: 1 (average 1.27) |
| Occupations | 30 distinct job titles, from barista and cashier to physician and university professor |

### 6.2 Application financials

| Attribute | Distribution |
| --- | --- |
| Income verification | Verified: 24 (80%) · unverified: 6 (20%) |
| Missed payments | 0: 22 · 1: 3 · 2: 3 · 3: 1 · 4: 1 |
| Duration (months) | 12: 1 · 18: 1 · 24: 8 · 30: 2 · 36: 9 · 48: 6 · 60: 3 |
| Loan purpose | 27 distinct values for 30 rows; only *Home Renovation*, *Car Purchase* and *Debt Consolidation* appear twice |
| DTI ≤ 40% | 24 applications |
| DTI 40–50% | 2 applications |
| DTI > 50% | 4 applications (maximum 70.14%) |

Income, debt, savings and loan amount are broadly correlated: higher incomes carry larger requested amounts, but the debt ratio stays in a narrow band for the approved group. That is intentional — it keeps the approved population internally consistent for UI demonstrations.

### 6.3 Manager workload

| Manager | Applications assigned | Decisions recorded | Approved | Rejected |
| --- | ---: | ---: | ---: | ---: |
| Sarah Connor (1) | 15 | 14 | 13 | 1 |
| Alexandre Martin (2) | 15 | 15 | 10 | 5 |
| No decision author (pending) | 0 | 1 pending | — | — |

Applications alternate between the two managers by ID (odd → manager 1, even → manager 2). The single pending file (application 17) still has a reviewer assigned but no decision author.

### 6.4 Derived assessment profile

Applying the documented rules (`src/utils/loan.ts`, 6.5% annual rate, 40% DTI limit, 2 missed payments, CDI/savings/36× advisory checks) to each row yields:

| Recommendation | Applications | Score | Recorded decision |
| --- | ---: | --- | --- |
| Strong profile | 24 | 100 | 23 approved, 1 pending |
| Manual review advised | 0 | 86–93 | — |
| High risk | 6 | 2, 9, 37 (×4) | 6 rejected |

The derived result matches the recorded outcome for **all 30 rows**: no approved file fails a hard rule, and no rejected file passes all of them. This makes the seed a clean fixture for regression-testing the assessment engine, but it also means the data cannot demonstrate a disagreement between the engine and the manager.

The estimated installment is computed with the annuity formula:

```text
payment = principal × r / (1 − (1 + r)^−months),  r = 0.065 / 12
```

and the debt-to-income ratio as:

```text
DTI = (total_debt + payment) / monthly_income
```

---

## 7. Sample records

The table compares three representative files: an approved case, the only pending case, and a rejected case.

| Field | Application 1 — approved | Application 17 — pending | Application 23 — rejected |
| --- | --- | --- | --- |
| Applicant | John Doe, 32, Software Engineer | Hamza Chraibi, 28, Sales Representative | Anis Belhaj, 22, Retail Cashier |
| Profile | CDI, married, 2 children | CDI, single, no children | Non-CDI, single, no children |
| Income / debt / savings | €4,500 / €300 / €15,000 | €3,100 / €400 / €5,500 | €1,300 / €600 / €300 |
| Income verified | Yes | Yes | No |
| Loan | €25,000 over 36 months, *Home Renovation* | €14,000 over 36 months, *Car Purchase* | €7,000 over 24 months, *Debt Consolidation* |
| Missed payments | 0 | 1 | 4 |
| Estimated installment | €766.23 | €429.09 | €311.82 |
| DTI | 23.69% | 26.74% | 70.14% |
| Decision | `APPROVED` by Sarah Connor | `PENDING`, no decision author | `REJECTED` by Sarah Connor |
| Reason | “Applicant has stable CDI, healthy debt ratio, and sufficient savings.” | “Under secondary assessment for income-to-installment ratio.” | “Excessive debt ratio (>45%), 4 missed payments, no stable contract.” |

---

## 8. Data quality notes

The dataset is internally consistent but has deliberate and accidental limitations that anyone using it should know.

### 8.1 CNIB format does not match the frontend

`applicants.id_card_number` stores short codes such as `CIN-100234` and `CIN-106901`. The client form validates **exactly 18 digits** (`ID_NUMBER_DIGITS = 18` in `src/config.ts`) and strips spaces. Any of these seeded applicants would be rejected by the form, and an API that reuses the same validation would reject the seed.

**Impact:** end-to-end tests that read applicants from MySQL and post them back through the UI will fail on identity validation. Replace the values with 18-digit numbers (for example `100000000000100234`) before integration testing, or relax the validation for imported records.

### 8.2 No proof-of-income document is stored

`income_verified` is a boolean, but there is no column, table or path for the uploaded payslip or tax notice. The frontend treats the document as mandatory and derives `income_verified` from its presence.

**Impact:** a manager reviewing data from MySQL cannot open the supporting evidence, and the audit trail cannot prove *why* income was considered verified. A `loan_documents` table (or an object-storage reference) is required for parity with the UI.

### 8.3 Timestamps carry no business meaning

All `created_at`, `updated_at` and `decision_date` values come from column defaults, because the seed never supplies them. Consequences:

- Every application appears to have been submitted at the moment the seed ran.
- The pending decision (application 17) still has a `decision_date`, even though no decision has been made. Semantically, that column should be `NULL` until the status changes.
- Sorting by date, “applications this week” counters and time-series charts cannot be tested meaningfully.

**Fix:** seed explicit, staggered dates in the past and allow `decision_date` to be `NULL` for pending rows.

### 8.4 Status vocabulary mismatch

| Database | Frontend / API |
| --- | --- |
| `PENDING` | `pending` |
| `APPROVED` | `approved` |
| `REJECTED` | `denied` |

The mapping is not stored anywhere and must be handled by the backend serialiser. `REJECTED` → `denied` is the non-obvious one and a common source of bugs in filters and badges.

### 8.5 Free-text loan purposes are not normalised

`loan_purpose` is `VARCHAR(255)` with 27 distinct values across 30 rows. The vocabulary differs from the frontend list in `src/config.ts` (`Home purchase`, `Home renovation`, `Vehicle`, `Education`, `Business`, `Debt consolidation`, `Medical expenses`, `Personal expenses`, `Other`):

- Case differs (`Home Renovation` vs `Home renovation`).
- Synonyms are used (`Car Purchase`, `Vehicle Purchase`, `Family Car`, `Truck Purchase`, `Luxury Vehicle`).
- Some values have no direct equivalent (`Studio Equipment`, `Clinic Expansion`, `Wedding & Travel`).

**Impact:** grouping by purpose is unreliable; a lookup table with a canonical purpose ID would be preferable.

### 8.6 Durations outside the UI dropdown

The seed uses 18- and 30-month durations. Both are valid under the policy (6–360 months), but neither is offered by the form dropdown (`12, 24, 36, 48, 60, 84, 120, 180, 240`).

**Impact:** the data is useful for API robustness tests, but those two files cannot be recreated through the UI.

### 8.7 Age is stored, not derived

There is no date of birth. `age` is an integer snapshot, so it drifts over time, and the database only enforces `age >= 18` — not the policy maximum of 70. The seed’s range (22–58) happens to comply, but nothing prevents an out-of-policy row from being inserted later.

### 8.8 Nullable fields that the UI requires

`job` and `loan_purpose` are nullable in the schema, while the form requires both. The seed populates them everywhere, so the mismatch is invisible until the backend starts accepting partial writes.

### 8.9 Review assignment vs decision authorship

`reviewed_by_manager_id` is populated on all 30 applications, including the pending one, whereas `decided_by_manager_id` is `NULL` for that file. The two fields have different meanings (assignment vs authorship) but similar names. There is also no `reviewed_at` timestamp — the only review time available is `loan_decisions.decision_date`, which does not exist for undecided files.

### 8.10 Deletion behaviour weakens the audit trail

Foreign keys use `ON DELETE CASCADE` from applicant to application to decision, and `ON DELETE SET NULL` from manager to application/decision. Deleting an applicant therefore erases their applications *and* decisions; deleting a manager anonymises past decisions. For a regulated credit process, history should be retained (soft deletes or `RESTRICT`).

### 8.11 Seed does not cover the full relationship model

The schema allows one applicant to have many applications and an application to have no decision. The seed has exactly one of each, so:

- duplicate applications by the same applicant are untested;
- an application without a decision row is untested;
- a decision for a non-existent application is prevented by the FK, but that path has no fixture either.

### 8.12 Class balance and missing edge cases

The approved/rejected/pending split is 23/6/1. There are no advisory-only (“manual review”) cases, no manager overrides, no zero-income files, no maximum-age files, and no very large or very long loans. Any metric computed on this data (approval rate, average ticket, default proxy) is a property of the fixture, not of a real population.

---

## 9. Intended use and limitations

### Suitable for

- UI development and demonstration of the client portal, manager queue and review drawer.
- Backend API contract tests against a known, stable fixture.
- Regression tests for the eligibility engine (the 24/6 split is a clean expected result).
- SQL exercises: joins, aggregates, status filters, constraint checks.
- Mock reporting layouts and screenshots.

### Not suitable for

- Training or validating a credit-scoring or machine-learning model.
- Estimating real approval rates, default rates or portfolio risk.
- Performance or volume testing (62 rows is far below any realistic scale).
- Compliance, audit or regulatory reporting.
- Any conclusion about fairness or bias — the sample is tiny and hand-built.

### Ethical and legal note

The identities are invented, but they resemble real names and the financial profiles are realistic. Treat the database as **test data**: do not merge it with real customer records, and do not present the approval statistics as bank results without labelling them as synthetic.

---

## 10. Loading and verification

### 10.1 Load

```bash
mysql -u root -p < sql/schema.sql
mysql -u root -p < sql/seed.sql
```

Or from inside the MySQL client:

```sql
SOURCE sql/schema.sql;
SOURCE sql/seed.sql;
```

`schema.sql` creates `loan_approval_db`, drops the four tables in dependency order, recreates them and adds the indexes. `seed.sql` assumes the schema already exists and only inserts data.

### 10.2 Verification queries

```sql
-- Row counts
SELECT 'bank_managers' AS table_name, COUNT(*) AS rows_count FROM bank_managers
UNION ALL SELECT 'applicants', COUNT(*) FROM applicants
UNION ALL SELECT 'loan_applications', COUNT(*) FROM loan_applications
UNION ALL SELECT 'loan_decisions', COUNT(*) FROM loan_decisions;

-- Decision distribution and requested volume
SELECT d.status, COUNT(*) AS files, SUM(a.loan_amount) AS requested_eur
FROM loan_decisions d
JOIN loan_applications a ON a.application_id = d.application_id
GROUP BY d.status;

-- Orphan checks (both should return 0)
SELECT COUNT(*) AS apps_without_applicant
FROM loan_applications a
LEFT JOIN applicants p ON p.applicant_id = a.applicant_id
WHERE p.applicant_id IS NULL;

SELECT COUNT(*) AS apps_without_decision
FROM loan_applications a
LEFT JOIN loan_decisions d ON d.application_id = a.application_id
WHERE d.decision_id IS NULL;

-- Applications outside the documented policy
SELECT application_id, monthly_income, loan_amount, loan_duration, missed_payments
FROM loan_applications
WHERE monthly_income <= 0
   OR loan_amount NOT BETWEEN 500 AND 1000000
   OR loan_duration NOT BETWEEN 6 AND 360
   OR missed_payments > 2;
```

Expected results: 2 / 30 / 30 / 30 rows; 23 approved, 6 rejected, 1 pending; €640,000 / €59,000 / €14,000; zero orphans. The last query returns the two files with more than two missed payments (applications 8 and 23), plus any future row that breaks the amount or duration rules.

---

## 11. Traceability

| Artifact | Role in this dataset |
| --- | --- |
| [`sql/schema.sql`](../sql/schema.sql) | Authoritative DDL: tables, keys, checks, indexes |
| [`sql/seed.sql`](../sql/seed.sql) | Authoritative data: 2 managers, 30 applicants, 30 applications, 30 decisions |
| [`UML_Model_Loan_Approval.drawio`](../UML_Model_Loan_Approval.drawio) | Source class model (`Applicant`, `LoanApplication`, `LoanDecision`, `BankManager`) |
| [`docs/LOAN_RULES.md`](LOAN_RULES.md) | Rules used to interpret and cross-check the financial fields |
| [`docs/API_CONTRACT.md`](API_CONTRACT.md) | Field names and shapes expected by the frontend |
| [`src/config.ts`](../src/config.ts) | Policy thresholds, interest rate, purpose and duration lists |
| [`src/types.ts`](../src/types.ts) | Frontend domain types aligned with the UML classes |

---

## Appendix A — Full application register

Amounts in EUR. Installment and DTI are derived with the documented annuity formula at 6.5% annual rate. The complete financial fields, purposes and decision reasons are in [`sql/seed.sql`](../sql/seed.sql).

| ID | Applicant | Income | Loan | Months | Installment | DTI | Verified | Decision |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | :---: | --- |
| 1 | John Doe | 4,500 | 25,000 | 36 | 766.23 | 23.69% | Yes | Approved |
| 2 | Jane Martin | 1,800 | 12,000 | 24 | 534.56 | 57.48% | No | Rejected |
| 3 | Karim Benali | 3,200 | 10,000 | 12 | 862.96 | 33.22% | Yes | Approved |
| 4 | Amina Mansouri | 3,800 | 18,000 | 24 | 801.83 | 25.05% | Yes | Approved |
| 5 | Lucas Dubois | 4,200 | 30,000 | 48 | 711.45 | 27.65% | Yes | Approved |
| 6 | Emma Bernard | 5,100 | 40,000 | 60 | 782.65 | 27.11% | Yes | Approved |
| 7 | Youssef El Amrani | 3,600 | 15,000 | 36 | 459.74 | 34.99% | Yes | Approved |
| 8 | Sarah Jenkins | 1,600 | 8,000 | 24 | 356.37 | 47.27% | No | Rejected |
| 9 | Mohamed Alami | 5,500 | 50,000 | 48 | 1,185.75 | 27.92% | Yes | Approved |
| 10 | Chloe Laurent | 4,000 | 22,000 | 36 | 674.28 | 21.86% | Yes | Approved |
| 11 | Tariq Haddad | 4,700 | 28,000 | 48 | 664.02 | 33.28% | Yes | Approved |
| 12 | Sophie Moreau | 2,800 | 12,000 | 24 | 534.56 | 22.66% | Yes | Approved |
| 13 | Omar Zeroual | 4,100 | 20,000 | 36 | 612.98 | 21.05% | Yes | Approved |
| 14 | Camille Leroy | 1,400 | 6,000 | 18 | 350.75 | 50.05% | No | Rejected |
| 15 | Bilal Kabbaj | 4,900 | 35,000 | 48 | 830.02 | 32.25% | Yes | Approved |
| 16 | Clara Fontaine | 3,900 | 17,000 | 24 | 757.29 | 27.11% | Yes | Approved |
| 17 | Hamza Chraibi | 3,100 | 14,000 | 36 | 429.09 | 26.74% | Yes | Pending |
| 18 | Lea Roussel | 6,200 | 60,000 | 60 | 1,173.97 | 27.00% | Yes | Approved |
| 19 | Mehdi Tazi | 4,800 | 25,000 | 36 | 766.23 | 20.13% | Yes | Approved |
| 20 | Manon Girard | 2,500 | 10,000 | 24 | 445.46 | 23.82% | Yes | Approved |
| 21 | Rachid Berrada | 5,800 | 30,000 | 36 | 919.47 | 22.75% | Yes | Approved |
| 22 | Juliette Bonnet | 3,300 | 16,000 | 30 | 579.28 | 25.13% | Yes | Approved |
| 23 | Anis Belhaj | 1,300 | 7,000 | 24 | 311.82 | 70.14% | No | Rejected |
| 24 | Ines Gauthier | 4,400 | 26,000 | 36 | 796.87 | 24.93% | Yes | Approved |
| 25 | Reda Naciri | 6,500 | 55,000 | 60 | 1,076.14 | 28.86% | Yes | Approved |
| 26 | Charlotte Perrin | 2,200 | 11,000 | 24 | 490.01 | 42.73% | No | Rejected |
| 27 | Walid Fassi | 3,700 | 19,000 | 36 | 582.33 | 29.25% | Yes | Approved |
| 28 | Alice Fournier | 2,900 | 15,000 | 30 | 543.07 | 51.49% | No | Rejected |
| 29 | Driss Zouaoui | 5,300 | 32,000 | 48 | 758.88 | 19.98% | Yes | Approved |
| 30 | Laura Mercier | 5,900 | 45,000 | 48 | 1,067.17 | 24.87% | Yes | Approved |

### Revision history

| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 2026-11-11 | Initial description of the 30-record fictional dataset (`loan_approval_db`) |
