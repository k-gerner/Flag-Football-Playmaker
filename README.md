# Flag Football Playmaker

Flag Football Playmaker is a React app for designing offensive flag football plays, grouping them into cloud-saved Play Sets, and exporting whole wristband installs as PDFs.

## What It Does

- Organize plays into Play Sets like `Team A`, `Team B`, or install packages
- Sign in with email/password using Supabase Auth
- Save Play Sets and plays in Supabase Postgres
- Choose shared Play Set settings such as:
  - player count
  - field theme
  - card background color
  - plays per page
  - card aspect ratio
  - print dimensions
- Edit play-specific settings such as visible yard markers
- Drag offensive players around the board
- Draw routes, motion, and handoffs
- Export either the active play or the whole Play Set to PDF

## Tech Stack

- React
- TypeScript
- Tailwind CSS
- Vite
- Supabase Auth + Postgres
- jsPDF + svg2pdf.js

## Setup

### Requirements

- Node.js 20+ or 22+
- npm 10+
- A Supabase project

### Install dependencies

```bash
npm install
```

### Configure Supabase

Copy the example env file and fill in your project values:

```bash
cp .env.example .env
```

Required values:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Create the database tables

Run the SQL in [supabase/schema.sql](/Users/kgerner/Documents/Personal%20Projects/Flag-Football-Playmaker/supabase/schema.sql) inside the Supabase SQL editor.

That creates:
- `play_sets`
- `plays`
- row-level security policies so users only access their own data

### Run the app

```bash
npm run dev
```

Then open the local Vite URL shown in the terminal.

### Run tests

```bash
npm test
```

### Build

```bash
npm run build
```

## How to Use

### 1. Sign in

Use the email/password screen to create an account or sign in.

### 2. Create a Play Set

Use `New set` in the left rail.

Each Play Set owns the shared settings for that group of plays:
- player count
- field style
- card background color
- print size
- plays per page
- card aspect ratio

### 3. Create plays inside the set

Use `New play` inside the active Play Set.

Each play gets:
- its own drawing data
- its own notes
- its own yard-marker visibility settings
- a `play_number` inside the set

You can:
- duplicate a play
- move it up or down in the set
- delete it
- copy it into another Play Set

### 4. Edit the playboard

Use the top toolbar:
- `Select` to move players and path control points
- `Route` to draw solid routes
- `Motion` to draw dashed motion paths
- `Handoff` to connect two players

When a player is selected, you can change:
- label
- color

### 5. Tune Play Set export settings

In the inspector, use:
- `Plays per page`
- `Card aspect ratio`
- `Preset size`
- custom width/height/unit

These settings apply to the whole Play Set export.

### 6. Tune play-specific display settings

For the active play, you can choose:
- which yard markers are visible
- whether the line-of-scrimmage label is shown

### 7. Export PDFs

- `Export Set PDF` exports the whole Play Set in `play_number` order
- `Export Play` exports only the active play

## Data Model

The app stores:

- Play Set metadata and shared settings in `play_sets.settings_json`
- Play drawing payloads in `plays.play_data_json`

That JSON-backed structure is intentional so new configurable settings can be added later without redesigning the database.

## Project Structure

- `src/App.tsx`: auth-aware app shell and workspace state
- `src/components/`: auth, library, inspector, toolbar, playboard
- `src/lib/types.ts`: public frontend types
- `src/lib/playbook.ts`: defaults, settings normalization, play creation helpers
- `src/lib/backend.ts`: Supabase adapter plus in-memory test backend
- `src/lib/pdf.ts`: single-play and whole-set PDF export
- `supabase/schema.sql`: Postgres schema and RLS policies

## Troubleshooting

### `npm run dev` or `npm run build` gets killed

This project starts Vite and TypeScript with a larger Node heap by default. If you still see a `killed` process, check your Node version with `node -v`. Node `20.x` LTS is a safe fallback if your local `22.x` install is unstable.

### The app only shows a Supabase setup screen

Make sure:
- `.env` exists
- `VITE_SUPABASE_URL` is set
- `VITE_SUPABASE_ANON_KEY` is set
- you restarted the dev server after adding them

### Sign in works, but no data loads

Check that you ran [supabase/schema.sql](/Users/kgerner/Documents/Personal%20Projects/Flag-Football-Playmaker/supabase/schema.sql) and that your Supabase project has email/password auth enabled.

