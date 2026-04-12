# Flag Football Playmaker

Flag Football Playmaker is a frontend-only web app for designing offensive flag football plays.

It lets you:
- Choose 5, 7, or 8 offensive players
- Drag players around a playboard
- Draw routes and motion paths
- Add handoff markers
- Rename players and change marker colors
- Save multiple plays locally in your browser
- Export a single play to a wristband-sized PDF with exact dimensions

## Tech Stack

- React
- TypeScript
- Tailwind CSS
- Vite
- jsPDF + svg2pdf.js for PDF export

## Getting Started

### Requirements

- Node.js 22+
- npm 10+

### Install

```bash
npm install
```

### Run the app

```bash
npm run dev
```

Then open the local Vite URL shown in your terminal.

### Run tests

```bash
npm test
```

### Build

```bash
npm run build
```

## How to Use

### 1. Create or open a play

Use the left sidebar to manage your play library.

- `New play` creates a new play
- Click a saved play to open it
- `Duplicate` makes a copy of a play
- `Delete` removes a play from this browser

Plays are saved automatically in `localStorage`, so they stay available after refresh on the same browser/profile.

### 2. Choose the offensive player count

In the right panel under `Offensive personnel`, choose:
- `5 players`
- `7 players`
- `8 players`

This resets the formation to a default layout for that player count and clears existing paths/handoffs for that play.

### 3. Move players

Use the `Select` tool in the top toolbar.

- Click a player to select it
- Drag the player to reposition it on the board
- If that player already has a route or motion path, the start of the path stays anchored to the player

### 4. Edit player details

When a player is selected, the right panel lets you change:
- `Player label`
- `Player color`

This is useful for changing labels to things like `Q`, `RB`, `X`, `Y`, `Z`, `C`, `H`, or custom short tags.

### 5. Draw a route

Use the `Route` tool.

1. Click the player who owns the route
2. Click one or more points on the field to build the route
3. Click `Finish path` to save it
4. Click `Cancel` if you want to discard the draft

Notes:
- Routes are drawn as solid lines with an arrow
- Each player supports one saved route/motion path in this version
- Creating a new path for the same player replaces the previous one

### 6. Draw motion

Use the `Motion` tool.

The flow is the same as route drawing:
1. Click the player
2. Click points on the board
3. Click `Finish path`

Motion paths are shown as dashed lines.

### 7. Add a handoff

Use the `Handoff` tool.

1. Click the player giving the ball
2. Click the player receiving the ball

A handoff marker will be added between the two players.

### 8. Edit or remove an existing path

Switch back to `Select`.

- Click a path to select it
- Drag its control points to reshape it
- Use `Delete path` in the right panel to remove it

### 9. Rename the play and add notes

In the right panel under `Play Setup`, you can edit:
- `Play name`
- `Coach notes`

Notes are saved with the play and shown in the play library.

### 10. Set print size and export to PDF

In the `Print & PDF` section on the right:

- Choose a preset wristband size, or
- Enter a custom `Width`, `Height`, and `Unit`

Available units:
- Inches
- Millimeters

Use the live preview card to sanity-check the aspect ratio.

When ready, click `Export PDF`.

The exported PDF is generated from the same SVG used by the editor so the printed layout stays crisp.

## Playboard Notes

The playboard is offense-focused and includes:
- A visible line of scrimmage
- Space behind the line for shotgun alignment or RB motion
- More space in front of the line for deeper routes
- Yard-style guide lines for alignment

## Current Scope

This version is intentionally local and simple.

Included:
- Offensive players only
- Single-play editing
- Local browser persistence
- Single-play PDF export

Not included yet:
- User accounts
- Cloud sync
- Shared playbooks across devices
- Defensive players
- Multi-play printable sheets
- Mobile-first editing

## Project Structure

- `src/App.tsx`: top-level app state and editor coordination
- `src/components/`: UI panels and playboard
- `src/lib/types.ts`: play document types
- `src/lib/playbook.ts`: default formations and print presets
- `src/lib/storage.ts`: browser persistence
- `src/lib/pdf.ts`: PDF export
- `src/test/`: Vitest coverage for storage, geometry, and editor flows

## Troubleshooting

### `npm run dev` or `npm run build` gets killed

This project now starts Vite and TypeScript with a larger Node heap by default. If you were seeing `zsh: killed npm run dev` or `Killed: 9 tsc -b`, pull the latest changes and retry.

If it still happens, check your Node version with `node -v`. Node `20.x` LTS is a safe fallback if your local `22.x` install is unstable.


### My plays disappeared

Plays are stored in browser local storage. They can disappear if:
- You clear site data/local storage
- You switch browsers
- You switch browser profiles
- You use private/incognito mode

### PDF export does nothing

Make sure the browser allows downloads/popups for local files or local dev pages if it prompts.

### I changed from 7 players to 5 players and lost my routes

That is expected in the current version. Changing player count resets the formation and clears existing paths/handoffs for that play.

## Future Ideas

- Save/load play files manually
- Multi-play wristband sheets
- Defensive markers
- Shared cloud playbooks
- Tablet/touch optimization
- Route templates
