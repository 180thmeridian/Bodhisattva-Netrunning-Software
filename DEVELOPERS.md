# Заметки для разработчиков — CP2020 Netrun Terminal 1.6.45

## Структура (чистая, готова к GitHub)

```
├── main.js              # Electron main (window, IPC, offline update, session)
├── preload.js           # contextBridge → window.netrunAPI
├── package.json         # electron-builder: NSIS only, no code sign
├── package-lock.json
├── version.txt          # единый источник версии
├── data/
│   └── sample_arasaka.json
├── renderer/
│   ├── index.html, phaser.min.js
│   ├── data.js, citygrids.js, core.js
│   ├── demons.js, lordflies.js, fort.js, combat.js
│   ├── programs.js, profile.js, qte.js, saves.js
│   ├── netmap.js, netmap-ui.js, ui.js, scene.js, game.js
│   ├── assets/, nm/, terminals/
│   ├── ARCHITECTURE.md, TECH_STACK.md
├── tools/
│   ├── make-update.cjs
│   └── make-update.mjs
├── 0_CHECK.bat          # проверка окружения
├── 1_INSTALL.bat        # npm install
├── 2_BUILD.bat          # NSIS Setup.exe (без подписи)
└── run-dev.bat          # dev без упаковки
```

## Что вычищено

- `node_modules/`, `dist/`, `dist-update/`, любые `.exe` / `.asar`
- Portable-таргеты и непронумерованный `build.bat`
- Подпись кода отключена

## Сборка

```text
0_CHECK.bat  →  1_INSTALL.bat  →  2_BUILD.bat
# → dist/CP2020-Netrun-Terminal-<ver>-Setup.exe
```

Или вручную:

```bash
npm install
npm run dist:win
```

Подпись: `CSC_IDENTITY_AUTO_DISCOVERY=false`, `forceCodeSigning: false`, `signAndEditExecutable: false`.

## Обновления

Offline ZIP патчит только `renderer/`. Полный апдейт — через GitHub Releases + `electron-updater` (настроить `build.publish`).

## Чек-лист перед push

- [ ] `version.txt` == `package.json` version
- [ ] нет `node_modules` / `dist` / `*.exe`
- [ ] `npm start` и цепочка bat работают
- [ ] `.gitignore` на месте
