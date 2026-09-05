# CP2020 Netrun Terminal 1.6.6

Offline helper for **Cyberpunk 2020** netrunning (Electron + Phaser 3).

Supports:
- Full square-cell World NetMap
- RAW-style combat, Demons, ICE AI
- Seeded RNG, F3 debug overlay, F4 CRT
- Soft fort JSON validation (Cybersmily-compatible)
- Session autosave (localStorage)
- **Two update channels**: GitHub Releases (full app) + offline renderer ZIP patches

---

## Requirements

- **Node.js 18+** (LTS recommended)
- **npm**
- Windows / Linux / macOS

---

## Quick start (development)

```bash
# 1. Install dependencies
npm install

# 2. Run
npm start
```

Optional: open DevTools automatically:

```bash
# Windows (cmd)
set NETRUN_DEV=1 && npm start

# Linux / macOS
NETRUN_DEV=1 npm start
```

---

## Build portable / installer

```bash
npm install

# Windows portable .exe (no installer, no code-sign)
npm run dist:win

# Windows full (portable + NSIS setup)
npm run dist:win:full

# Linux AppImage
npm run dist:linux
```

Artifacts appear in `dist/`.

> Code signing is disabled by default (`CSC_IDENTITY_AUTO_DISCOVERY=false`).  
> For public GitHub auto-updates you should sign Windows builds if possible.

---

## Module map

```
renderer/
  data.js       pure tables (PROGRAM_DB, LDL_DB, NET_REGIONS, SAMPLE_FORT…)
  core.js       S state, seeded RNG, log, runner/deck helpers
  demons.js     Demon loadout / slots
  fort.js       fort validate/normalize, grid, load, HUD turn start
  combat.js     move, programs, damage, ICE AI
  netmap.js     World NetMap + static-layer cache
  netmap-ui.js  LDL list UI, travel, menu actions (copy/read/jackout)
  ui.js         tooltips, clock, rotation, debug F3, CRT F4, session
  scene.js      Phaser NetScene
  game.js       bootstrap / event wiring only
```

Main process: `main.js` · Bridge: `preload.js`

---

## Hotkeys

| Key | Action |
|-----|--------|
| WASD / arrows | Move |
| **R** | Run selected program |
| **T** | End turn |
| **L** | Load fort JSON |
| **F3** | Debug overlay |
| **F4** | CRT toggle |

---

## Updates

### A) Offline renderer patch (no network)

Works on air-gapped machines. Only replaces `renderer/**`.

1. **Author** builds a patch:

   ```bash
   npm run make-update
   # → dist-update/CP2020_Netrun_Update_<ver>.zip
   ```

2. **User** opens the app → **OFFLINE ZIP** → selects the zip.  
   Patch is installed into profile (`userData/CP2020_Netrun/patch`) and the app restarts.

3. Next launch uses the patched renderer if `patch.version ≥ packaged.version`.

Patch layout inside the zip:

```
manifest.json
version.txt
renderer/**
```

Does **not** replace `main.js` / Electron shell. For main-process changes ship a new portable/setup build.

### B) GitHub Releases (full app update)

Uses `electron-updater`. Requires a packaged build and network.

1. In `package.json` → `build.publish` set your real GitHub `owner` / `repo`:

   ```json
   "publish": [{
     "provider": "github",
     "owner": "YOUR_GITHUB_USER",
     "repo": "CP2020_Netrun_Phaser"
   }]
   ```

2. Create a **GitHub Release** and upload the artifacts produced by electron-builder  
   (e.g. `CP2020 Netrun Terminal-1.6.6-portable.exe`, `.yml` / `.blockmap` files, setup.exe).

3. Optional publish from CI / local:

   ```bash
   # requires GH_TOKEN with repo scope
   export GH_TOKEN=ghp_...
   npx electron-builder --win portable --publish always
   ```

4. In the running app press **GH UPDATE**:
   - checks GitHub Releases
   - downloads if newer
   - installs and restarts

Quiet check also runs a few seconds after launch (packaged builds only).

> Portable builds can update, but NSIS/installed builds integrate more cleanly with `quitAndInstall`.

---

## Versioning

Keep these in sync when releasing:

- `package.json` → `"version"`
- `version.txt`

`make-update` and the main process both read `version.txt`.

---

## GitHub workflow (recommended)

1. Push source (never commit `node_modules/`, `dist/`, `*.exe`).
2. Tag release: `git tag v1.6.6 && git push --tags`
3. Build + publish artifacts to the GitHub Release.
4. Optionally also attach the offline `CP2020_Netrun_Update_1.6.6.zip` for air-gapped users.

Example minimal GitHub Actions idea:

```yaml
# .github/workflows/release.yml
on:
  push:
    tags: ['v*']
jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run dist:win:full
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CSC_IDENTITY_AUTO_DISCOVERY: false
      - run: npm run make-update
      - uses: softprops/action-gh-release@v2
        with:
          files: |
            dist/*
            dist-update/*
```

---

## Changelog highlights (1.6.6)

- Fixed corrupted handlers in `tryNetTravel` / `doLdlLink` (accidental re-bind of rotation buttons).
- Seeded RNG used for ICE program-kill pick, watchdog howl, and COPY loot (was `Math.random`).
- Debug overlay no longer crashes when fort defenses lack `.coord`.
- Cleaned duplicate/dead branch in `screenDirToLogical`.
- Added **GitHub Releases** auto-update via `electron-updater` (button **GH UPDATE**).
- Offline ZIP channel renamed to **OFFLINE ZIP** (same behaviour as before).
- README rewritten with full build / update instructions.

See also `AUDIT.md` (RAW alignment) and `DEVELOPERS.md` (structure notes).

---

## Security (Electron)

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- Offline update validates `manifest.id` and optional `minVersion`
- Do not load untrusted HTML into the BrowserWindow

---

## License

MIT
