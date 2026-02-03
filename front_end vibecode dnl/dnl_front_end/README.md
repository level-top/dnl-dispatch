
# Drive Now Logistics Dashboard

Next.js (App Router) frontend for the Dispatch/Operations platform. It includes JWT login and role-based access for Admin / Dispatcher / Sales Agent, and connects to the Express.js backend API.

## Features
- JWT login + role-based UI
- Role-scoped data views (server enforced; UI also hides/blocks routes)
- CRUD screens for core entities (Users, Drivers, Loads, Invoices, Assignments)
- Tailwind styling + dashboard charts

## Getting Started

1. **Install dependencies:**
	```bash
	npm install
	```
2. **Run the development server:**
	```bash
	npm run dev
	```
3. **Open [http://localhost:3000](http://localhost:3000) in your browser.**

## Configuration
The frontend reads the backend API base URL from `NEXT_PUBLIC_API_BASE`.

- Local dev default is set in `.env.local`:
	- `NEXT_PUBLIC_API_BASE=http://localhost:5000/api`
- For deployment, set `NEXT_PUBLIC_API_BASE` to your hosted API URL (e.g. `https://api.your-domain.com/api`).
- See `.env.example` for a template.

## API Endpoints
The app expects the backend API to be running locally with the following endpoints:

- `/api/users` (CRUD)
- `/api/loads` (CRUD)
- `/api/drivers` (CRUD)
- `/api/assignments` (CRUD, plus dispatcher/driver queries)
- `/api/invoices` (CRUD + payments/audit)
- `/api/settlements/weekly` (weekly settlement invoice creation)

## Notes (roles)
- **Admin**: full access
- **Dispatcher**: Loads + Load Management; dashboard invoice stats are read-only (no invoice navigation)
- **Sales Agent**: Drivers; dashboard is read-only and scoped to drivers they added

## Project Structure
- `src/app/` — Main app pages and routing
- `src/components/` — Reusable UI components
- `src/utils/` — API utility functions


