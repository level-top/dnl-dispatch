# Vibe API (Express + MySQL)

Express backend for the Dispatch/Operations app.

## Requirements
- Node.js 18+
- MySQL (local or hosted)

## Setup
1) Install deps:
```bash
npm install
```

2) Configure environment:
- Copy `.env.example` to `.env` and update values (DB connection, `JWT_SECRET`).

3) Initialize the database:
- Import `../db/dispatch_todo_app.sql` into MySQL (and optionally run migrations in `../db/`).

## Run
```bash
npm run dev
```
The API starts on `http://localhost:5000` by default.

## Security notes
- Set `CORS_ORIGIN` (comma-separated) in production.
- `/api/screenshot` is admin-only and supports an optional `SCREENSHOT_ALLOWED_HOSTS` allowlist.
