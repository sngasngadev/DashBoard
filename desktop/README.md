# DashBoard Desktop (Windows preview)

This branch develops a portable Windows desktop version. The existing main branch and HTML edition remain intact.

## Package and portability

Download the artifact named **DashBoard-Windows-Preview** from the latest successful [Windows Desktop Build](https://github.com/sngasngadev/DashBoard/actions/workflows/windows-desktop-build.yml) run. Extract the WHOLE archive to a writable folder. Launch `DashBoard.exe` inside `DashBoard-win32-x64`. The package includes Electron runtime files; keep them together.

User data belongs to the same folder as DashBoard.exe:
- `data/dashboard.db`: all cards and notes, editor content, and images stored as SQLite BLOBs.
- `backups/dashboard-*.db`: standalone SQLite snapshots, automatically at most daily and manually on demand. Keeps latest ten.
- SQLite may temporarily create `dashboard.db-wal` and `dashboard.db-shm` while running.

**Exit the application fully before copying or compressing its folder**. When upgrading, replace executable/runtime files, but KEEP the `data/` and `backups/` folders. Future desktop releases migrate the SQLite schema; browser IndexedDB data is intentionally not imported.

## User workflows

- Main card visibility is toggled in each card's detail tab. Tab stays visible.
- Settings -> Tab order opens a dedicated popup; Main stays first, other tab titles are manually reordered.
- Settings -> Trash opens a single cross-bundle deleted note list. Select multiple items and restore them to their original bundle, or choose another existing bundle if the original was deleted.
- A memo bundle shows note titles on Main; opening a title selects that document in the bundle detail view. Manual handle sorting, bundle-only search and rich editing are supported.
- Free memo and bundle detail editors support text formatting, clipboard image BLOBs, tables and resized images.
- Settings -> SQLite backup creates a copy. SQLite restore requests a file and confirmation, makes a pre-restore safety backup, then reloads the app.

## Development

1. In repository root, `npm install --legacy-peer-deps && npm run build`.
2. In `desktop/`, `npm install --legacy-peer-deps && npm run rebuild && npm test && npm run prepare:renderer && npm start`.
3. For Windows packaged folder, from `desktop/` run `npm run pack:win`.

Root tests: `npm test`; Chromium end-to-end tests: `npm run test:e2e`. GitHub Actions Windows CI runs native SQLite tests, build and packaging.

**Preview status:** Passing CI demonstrates building and automated checks, not complete real-user testing. Keep regular backups; do not use this as the only copy of critical data until validated.
