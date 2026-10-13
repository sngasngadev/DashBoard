# Desktop migration (in progress)

This branch is the new Windows desktop baseline, separate from the existing HTML release.

## Design
- Electron renderer continues to use existing React UI, with a narrow context-isolated IPC bridge.
- SQLite is stored at `DashBoard/data/dashboard.db`; images are BLOBs in the same database.
- Portable directory has `data/` and `backups/` adjacent to the executable.
- The user must close the application before ZIP transfer; WAL sidecars may exist while open.
- Existing browser-local data is not imported. Future desktop schema changes require migrations.
- Notes, search, trash, and binary attachment API are scaffolded; connecting the new note-card UI is a subsequent implementation step.
- Never update the application while running; preserve `data/` and `backups/` folders.

## Local development (requires access to npm registry)
1. Run `npm install` and `npm run build` in repository root.
2. In `desktop/`, run `npm install`, `npx electron-rebuild -f -w better-sqlite3`, and `npm start`.
3. Produce a Windows unpacked directory with `npm run pack:win` in `desktop/` after building the renderer.

IMPORTANT: Packaging scripts and native module compatibility need validation on Windows CI before a release. This is not a distributable release yet.
