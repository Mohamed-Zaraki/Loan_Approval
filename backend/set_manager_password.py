"""Set or reset the password for an existing manager account."""

import getpass
import os
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv
from pwdlib import PasswordHash

load_dotenv(Path(__file__).with_name(".env"))


def main() -> None:
    email = input("Manager email: ").strip().lower()
    password = getpass.getpass("New password (12+ characters): ")
    confirm = getpass.getpass("Confirm password: ")

    if len(password) < 12:
        raise SystemExit("Use a password with at least 12 characters.")
    if password != confirm:
        raise SystemExit("Passwords did not match.")

    connection = mysql.connector.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "loan_approval_db"),
    )
    cursor = connection.cursor()
    try:
        password_hash = PasswordHash.recommended().hash(password)
        cursor.execute(
            "UPDATE bank_managers SET password_hash=%s WHERE email=%s",
            (password_hash, email),
        )
        if cursor.rowcount == 0:
            raise SystemExit(f"No manager account exists for {email}.")
        connection.commit()
        print(f"Password updated for {email}. The hash is stored, never the password.")
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()
