# RouteData

A table-first embedded analytics workspace for logistics and supply chain teams. Users select columns from authorized Luzmo data, generate a live Source Table, get operational insights (including AI-assisted chart generation), and assemble reusable workbooks on a Flex-powered canvas.

## What It Does

1. **Connect** — Authenticates against Luzmo via server-side embed token generation (`/api/embed-token`).
2. **Select Fields** — Browse and select dataset columns via ACK’s data field panel.
3. **Source Table** — Selected columns drive a live tabular preview.
4. **Filters** — Build nested AND/OR filter groups with ACK’s `luzmo-filters`.
5. **AI Mode** — `POST /api/ai-chart` returns Flex slot definitions from selected columns or from a natural-language prompt; previews use `LuzmoVizItemComponent`.
6. **Workbook (Reporting)** — Three-panel editor: field panel → `luzmo-item-grid` → Chart Data / Filters / Options / AI Mode.
7. **Chart configuration** — Configure slots via ACK picker or drag-and-drop panels.
8. **Chart options** — Edit Flex options via ACK’s option panel.
9. **Save & load** — Persist workbook definitions to `localStorage` under the key `routedata:workbooks` (older keys are migrated automatically).

## Package Roles

| Package | Role | Where Used |
|---------|------|------------|
| **@luzmo/analytics-components-kit (ACK)** | Chart config UI + **`luzmo-item-grid`** | Workbook builder: fields, grid, builder tabs |
| **@luzmo/react-embed** | Flex: `LuzmoVizItemComponent` | AI Mode / previews |
| **@luzmo/lucero** | Design system primitives (optional) | Available; Tailwind drives most UI |
| **@luzmo/nodejs-sdk** | Server-side embed token generation | `/api/embed-token` |

## ACK component tags (this repo uses `@luzmo/analytics-components-kit`)

Some Luzmo docs refer to older tag names; this SDK version uses:

| Concept | Web component |
|---------|----------------|
| Draggable fields | **`luzmo-data-field-panel`** with `datasetsDataFields` |
| Slot drop / picker | **`luzmo-item-slot-drop-panel`** / **`luzmo-item-slot-picker-panel`** |
| Chart options | **`luzmo-item-option-panel`** |
| Filters | **`luzmo-filters`** |
| Dashboard grid | **`luzmo-item-grid`** |

## Luzmo APIs

- **Source table & field list** — `POST /0.1.0/data` and ACK `loadDataFieldsForDatasets` (static import from `@luzmo/analytics-components-kit/utils` for Next/Turbopack).
- **Flex charts** — `LuzmoVizItemComponent` with slots from `/api/ai-chart` or the Chart Data tab. See [Flex basic usage](https://developer.luzmo.com/guide/flex--introduction--basic-usage.md).
- **Embed auth** — [Generating an embed authorization token](https://developer.luzmo.com/guide/dashboard-embedding--generating-an-authorization-token.md) via `@luzmo/nodejs-sdk`.

## Running the App

```bash
cd routedata   # project root (clone path may differ)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

Create `.env.local` with your Luzmo credentials:

```env
LUZMO_API_KEY=your-api-key
LUZMO_API_TOKEN=your-api-token
LUZMO_API_HOST=https://api.luzmo.com
LUZMO_APP_SERVER=https://app.luzmo.com
# Client + Flex: `lib/luzmo/endpoints.ts` normalizes hosts so `https://luzmo.com` → `https://app.luzmo.com` (EU defaults per Luzmo docs).
LUZMO_DATASET_ID=your-dataset-id

# Optional — embed identity (see Luzmo “Generate an Embed Authorization token”).
# Defaults in code: username `routedata-demo-user`, name `RouteData`, suborganization `routedata`.
# Set LUZMO_EMBED_SUBORGANIZATION to your real Luzmo organization slug if embed creation fails.
# LUZMO_EMBED_USERNAME=  LUZMO_EMBED_NAME=  LUZMO_EMBED_EMAIL=
# LUZMO_EMBED_ROLE=designer   # viewer | designer | owner
```

`POST /api/embed-token` returning **HTTP 200** means Luzmo returned an embed key + token. The JSON may include a **`warning`** if access is partial — check the browser console for `[Luzmo embed-token]`. If **data** or **Flex** still fail:

1. **Dataset on the token** — The app sends `datasetId` in the POST body. It must match the dataset your charts query. Server falls back to `LUZMO_DATASET_ID` / `NEXT_PUBLIC_LUZMO_DATASET_ID`. The workbook step **re-mints** the embed when the dataset changes and **waits** before mounting `luzmo-item-grid`; a token for dataset A while slots reference dataset B often shows a **permanent Flex loader**.
2. **API user rights** — The Luzmo **API key/token** should belong to a user with **`use`** on that dataset.
3. **Region** — US tenants need `https://api.us.luzmo.com` + `https://app.us.luzmo.com` (both `LUZMO_*` and `NEXT_PUBLIC_*` via `next.config` / rebuild).
4. **Parallel refreshes** — Embed refresh is serialized so overlapping token mints don’t invalidate each other mid-load.
5. **AI Mode** — Each preview loads its own **Flex** embed; several at once is heavier on the browser.
6. **App server** — Use **`https://app.luzmo.com`** for `LUZMO_APP_SERVER` / `NEXT_PUBLIC_LUZMO_APP_SERVER`, not the marketing site.
7. **`POST /api/ai-chart`** — Rule-based suggestions or Luzmo `aichart` when `question` is supplied.
8. **`npm run dev`** watches `.env.local` / `.env` and restarts Next when they change. Use **`npm run dev:plain`** for a single `next dev` with no watcher.

## What Still Needs Credentials / Backend Wiring

- **End-user auth** — Add real authentication before embed token generation (per-user embed identity).
- **Multi-dataset** — Extend dataset listing beyond the configured default.

## Context Files (optional)

- `ack_llms.txt` — ACK component documentation
- `lucero_llms.txt` — Lucero design system reference

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- React 19
- Tailwind CSS v4
- `localStorage` for workbook persistence
- Typed service abstractions for Luzmo integration

## Folder Structure

```
app/                    # App Router pages and API routes
  api/embed-token/      # Embed authorization
components/
  ack/                  # ACK wrappers (grid, field panel, etc.)
  insights/             # AI Mode / suggestions
  source-table/         # Source table preview
  workbook/             # Save / load dialogs
hooks/
lib/
  domain/routedata.ts   # App name, copy, field group labels
  domain/kpi-columns.ts # Optional known UUIDs for demo KPIs
  services/             # Luzmo + workbook persistence
```
# routedata
