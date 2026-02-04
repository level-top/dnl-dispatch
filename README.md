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

## Notes

- Next.js 16 requires Node.js >= 20.9.0. For deployment/CI, using an LTS Node version is recommended.
- If you see `EADDRINUSE`, pick different ports (or stop the process already listening on that port).
