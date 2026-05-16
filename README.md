# DNL Dispatch App

Monorepo with:
- Frontend: Next.js app in `front_end vibecode dnl/dnl_front_end/`
- Backend: Express/MySQL API in `vibe code dnl/`

## Smoke check (recommended)

Runs frontend lint/build/audit, starts `next start`, probes a couple pages, then does backend audit, starts the API, and probes auth behavior.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\smoke.ps1
```

Useful options:

```powershell
# Use different ports
powershell -ExecutionPolicy Bypass -File scripts\smoke.ps1 -FrontendPort 3011 -BackendPort 5011

# Skip expensive steps
powershell -ExecutionPolicy Bypass -File scripts\smoke.ps1 -SkipAudit -SkipBuild

# Run only one side
powershell -ExecutionPolicy Bypass -File scripts\smoke.ps1 -SkipBackend
powershell -ExecutionPolicy Bypass -File scripts\smoke.ps1 -SkipFrontend
```

## Manual run

Frontend:

```powershell
cd "front_end vibecode dnl\dnl_front_end"
npm install
npm run dev
```

Backend:

```powershell
cd "vibe code dnl"
npm install
$env:PORT=5000
npm run dev
```

## Docker Deploy

This repo now includes a Docker Compose setup for VPS deployment using the current MySQL-backed application.

Files:
- `docker-compose.yml`
- `.env.example`
- `front_end vibecode dnl/dnl_front_end/Dockerfile`
- `vibe code dnl/Dockerfile`

Recommended layout:
- Frontend container on internal port `3000`
- Backend container on internal port `5000`
- MySQL container with a persistent named volume
- Uploads stored in a persistent named volume
- Nginx on the VPS host reverse-proxying public domains to the containers

Initial setup:

```bash
cp .env.example .env
```

Update `.env` with your real domain names, DB passwords, and JWT secret.

Start the stack:

```bash
docker compose up -d --build
```

Useful commands:

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
docker compose down
```

Notes:
- The MySQL container initializes from the SQL files in `db/` on first boot only.
- Uploaded files are stored in the `uploads_data` Docker volume so they survive container rebuilds.
- The backend screenshot route uses Chromium inside the container.
- Do not expose ports `3000`, `5000`, or `3306` publicly; reverse-proxy only through Nginx.

## PostgreSQL

PostgreSQL is possible, but it is a separate migration, not a container-only change. The backend currently depends on MySQL-specific behavior and query syntax in many places, including:
- `mysql2/promise` connection handling
- `INSERT IGNORE`
- `ON DUPLICATE KEY UPDATE`
- `IFNULL(...)`
- `DATE_ADD(..., INTERVAL 1 DAY)`
- MySQL placeholder and bulk insert patterns such as `VALUES ?`

Recommendation:
- Deploy with Docker on MySQL first.
- Migrate to PostgreSQL as a separate refactor once production deployment is stable.

## Notes

- Next.js 16 requires Node.js >= 20.9.0. For deployment/CI, using an LTS Node version is recommended.
- If you see `EADDRINUSE`, pick different ports (or stop the process already listening on that port).
