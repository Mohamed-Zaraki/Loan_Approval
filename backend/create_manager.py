"""Interactively create a database-backed manager login."""

import getpass
import os
import re
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv
from pwdlib import PasswordHash

load_dotenv(Path(__file__).with_name(".env"))


def main() -> None:
    name = input("Manager full name: ").strip()
    email = input("Manager email: ").strip().lower()
    password = getpass.getpass("New manager password (12+ characters): ")
    confirm = getpass.getpass("Confirm password: ")

    if len(name) < 2:
        raise SystemExit("Enter the manager's full name.")
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise SystemExit("Enter a valid email address.")
    if len(password) < 12:
        raise SystemExit("Use a password with at least 12 characters.")
    if password != confirm:
        raise SystemExit("Passwords did not match.")

    config = {
        "host": os.getenv("DB_HOST", "127.0.0.1"),
        "port": int(os.getenv("DB_PORT", "3306")),
        "user": os.getenv("DB_USER", "root"),
        "password": os.getenv("DB_PASSWORD", ""),
        "database": os.getenv("DB_NAME", "loan_approval_db"),
    }
    connection = mysql.connector.connect(**config)
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT manager_id FROM bank_managers WHERE email=%s", (email,))
        if cursor.fetchone():
            raise SystemExit("That email already has a manager account.")

        cursor.execute(
            "SELECT manager_id FROM bank_managers WHERE name=%s AND email IS NULL LIMIT 1",
            (name,),
        )
        existing = cursor.fetchone()
        password_hash = PasswordHash.recommended().hash(password)
        if existing:
            cursor.execute(
                "UPDATE bank_managers SET email=%s, password_hash=%s WHERE manager_id=%s",
                (email, password_hash, existing["manager_id"]),
            )
        else:
            cursor.execute(
                "INSERT INTO bank_managers (name, email, password_hash) VALUES (%s,%s,%s)",
                (name, email, password_hash),
            )
        connection.commit()
        print(f"Manager account created for {name} ({email}).")
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()
