# LoanFlow configuration

LoanFlow needs two kinds of configuration: the browser build (`VITE_*`, read by
Vite at build time) and the backend runtime (`DB_*`, authentication, CORS).

Copy the templates and fill them in:

```powershell
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env
```

`.env` files are ignored by git. Never commit real credentials.

## Backend variables (`backend/.env`)

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `DB_HOST` | yes | `127.0.0.1` | MySQL host |
| `DB_PORT` | yes | `3306` | MySQL port |
| `DB_USER` | yes | `root` | MySQL user |
| `DB_PASSWORD` | yes | *(secret)* | MySQL password |
| `DB_NAME` | yes | `loan_approval_db` | Database name |
| `AUTH_SECRET_KEY` | yes | 48+ random characters | Signs the manager session JWT (HS256). Must be at least 32 characters, otherwise authentication returns `503`. |
| `COOKIE_SECURE` | production | `true` | Sends the session cookie over HTTPS only. Keep `false` for local HTTP. |
| `COOKIE_SAMESITE` | no | `lax` | `lax` for same-origin (default), `none` when the frontend is on another domain (requires `COOKIE_SECURE=true`), `strict` for maximum isolation. |
| `CORS_ORIGINS` | only for split origins | `https://loanflow.example.com` | Comma-separated browser origins allowed to call the API. Unused when FastAPI serves the frontend itself. |

Generate a secret:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Never reuse a development secret in production.

## Frontend variables (root `.env`)

| Variable | Development | Production | Purpose |
|---|---|---|---|
| `VITE_API_URL` | `/api` | Full URL, e.g. `https://api.example.com/api` | Base URL for API calls in `src/api/httpApi.ts`. Baked into the bundle at build time. |

With `/api`, Vite's dev proxy forwards requests to `http://127.0.0.1:8000`.
In production there is no Vite proxy: if the frontend and API are on different
origins, `VITE_API_URL` must be the absolute API URL and the backend
`CORS_ORIGINS` must list the frontend origin.

## Deployment checklist

1. Set every required backend variable in the hosting provider's dashboard.
2. Set `AUTH_SECRET_KEY` to a fresh random value of at least 32 characters.
3. Set `COOKIE_SECURE=true` on any HTTPS deployment.
4. Choose one deployment shape:
   - **Single origin (recommended):** FastAPI serves the built frontend; keep
     `VITE_API_URL=/api`, `COOKIE_SAMESITE=lax`; CORS is not needed.
   - **Split origins:** frontend on its own host; set an absolute
     `VITE_API_URL`, `COOKIE_SAMESITE=none`, `COOKIE_SECURE=true`, and add the
     frontend origin to `CORS_ORIGINS`.
5. Create the manager account in the deployed database with
   `backend/create_manager.py` or reset an existing one with
   `backend/set_manager_password.py`.
6. Verify `GET /api/health` returns `{"status":"ok", ...}` before testing login.

## Local development

```powershell
# Terminal 1 - API on http://127.0.0.1:8000
cd backend
.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000

# Terminal 2 - UI on http://localhost:5173
npm run dev
```

Or run `start.bat`, which starts both and checks `/api/health` first.
