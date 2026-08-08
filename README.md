# Jose M. Hernandez Portfolio

A React and Vite portfolio with operations-tracker and weekly-report pages.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Install

```powershell
npm.cmd ci
```

On macOS or Linux, use `npm ci` instead.

## Run locally

```powershell
npm.cmd run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

## Automated checks

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Use `npm.cmd run test:watch` while developing to rerun tests after changes.

## Routes

- `/` - portfolio
- `/ops-tracker` - operations tracker
- `/weekly-report` - weekly report

## Environment variables

The Supabase client expects these Vite environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```
