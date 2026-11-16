"""REST API for the LoanFlow MySQL schema in ../sql/schema.sql."""

import os
import re
from datetime import datetime, timedelta, timezone
from typing import Literal

import jwt
import mysql.connector
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pwdlib import PasswordHash

load_dotenv()

app = FastAPI(title="LoanFlow API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


def connect():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "loan_approval_db"),
    )


class ApplicantIn(BaseModel):
    fullName: str = Field(min_length=3, max_length=150)
    idCardNumber: str = Field(min_length=1, max_length=50)
    age: int = Field(ge=18, le=75)
    job: str = Field(max_length=100)
    hasCDI: bool
    isMarried: bool
    numberOfChildren: int = Field(ge=0, le=20)


class DocumentIn(BaseModel):
    name: str
    mimeType: str
    size: int = Field(ge=0)
    uploadedAt: datetime
    dataUrl: str | None = None


class ApplicationIn(BaseModel):
    applicant: ApplicantIn
    monthlyIncome: float = Field(gt=0)
    totalDebt: float = Field(ge=0)
    savings: float = Field(ge=0)
    incomeVerified: bool = False
    incomeDocument: DocumentIn | None = None
    loanAmount: float = Field(gt=0)
    loanDuration: int = Field(gt=0)
    loanPurpose: str
    missedPayments: int = Field(ge=0)


class DecisionIn(BaseModel):
    status: Literal["approved", "denied"]
    reason: str = Field(min_length=8)


class ManagerLoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=256)


password_hasher = PasswordHash.recommended()
SESSION_COOKIE = "loanflow_manager_session"
SESSION_HOURS = 8


def auth_secret() -> str:
    secret = os.getenv("AUTH_SECRET_KEY", "")
    if len(secret) < 32:
        raise HTTPException(status_code=503, detail="Manager authentication is not configured.")
    return secret


def manager_session(manager_id: int, email: str, name: str) -> dict:
    return {"managerId": manager_id, "email": email, "name": name}


def current_manager(request: Request) -> dict:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Manager sign-in required.")
    try:
        claims = jwt.decode(token, auth_secret(), algorithms=["HS256"])
        manager_id = int(claims["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Manager session expired. Sign in again.")

    connection = None
    try:
        connection = connect()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            "SELECT manager_id, name, email FROM bank_managers WHERE manager_id=%s AND password_hash IS NOT NULL",
            (manager_id,),
        )
        manager = cursor.fetchone()
        if not manager:
            raise HTTPException(status_code=401, detail="Manager account is no longer available.")
        return manager_session(manager["manager_id"], manager["email"], manager["name"])
    except mysql.connector.Error as exc:
        raise_database_error(exc)
    finally:
        if connection and connection.is_connected():
            connection.close()


JOINED_SELECT = """SELECT a.application_id, a.applicant_id, a.monthly_income,
 a.total_debt, a.savings, a.income_verified, a.income_document_name,
 a.income_document_type, a.income_document_size, a.income_document_uploaded_at,
 a.income_document_data_url, a.loan_amount, a.loan_duration, a.loan_purpose,
 a.missed_payments, a.created_at, p.full_name, p.id_card_number, p.age, p.job,
 p.has_cdi, p.is_married, p.number_of_children, d.decision_id,
 d.status AS decision_status, d.reason AS decision_reason, d.decision_date,
 m.name AS manager_name
 FROM loan_applications a
 JOIN applicants p ON p.applicant_id = a.applicant_id
 LEFT JOIN loan_decisions d ON d.application_id = a.application_id
 LEFT JOIN bank_managers m ON m.manager_id = d.decided_by_manager_id"""


def reference(row: dict) -> str:
    return f"LA-{row['created_at'].year}-{row['application_id']:04d}"


def serialize(row: dict) -> dict:
    created_at = row["created_at"]
    document = None
    if row.get("income_document_name"):
        uploaded_at = row.get("income_document_uploaded_at") or created_at
        document = {
            "name": row["income_document_name"],
            "mimeType": row["income_document_type"] or "application/octet-stream",
            "size": row["income_document_size"] or 0,
            "uploadedAt": uploaded_at.isoformat(),
            "dataUrl": row.get("income_document_data_url"),
        }

    db_status = row.get("decision_status") or "PENDING"
    status = {"PENDING": "pending", "APPROVED": "approved", "REJECTED": "denied"}[db_status]
    decision = None
    if db_status != "PENDING":
        decision = {
            "decisionId": f"DEC-{row['decision_id']:06d}",
            "status": status,
            "reason": row.get("decision_reason") or "",
            "decisionDate": row["decision_date"].isoformat(),
            "managerName": row.get("manager_name") or "Bank manager",
        }

    return {
        "applicationId": reference(row),
        "applicant": {
            "applicantId": f"APL-{row['applicant_id']:06d}",
            "fullName": row["full_name"],
            "idCardNumber": row["id_card_number"],
            "age": row["age"],
            "job": row["job"] or "",
            "hasCDI": bool(row["has_cdi"]),
            "isMarried": bool(row["is_married"]),
            "numberOfChildren": row["number_of_children"],
        },
        "monthlyIncome": float(row["monthly_income"]),
        "totalDebt": float(row["total_debt"]),
        "savings": float(row["savings"]),
        "incomeVerified": bool(row["income_verified"]),
        "incomeDocument": document,
        "loanAmount": float(row["loan_amount"]),
        "loanDuration": row["loan_duration"],
        "loanPurpose": row["loan_purpose"] or "",
        "missedPayments": row["missed_payments"],
        "status": status,
        "createdAt": created_at.isoformat(),
        "decision": decision,
    }


