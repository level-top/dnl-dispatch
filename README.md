# DNL Dispatch App

Monorepo with:
- Frontend: Next.js app in `front_end vibecode dnl/dnl_front_end/`
- Backend: Express/MySQL API in `vibe code dnl/`

## Default Dev Login

For a fresh Docker setup that initializes a new MySQL volume from `db/dispatch_todo_app.sql`, the seeded admin login is:

- Username: `admin`
- Password: `admin`

Important:
- this only applies to a fresh database initialized from the seed SQL
- if the MySQL volume already exists, Docker will keep the existing data instead of re-importing the seed
- change the admin password after first login in any shared or non-local environment

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

## Production Deployment

Recommended production target: one VPS running Docker with Nginx on the host.

Architecture:
- Frontend container listens on internal port `3000`
- Backend container listens on internal port `5000`
- MySQL runs in Docker with a persistent named volume
- Uploaded files live in a persistent named volume
- Nginx on the VPS terminates TLS and reverse-proxies by domain/subdomain

Recommended domains:
- `dispatch.example.com` -> frontend
- `api.dispatch.example.com` -> backend

Important:
- Do not use `docker-compose.local.yml` on the VPS.
- Do not expose MySQL publicly.
- Do not bind the app publicly to `3000` or `5000`.
- If another app already uses VPS port `3000`, that is fine. Keep this app behind Nginx on localhost-only container bindings.

### 1. Copy the repo to the VPS

```bash
git clone https://github.com/level-top/dnl-dispatch.git
cd dnl-dispatch
```

### 2. Create production environment values

```bash
cp .env.example .env
```

Update `.env` with real values:

```env
MYSQL_DATABASE=dispatch_todo_app
MYSQL_USER=dnl
MYSQL_PASSWORD=use-a-strong-password
MYSQL_ROOT_PASSWORD=use-a-different-strong-root-password

JWT_SECRET=use-a-long-random-secret
CORS_ORIGIN=https://dispatch.example.com
SCREENSHOT_ALLOWED_HOSTS=dispatch.example.com,api.dispatch.example.com

NEXT_PUBLIC_API_BASE=https://api.dispatch.example.com/api
```

### 3. Add VPS-only localhost port bindings

Create `docker-compose.vps.yml`:

```yaml
services:
	backend:
		ports:
			- "127.0.0.1:5001:5000"

	frontend:
		ports:
			- "127.0.0.1:3001:3000"
```

This keeps the containers private while allowing host Nginx to proxy to them.

### 4. Start the production stack

```bash
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build
```

Check status:

```bash
docker compose -f docker-compose.yml -f docker-compose.vps.yml ps
docker compose -f docker-compose.yml -f docker-compose.vps.yml logs -f backend
docker compose -f docker-compose.yml -f docker-compose.vps.yml logs -f frontend
docker compose -f docker-compose.yml -f docker-compose.vps.yml logs -f db
```

### 5. Configure Nginx on the VPS host

Example Nginx config:

```nginx
server {
		listen 80;
		server_name dispatch.example.com;

		location / {
				proxy_pass http://127.0.0.1:3001;
				proxy_http_version 1.1;
				proxy_set_header Host $host;
				proxy_set_header X-Real-IP $remote_addr;
				proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
				proxy_set_header X-Forwarded-Proto $scheme;
				proxy_set_header Upgrade $http_upgrade;
				proxy_set_header Connection "upgrade";
		}
}

server {
		listen 80;
		server_name api.dispatch.example.com;

		location / {
				proxy_pass http://127.0.0.1:5001;
				proxy_http_version 1.1;
				proxy_set_header Host $host;
				proxy_set_header X-Real-IP $remote_addr;
				proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
				proxy_set_header X-Forwarded-Proto $scheme;
		}
}
```

### 6. Enable TLS

After DNS points to the VPS:

```bash
sudo certbot --nginx -d dispatch.example.com -d api.dispatch.example.com
```

### 7. Verify production

```bash
curl -I https://dispatch.example.com
curl -I https://api.dispatch.example.com/
```

Expected result:
- frontend returns `200`
- backend root returns `200`
- protected API routes return `401` without a token

### 8. Ongoing updates

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build
```

### 9. Optional GitHub Actions CI/CD

If you want every push to `main` to deploy automatically to the VPS, this repo includes a workflow at `.github/workflows/deploy.yml`.

What it does:
- connects to your VPS over SSH
- runs `scripts/deploy-vps.sh`
- pulls the latest `main`
- rebuilds and restarts the Docker stack with `docker-compose.vps.yml`

Server preparation:

```bash
cd /var/www/dnl-dispatch
chmod +x scripts/deploy-vps.sh
```

Important:
- the VPS deploy user must have access to Docker without interactive sudo
- the repo on the VPS must already be cloned at `/var/www/dnl-dispatch`
- `docker-compose.vps.yml` and `.env` must already exist on the VPS

Add these GitHub repository secrets:
- `VPS_HOST` : your server IP or hostname
- `VPS_USER` : the Linux user used for deployment
- `VPS_SSH_KEY` : the private SSH key for that user
- `VPS_PORT` : optional, defaults to `22`
- `VPS_APP_DIR` : optional, defaults to `/var/www/dnl-dispatch`

Then every push to `main` will deploy automatically. You can also run it manually from the GitHub Actions tab with `workflow_dispatch`.

Production notes:
- The MySQL container initializes from the SQL files in `db/` only on the first boot of a fresh database volume.
- Uploaded files are stored in the `uploads_data` volume and survive container rebuilds.
- The backend screenshot route uses Chromium inside the container.
- Back up both `mysql_data` and `uploads_data`.

## Daily Database Backups

The repo now includes a daily MySQL backup workflow that writes compressed dumps into `backups/daily/` on the host. That host folder is mounted into the backend container as `/app/backups`, which allows admin-only API access to the saved dumps.

### Manual backup

From the repo root on the server:

```bash
bash ./scripts/db-backup.sh
```

What it does:
- creates `backups/daily/` if it does not exist
- runs `mysqldump` inside the running `db` container
- stores a file like `dnl-backup-2026-05-18_02-00-00.sql.gz`
- deletes backup files older than `BACKUP_RETENTION_DAYS` days

### Install daily cron job

On a Linux VPS:

```bash
bash ./scripts/install-daily-backup-cron.sh
```

Default schedule:
- every day at `02:00`

Optional environment variables:

```bash
CRON_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30
```

### Admin-only backup API

These endpoints require a valid admin JWT:

- `GET /api/backups` : list available backup files
- `GET /api/backups/:fileName/download` : download one backup file
- `DELETE /api/backups/:fileName` : remove one backup file from the server

Example with curl:

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" https://api.dispatch.example.com/api/backups
curl -L -H "Authorization: Bearer YOUR_ADMIN_TOKEN" -o latest-backup.sql.gz https://api.dispatch.example.com/api/backups/dnl-backup-2026-05-18_02-00-00.sql.gz/download
curl -X DELETE -H "Authorization: Bearer YOUR_ADMIN_TOKEN" https://api.dispatch.example.com/api/backups/dnl-backup-2026-05-18_02-00-00.sql.gz
```

Important:
- keep backups offsite as well if the VPS disk fails
- test restore periodically instead of assuming dumps are valid
- do not commit files from `backups/daily/`

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
