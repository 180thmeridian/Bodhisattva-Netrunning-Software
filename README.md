# CP2020 Netrun Terminal 1.6.47

Offline helper for **Cyberpunk 2020** netrunning (Electron + Phaser 3).

Supports:
- Full square-cell World NetMap
- RAW-style combat, Demons, ICE AI
- QTE typing sequences vs Black ICE and LotF flies
- Seeded RNG, F3 debug overlay, F4 CRT
- Soft fort JSON validation (Cybersmily-compatible)
- Session autosave (localStorage)
- Profile / programs / city grids / terminals
- **Two update channels**: GitHub Releases (full app, auto-check) + offline renderer ZIP patches

---

## Requirements

- **Node.js 18+** (LTS recommended)
- **npm**
- Windows (for the Setup build)

---

## Windows build (NSIS Setup)

| File | Purpose |
|------|---------|
| `0_CHECK.bat` | Environment check (Node 18+, npm, project files) |
| `1_INSTALL.bat` | `npm install` |
| `2_BUILD.bat` | **NSIS Setup.exe** (unsigned) |
| `run-dev.bat` | Dev mode without packaging |

Run in order: **0_CHECK** → **1_INSTALL** → **2_BUILD**.

Output:

```
dist\CP2020-Netrun-Terminal-1.6.47-Setup.exe
```

Also produced (needed for auto-update): `latest.yml`, `*.exe.blockmap`.

Code signing is **disabled** (`CSC_IDENTITY_AUTO_DISCOVERY=false`, `forceCodeSigning: false`, `signAndEditExecutable: false`, `verifyUpdateCodeSignature: false`).

---

## Quick start (development)

```bash
npm install
npm start
```

Or double-click **`run-dev.bat`**.

Optional DevTools:

```bash
set NETRUN_DEV=1 && npm start
```

---

## Build / update commands

```bash
npm install
npm run dist:win            # NSIS Setup.exe + latest.yml (local dist/)
npm run dist:win:publish    # same + publish to GitHub Releases (needs GH_TOKEN)
npm run make-update         # offline renderer ZIP → dist-update/
```

---

## Auto-update (GitHub Releases) — Setup installs

Packaged Setup builds check GitHub Releases ~4s after launch (`electron-updater`).

**In-app:**
1. Quiet check on startup (no UI spam if up to date).
2. **UPDATE** button:
   - If a newer full release exists → download → install (restart).
   - If already up to date / check fails → offline ZIP dialog (renderer patch).

**Publishing a release (required for auto-update to work):**

1. Bump `version` in `package.json` and `version.txt`.
2. Build: `npm run dist:win`
3. Create a GitHub Release tagged `vX.Y.Z` (must match version).
4. Upload **all** of:
   - `CP2020-Netrun-Terminal-X.Y.Z-Setup.exe`
   - `latest.yml`
   - `CP2020-Netrun-Terminal-X.Y.Z-Setup.exe.blockmap` (if present)

Or set `GH_TOKEN` / `GITHUB_TOKEN` and run `npm run dist:win:publish`.

Without `latest.yml` in the release assets, clients cannot detect the update.

---

## Offline updates (renderer ZIP)

```bash
npm run make-update
# → dist-update/CP2020_Netrun_Update_<ver>.zip
```

In-app **UPDATE** → if no GitHub full update, select zip → patch under `userData/CP2020_Netrun/patch`.  
If `patch.version >= packaged.version`, patched renderer is used. Does not replace `main.js` / Electron shell.

---

## Project layout

```
├── main.js / preload.js / package.json / version.txt
├── data/
├── renderer/            # Phaser UI + game (see DEVELOPERS.md)
├── tools/make-update.*
├── 0_CHECK.bat / 1_INSTALL.bat / 2_BUILD.bat
├── run-dev.bat
└── README.md
```

---
## License

MIT
