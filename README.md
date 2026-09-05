# CP2020 Netrun Terminal 1.6.45

Offline helper for **Cyberpunk 2020** netrunning (Electron + Phaser 3).

Supports:
- Full square-cell World NetMap
- RAW-style combat, Demons, ICE AI
- QTE typing sequences vs Black ICE and LotF flies
- Seeded RNG, F3 debug overlay, F4 CRT
- Soft fort JSON validation (Cybersmily-compatible)
- Session autosave (localStorage)
- Profile / programs / city grids / terminals
- **Two update channels**: GitHub Releases (full app) + offline renderer ZIP patches

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
dist\CP2020-Netrun-Terminal-1.6.45-Setup.exe
```

Code signing is **disabled** (`CSC_IDENTITY_AUTO_DISCOVERY=false`, `forceCodeSigning: false`, `signAndEditExecutable: false`).

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
npm run dist:win          # NSIS Setup.exe
npm run make-update       # offline renderer ZIP → dist-update/
```

---

## Offline updates (renderer ZIP)

```bash
npm run make-update
# → dist-update/CP2020_Netrun_Update_<ver>.zip
```

In-app **OFFLINE ZIP** → select zip → patch under `userData/CP2020_Netrun/patch`.  
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
