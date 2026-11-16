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
| `FRONTEND_DIST` | only for single origin | `/app/dist` | Folder containing the built frontend. Defaults to the project `dist/` next to `backend/`; when `index.html` exists there, FastAPI serves the SPA and the API on the same origin. |

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
   - **Single origin (recommended):** run `npm run build` so `dist/index.html`
     exists (or point `FRONTEND_DIST` at it). FastAPI then serves the SPA,
     `/assets` and the API on one origin; keep `VITE_API_URL=/api` and
     `COOKIE_SAMESITE=lax`; CORS is not needed. Deep links such as `/manager`
     fall back to `index.html`.
   - **Split origins:** frontend on its own host; set an absolute
     `VITE_API_URL`, `COOKIE_SAMESITE=none`, `COOKIE_SECURE=true`, and add the
     frontend origin to `CORS_ORIGINS`.
5. Create the manager account in the deployed database with
   `backend/create_manager.py` or reset an existing one with
   `backend/set_manager_password.py`.
6. Verify `GET /api/health` returns `{"status":"ok", ...}` before testing login.

## Container image (Railway and Docker)

The repository root contains a two-stage `Dockerfile`:

1. `node:22-alpine` runs `npm ci` and `npm run build` to produce `dist/`.
2. `python:3.13-slim` installs `backend/requirements.txt`, copies the backend and
   the built `dist/`, and starts `uvicorn` on `$PORT` (default `8080`).

Because FastAPI serves the SPA from the same origin, no separate frontend
service or CORS configuration is required. `FRONTEND_DIST=/app/dist` is set in
the image.

`railway.json` tells Railway to build this Dockerfile and use `/api/health` as
the deployment healthcheck. The service needs the backend variables above
(`DB_*`, `AUTH_SECRET_KEY`, `COOKIE_SECURE`, `COOKIE_SAMESITE`); do not bake
them into the image.

Build and run locally:

```powershell
docker build -t loanflow .
docker run --rm -p 8080:8080 --env-file backend\.env loanflow
```

Open http://localhost:8080. The container needs network access to MySQL; when
the database runs on the host, set `DB_HOST=host.docker.internal`.

## Local development

```powershell
# Terminal 1 - API on http://127.0.0.1:8000
cd backend
.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000

# Terminal 2 - UI on http://localhost:5173
npm run dev
```

Or run `start.bat`, which starts both and checks `/api/health` first.
