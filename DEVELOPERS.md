# Заметки для разработчиков — CP2020 Netrun Terminal 1.6.6

## Структура (чистая)

```
CP2020_Netrun_Phaser/
├── main.js              # Electron main process (window, IPC, offline update, session)
├── preload.js           # contextBridge → window.netrunAPI
├── package.json         # scripts + electron-builder config
├── package-lock.json
├── version.txt          # единый источник версии (читается main + make-update)
├── data/
│   └── sample_arasaka.json
├── renderer/
│   ├── index.html       # UI shell + CRT overlays
│   ├── phaser.min.js    # Phaser 3 (vendor, не трогать без нужды)
│   ├── data.js          # PROGRAM_DB, LDL_DB, NET_REGIONS, SAMPLE_FORT
│   ├── core.js          # S (state), seeded RNG, log, nr/deck helpers
│   ├── demons.js        # Demon slots / load / unload
│   ├── fort.js          # validate/normalize fort, grid, loadFort, HUD turn
│   ├── combat.js        # tryMove, programs, damage, ICE AI
│   ├── netmap.js        # World NetMap + static layer cache
│   ├── netmap-ui.js     # LDL list, travel, menu actions
│   ├── ui.js            # tooltips, clock, rotation, F3/F4, session
│   ├── scene.js         # Phaser NetScene (iso diamonds)
│   └── game.js          # bootstrap + event wiring only
└── tools/
    ├── make-update.cjs  # сборка offline-патча (рекомендуется)
    └── make-update.mjs  # ESM-вариант
```

## Что было вычищено из исходного репозитория

- `node_modules/` (должен ставиться через `npm install`)
- `dist/` и весь `win-unpacked/` (скомпилированные portable/обычные exe, asar, dll, locales)
- Любые `.exe`, `.asar`, electron-артефакты

**Важно:** в оригинальном репозитории эти артефакты были закоммичены. Это сильно раздувает историю и клон.  
Всегда используйте `.gitignore` (добавлен в чистый архив).

## Сборка и запуск

```bash
# Разработка
npm install
npm start

# Portable Windows (без подписи)
npm run dist:win

# Полный win-пакет
npm run dist:win:full

# Offline-патч (только renderer)
npm run make-update
# → dist-update/CP2020_Netrun_Update_<ver>.zip
```

Требования: Node.js 18+ (рекомендуется LTS), npm.

## Обновления

### Offline (renderer ZIP)

1. Автор: `npm run make-update` → zip с `manifest.json` + `version.txt` + `renderer/**`
2. Пользователь: кнопка **OFFLINE ZIP** → выбирает zip → патч в `userData/CP2020_Netrun/patch`
3. При запуске, если `patch.version >= packaged.version`, грузится патченый renderer.

Патч **не** заменяет `main.js` / Electron shell.

### GitHub Releases (полный апдейт)

- Зависимость: `electron-updater`
- В `package.json` → `build.publish` укажите `owner` / `repo`
- Кнопка **GH UPDATE** в UI; quiet-check при старте packaged-сборки
- Подробности — в README.md

## Известные упрощения / house-rules (см. AUDIT.md)

- Нет полного City Grid слоя (LDL → subgrid напрямую)
- ICE AI pathfinding упрощён
- Interface skill не применяется ко всем Menu-утилитам
- Нет полной инициативы каждый exchange
- Alarm абстрактный (не полные Detection-роллы)
- Нет euro long-distance billing

## Рекомендации по развитию

1. **Не коммитьте** `node_modules` и `dist`.  
2. Версию меняйте одновременно в `package.json` и `version.txt`.  
3. Phaser держите в `renderer/phaser.min.js` (или перейдите на npm + bundler, если появится сборка).  
4. Глобальный объект `S` и `window.*` экспорты — осознанный выбор для простоты offline-модулей без bundler. При росте кодовой базы имеет смысл перейти на ES-modules + import maps или лёгкий bundler.  
5. `package-lock.json` лучше оставить (детерминированные зависимости).  
6. Для CI: `npm ci && npm run dist:win` (с `CSC_IDENTITY_AUTO_DISCOVERY=false`).

## Безопасность Electron

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` — уже выставлено.
- Не открывайте произвольные HTML извне без валидации.
- Offline-update проверяет `manifest.id` и `minVersion`.

## Быстрый чек-лист перед релизом

- [ ] `version.txt` и `package.json` совпадают
- [ ] `.gitignore` на месте, `node_modules`/`dist` отсутствуют
- [ ] `npm start` работает
- [ ] `npm run dist:win` даёт portable
- [ ] `npm run make-update` создаёт валидный zip
- [ ] AUDIT.md актуален относительно RAW/house-rules