def get_row_by_reference(cursor, app_ref: str):
    match = re.fullmatch(r"LA-(\d{4})-(\d+)", app_ref)
    if not match:
        return None
    cursor.execute(JOINED_SELECT + " WHERE a.application_id = %s", (int(match.group(2)),))
    row = cursor.fetchone()
    return row if row and reference(row) == app_ref else None


def raise_database_error(exc: mysql.connector.Error):
    raise HTTPException(status_code=503, detail=f"Database error: {exc.msg}")


@app.get("/api/health")
def health():
    try:
        connection = connect()
        connection.close()
        return {"status": "ok", "database": os.getenv("DB_NAME", "loan_approval_db")}
    except mysql.connector.Error as exc:
        raise_database_error(exc)


@app.post("/api/auth/login")
def login_manager(payload: ManagerLoginIn, response: Response):
    connection = None
    try:
        connection = connect()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            "SELECT manager_id, name, email, password_hash FROM bank_managers WHERE email=%s",
            (payload.email.strip().lower(),),
        )
        manager = cursor.fetchone()
        if not manager or not manager["password_hash"] or not password_hasher.verify(
            payload.password, manager["password_hash"]
        ):
            raise HTTPException(status_code=401, detail="Incorrect email or password.")

        expires = datetime.now(timezone.utc) + timedelta(hours=SESSION_HOURS)
        token = jwt.encode(
            {"sub": str(manager["manager_id"]), "exp": expires},
            auth_secret(),
            algorithm="HS256",
        )
        response.set_cookie(
            key=SESSION_COOKIE,
            value=token,
            max_age=SESSION_HOURS * 60 * 60,
            httponly=True,
            secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
            samesite="lax",
            path="/api",
        )
        return manager_session(manager["manager_id"], manager["email"], manager["name"])
    except HTTPException:
        raise
    except mysql.connector.Error as exc:
        raise_database_error(exc)
    finally:
        if connection and connection.is_connected():
            connection.close()


@app.get("/api/auth/me")
def get_manager_session(manager: dict = Depends(current_manager)):
    return manager


@app.post("/api/auth/logout", status_code=204)
def logout_manager(response: Response):
    response.delete_cookie(key=SESSION_COOKIE, path="/api", httponly=True, samesite="lax")


@app.get("/api/applications")
def list_applications(manager: dict = Depends(current_manager)):
    connection = None
    try:
        connection = connect()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(JOINED_SELECT + " ORDER BY a.created_at DESC, a.application_id DESC")
        return {"items": [serialize(row) for row in cursor.fetchall()]}
    except mysql.connector.Error as exc:
        raise_database_error(exc)
    finally:
        if connection and connection.is_connected():
            connection.close()


@app.get("/api/applications/{application_id}")
def get_application(application_id: str):
    connection = None
    try:
        connection = connect()
        cursor = connection.cursor(dictionary=True)
        row = get_row_by_reference(cursor, application_id)
        if not row:
            raise HTTPException(status_code=404, detail="Application not found.")
        return {"application": serialize(row)}
    except mysql.connector.Error as exc:
        raise_database_error(exc)
    finally:
        if connection and connection.is_connected():
            connection.close()


