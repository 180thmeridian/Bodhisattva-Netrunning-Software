# CP2020 Netrun Terminal — File & Dependency Map

Version: **1.6.42**  
Runtime: Electron shell + Chromium renderer (Phaser 3 for isometric fort map)

## Load order (`renderer/index.html`)

```
phaser.min.js
programs.js      → PROGRAM_DB (library, including internal LotF)
profile.js       → profiles, boot UI, BTM, flatline sequence
saves.js         → multi-slot save/load/export (uses S, profiles)
data.js          → SAMPLE_FORT, LDL nodes, net geography
citygrids.js     → city grid overlays
core.js          → global S, RNG, log, nr/deck, renderPrograms
demons.js        → Demon shells, path plan, agents, BFS, Self-Mod helpers
lordflies.js     → Lord of the Flies (gated; needs fort.lotf / debugLotf)
fort.js          → fort normalize, grid, turns, HUD, fog LOS
combat.js        → move, programs, ICE AI, damage, stun/death
netmap.js        → LDL graph data helpers
netmap-ui.js     → NetMap UI, jackout, endTurn
ui.js            → deck UI, commands, tips, CRT, dossier photo
scene.js         → Phaser NetScene (tiles, plan draw, LotF icons)
game.js          → bootstrap, keys, buttons, Phaser boot, autosave interval
```

Scripts later in the list may call `window.*` APIs exported by earlier scripts.

## Core global state (`core.js` → `window.S`)

| Field | Role |
|--------|------|
| `fort`, `grid` | Loaded datafort + cell matrix |
| `runner` | Position in fort |
| `turn`, `moveLeft`, `actionLeft` | Net turn economy |
| `programs`, `selectedProg` | Deck |
| `wallStr`, `openGates`, `deadIce`, `iceStr` | Fort mutation |
| `alarm`, `wounds`, `intDmg`, `buffs` | Threat / health |
| `activeDemons`, `demonPlan` | Autonomous demon agents |
| `explored` | Fog of war (LOS) |
| `lotf` | Lord of the Flies runtime (optional) |
| `netLoc`, `netTime`, `pathTrace` | Wide Net map |
| `profile`, `btm`, `flatlined` | Runner identity |

## Module responsibilities

### `programs.js`
Static `PROGRAM_DB`. Entries with `_internal` / `_unobtainable` (e.g. Lord of the Flies) are filtered out of the player library UI.

### `profile.js`
- localStorage keys: profile list + active id  
- Boot / auth screen, dossier lock  
- Flatline → seal account  

### `saves.js` (1.6.42+)
- **Slots 1–5**: `cp2020_netrun_save_{n}`  
- **Autosave**: `cp2020_netrun_session` every 15s (`game.js`)  
- Commands: `save [n]`, `load [n]`, `saves`  
- Buttons: SAVE / LOAD SAVE  
- Snapshot includes fort, deck programs, demons, fog, LotF, net position  

### `demons.js`
- Shell loading (slots), STR = base − loaded count  
- Plan: purple path, `demon use <sub>`, `demon attack`, `demon go`  
- Agents keyed by `_uid` / name (stable across deck reorder)  
- `pathfindBFS`, Trace, Self-Modifying helpers  

### `lordflies.js`
Does **not** spawn on sample forts by default. Requires `fort.lotf`, `fort.ai.lotf`, or `S.debugLotf`.  
Definition lives in `PROGRAM_DB` as internal.

### `fort.js`
Validate/normalize DF Designer JSON, `buildGrid`, `startTurn` / `updateHUD`, LOS fog (`revealAround`).

### `combat.js`
Movement, detection, `runSelectedProgram`, ICE `systemPhase`, damage / stun / death, `bumpAlarm`.

### `scene.js`
Phaser isometric render, fog tiles, demon plan (purple), active agents, LotF icons/flies.

### Assets
| Path | Use |
|------|-----|
| `nm/*.png` | Neural damage map lobes |
| `assets/fly.png` | UI infestation flies |
| `terminals/*.html` | External terminal pages |

## Dependency sketch

```
game.js
  ├─ profile.js (boot)
  ├─ saves.js (loadSession / interval saveSession)
  ├─ data.js (SAMPLE_FORT)
  ├─ fort.js ← combat.js ← demons.js
  │              └─ lordflies.js (optional tick)
  ├─ netmap-ui.js ← netmap.js
  ├─ ui.js (commands, deck)
  └─ scene.js (Phaser) ← fort grid + S.*
```

## External / Electron
- `window.netrunAPI` (optional): `openJsonFile`, `quitApp`, updates  
- Without Electron, file pickers fall back to `<input type=file>`  

## Update packages
Offline zip patches ship `manifest.json`, `version.txt`, and a full `renderer/` tree. Higher version replaces files on apply.

## Known intentional gates
- LotF not on Bastion/sample unless flagged  
- Internal programs hidden from library select  
- Degradation / session stat drain does not rewrite profile localStorage  