@app.post("/api/applications", status_code=201)
def create_application(payload: ApplicationIn):
    connection = None
    try:
        connection = connect()
        cursor = connection.cursor(dictionary=True)
        a = payload.applicant
        # The same applicant may submit more than one loan application. Look up
        # their unique ID first so repeat applications reuse the existing row.
        # Normalize separators because the frontend accepts formatted CNIB IDs.
        normalized_id = re.sub(r"\D", "", a.idCardNumber)
        cursor.execute(
            "SELECT applicant_id FROM applicants WHERE id_card_number=%s FOR UPDATE",
            (normalized_id,),
        )
        existing_applicant = cursor.fetchone()
        if existing_applicant:
            applicant_id = existing_applicant["applicant_id"]
            cursor.execute(
                """UPDATE applicants SET full_name=%s, age=%s, job=%s, has_cdi=%s,
                   is_married=%s, number_of_children=%s WHERE applicant_id=%s""",
                (a.fullName, a.age, a.job, a.hasCDI, a.isMarried,
                 a.numberOfChildren, applicant_id),
            )
        else:
            cursor.execute(
                """INSERT INTO applicants
                (full_name, id_card_number, age, job, has_cdi, is_married, number_of_children)
                VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                (a.fullName, normalized_id, a.age, a.job, a.hasCDI,
                 a.isMarried, a.numberOfChildren),
            )
            applicant_id = cursor.lastrowid
        doc = payload.incomeDocument
        cursor.execute(
            """INSERT INTO loan_applications
            (applicant_id, monthly_income, total_debt, savings, income_verified,
             income_document_name, income_document_type, income_document_size,
             income_document_uploaded_at, income_document_data_url, loan_amount,
             loan_duration, loan_purpose, missed_payments)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (applicant_id, payload.monthlyIncome, payload.totalDebt, payload.savings,
             bool(doc), doc.name if doc else None, doc.mimeType if doc else None,
             doc.size if doc else None, doc.uploadedAt.replace(tzinfo=None) if doc else None,
             doc.dataUrl if doc else None, payload.loanAmount, payload.loanDuration,
             payload.loanPurpose, payload.missedPayments),
        )
        application_id = cursor.lastrowid
        # A pending decision row represents the schema's application status.
        cursor.execute(
            "INSERT INTO loan_decisions (application_id, status) VALUES (%s, 'PENDING')",
            (application_id,),
        )
        connection.commit()
        cursor.execute(JOINED_SELECT + " WHERE a.application_id = %s", (application_id,))
        return {"application": serialize(cursor.fetchone())}
    except mysql.connector.IntegrityError as exc:
        if connection:
            connection.rollback()
        if exc.errno == 1062:
            raise HTTPException(status_code=409, detail="An applicant with this ID number already exists.")
        raise HTTPException(status_code=400, detail="Could not save the application.")
    except mysql.connector.Error as exc:
        if connection:
            connection.rollback()
        raise_database_error(exc)
    finally:
        if connection and connection.is_connected():
            connection.close()


@app.post("/api/applications/{application_id}/decision")
def decide_application(
    application_id: str,
    payload: DecisionIn,
    manager: dict = Depends(current_manager),
):
    connection = None
    try:
        connection = connect()
        cursor = connection.cursor(dictionary=True)
        match = re.fullmatch(r"LA-(\d{4})-(\d+)", application_id)
        if not match:
            raise HTTPException(status_code=404, detail="Application not found.")
        numeric_id = int(match.group(2))
        cursor.execute(
            "SELECT application_id, created_at FROM loan_applications WHERE application_id=%s FOR UPDATE",
            (numeric_id,),
        )
        application = cursor.fetchone()
        if not application or f"LA-{application['created_at'].year}-{numeric_id:04d}" != application_id:
            raise HTTPException(status_code=404, detail="Application not found.")

        cursor.execute(
            "SELECT decision_id, status FROM loan_decisions WHERE application_id=%s FOR UPDATE",
            (numeric_id,),
        )
        decision = cursor.fetchone()
        if decision and decision["status"] != "PENDING":
            raise HTTPException(status_code=409, detail="This application has already been decided.")

        manager_id = manager["managerId"]

        db_status = "APPROVED" if payload.status == "approved" else "REJECTED"
        if decision:
            cursor.execute(
                """UPDATE loan_decisions SET status=%s, reason=%s, decision_date=NOW(),
                   decided_by_manager_id=%s WHERE decision_id=%s""",
                (db_status, payload.reason, manager_id, decision["decision_id"]),
            )
        else:
            cursor.execute(
                """INSERT INTO loan_decisions
                   (application_id, status, reason, decided_by_manager_id)
                   VALUES (%s,%s,%s,%s)""",
                (numeric_id, db_status, payload.reason, manager_id),
            )
        cursor.execute(
            "UPDATE loan_applications SET reviewed_by_manager_id=%s WHERE application_id=%s",
            (manager_id, numeric_id),
        )
        connection.commit()
        cursor.execute(JOINED_SELECT + " WHERE a.application_id=%s", (numeric_id,))
        return {"application": serialize(cursor.fetchone())}
    except HTTPException:
        if connection:
            connection.rollback()
        raise
    except mysql.connector.Error as exc:
        if connection:
            connection.rollback()
        raise_database_error(exc)
    finally:
        if connection and connection.is_connected():
            connection.close()
