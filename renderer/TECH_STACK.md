# CP2020 Netrun Terminal — стек, API и инструменты

Документ описывает, **на чём и как** собрана программа: рантайм, зависимости, IPC API, модули renderer, хранение данных, пайплайн обновлений и внешние форматы.

Актуальная линейка патчей renderer: **1.6.44** (базовый пакет Electron в репозитории может быть 1.6.5; патч подменяет только `renderer/`).

---

## 1. Высокоуровневая архитектура

```
┌─────────────────────────────────────────────────────────┐
│  Electron Main Process (main.js, Node.js)               │
│  · окно BrowserWindow                                   │
│  · IPC handlers (файлы, БД, обновления)                 │
│  · выбор active renderer (packaged vs patch)            │
└──────────────────────┬──────────────────────────────────┘
                       │ contextBridge (preload.js)
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Renderer (Chromium)                                    │
│  · index.html + vanilla JS модули                       │
│  · Phaser 3 — изометрическая карта крепости             │
│  · DOM/CSS — UI, логи, сейвы, CRT, рой мух              │
│  · localStorage — профили, слоты сохранений             │
└─────────────────────────────────────────────────────────┘
```

Приложение **офлайн-first**: нет обязательного сетевого бэкенда. Крепости грузятся из JSON (в т.ч. экспорт [DF Designer / cybersmily](https://cybersmily.net/apps/dfdesigner)).

---

## 2. Стек технологий

| Слой | Технология | Назначение |
|------|------------|------------|
| Shell | **Electron ^38** | Desktop-обёртка, файловая система, portable-сборка |
| UI process | **Chromium** (встроен в Electron) | HTML/CSS/JS интерфейс |
| Bridge | **preload + contextIsolation** | Безопасный API `window.netrunAPI` без `nodeIntegration` |
| Игровая карта | **Phaser 3** (`phaser.min.js`, бандл в renderer) | Изометрия, камера, ввод, графика тайлов |
| Язык | **JavaScript (ES2015+)** без сборщика | Прямые `<script>` в порядке зависимостей |
| Стили | **CSS** в `index.html` | Киберпанк-тема, CRT, меню сейвов, LotF |
| Хранение UI | **localStorage** | Профили нетраннеров, 5 слотов сейвов, autosave |
| Хранение main | **JSON-файл в userData** | Лёгкая «БД» истории (через IPC) |
| Сборка | **electron-builder ^25** | Portable Windows EXE, Linux AppImage, macOS DMG |
| Патчи | **ZIP + manifest.json** | Офлайн-обновление только renderer |
| Данные правил | JSON-крепости, таблицы программ | Cyberpunk 2020 RAW net combat |

**Не используются:** React/Vue/Angular, TypeScript, Webpack/Vite (в runtime), серверная БД, онлайн-авторизация.

---

## 3. Electron: main process

Файл: `main.js`.

### 3.1. Возможности

- Создание `BrowserWindow` (≈1400×900, тёмный фон `#050805`).
- `webPreferences`: `preload`, **`contextIsolation: true`**, **`nodeIntegration: false`**, **`sandbox: true`**.
- Выбор каталога renderer:
  - штатный: `__dirname/renderer`;
  - если в `userData/patch` лежит `manifest.json` с `id === cp2020-netrun-terminal` и версией ≥ packaged — берётся **патченый** `patch/renderer`.
- IPC: загрузка/сохранение JSON-БД, диалог открытия JSON, применение ZIP-обновления, версия, relaunch.
- Распаковка ZIP: Windows — PowerShell `Expand-Archive`, иначе — `unzip`.

### 3.2. Пути данных

Типично под `app.getPath('userData')`:

| Путь | Содержимое |
|------|------------|
| `…/data/` или аналог | `database.json` (история/мета) |
| `…/patch/` | Установленный offline-update (`manifest.json` + `renderer/`) |

Точные константы задаются в `main.js` (`DATA_DIR`, `PATCH_DIR`, `DB_FILE`, `APP_ID`).

---

## 4. Preload API — `window.netrunAPI`

Файл: `preload.js` (только `contextBridge` + `ipcRenderer.invoke`).

| Метод | IPC channel | Описание |
|--------|-------------|----------|
| `loadDatabase()` | `db:load` | Прочитать JSON-БД из userData |
| `saveDatabase(db)` | `db:save` | Атомарная запись БД (tmp + rename) |
| `getDataPath()` | `db:path` | Путь к каталогу данных |
| `openJsonFile()` | `file:openJson` | Native dialog → `{ data }` с распарсенной крепостью |
| `getVersion()` | `app:version` | Packaged / patch / active version |
| `applyUpdate()` | `update:apply` | Диалог выбора ZIP, установка в `patch/` |
| `clearUpdate()` | `update:clear` | Сброс патча |
| `relaunch()` | `app:relaunch` | Перезапуск приложения |
| `quitApp()` | (если проброшен) | Выход |

Renderer **всегда** проверяет наличие API и даёт fallback (например `<input type="file">` вместо `openJsonFile`), чтобы UI можно было открыть и в обычном браузере для отладки.

---

## 5. Renderer: порядок скриптов

Задаётся в `renderer/index.html`:

```
phaser.min.js
programs.js      — PROGRAM_DB (библиотека программ, в т.ч. internal LotF)
profile.js       — профили, boot/auth, BTM, FLATLINE
core.js          — глобальный S, RNG, log, nr/deck, renderPrograms
saves.js         — слоты сохранений, modal UI, autosave
data.js          — SAMPLE_FORT, LDL, регионы Сети
citygrids.js     — городские сетки
demons.js        — оболочки Демонов, план маршрута, BFS, Self-Mod
lordflies.js     — Lord of the Flies (опциональный контент)
fort.js          — нормализация крепости, grid, ходы, LOS-туман
combat.js        — движение, RUN, ICE AI, урон, stun/death
netmap.js        — данные NetMap
netmap-ui.js     — UI NetMap, jackout, endTurn
ui.js            — команды, tooltips, CRT, dossier photo
scene.js         — Phaser NetScene
game.js          — bootstrap, клавиши, кнопки, интервал autosave
```

Глобальное состояние: **`window.S`** (`core.js`). Модули общаются через `window.*` экспорты функций (без ES-modules bundler).

---

## 6. Phaser 3 (карта крепости)

- Класс сцены: `NetScene` в `scene.js`.
- Изометрия: `TILE_W=56`, `TILE_H=28`, координаты `iso(x,y)`.
- Отрисовка: `Graphics` — ромбы (тайлы), пирамиды (ICE), кастомные иконки LotF/мух, маршрут демона (фиолетовый).
- Ввод: ЛКМ — waypoint плана демона; ПКМ/СКМ — pan; wheel — zoom.
- Камера центрируется на runner; fog of war — непрорисовка неразведанных тайлов.

Phaser **не** управляет боковыми панелями DOM — только `#phaser-host` / map layer.

---

## 7. Игровая логика (правила CP2020)

Ориентир: **Cyberpunk 2020** RAW net combat + материалы Rache Bartmoss (Guide to the Net, Brainware Blowout).

| Подсистема | Где | Суть |
|------------|-----|------|
| Ход | `fort.js` | 5 MOVE + 1 Menu action |
| Бой программ | `combat.js` / `core.js` | STR + INT + Interface + 1d10 |
| ICE AI | `systemPhase` | Сближение, Trace/BFS, атаки |
| Демоны | `demons.js` | Слоты сабпрограмм, STR = base − count, автоагенты |
| Туман | `fort.js` | LOS (Bresenham), блокируют wall/closed gate |
| Раны / stun / death | `combat.js`, neural map UI | BTM, спас-броски, FLATLINE |
| Сохранения | `saves.js` | 5 слотов + autosave v6 |
| LotF | `lordflies.js` | Только при `fort.lotf` / debug, не на sample по умолчанию |

RNG: **mulberry32** с seed (`core.js`) — воспроизводимые броски в сессии.

---

## 8. Хранение на стороне renderer

| Ключ localStorage | Назначение |
|-------------------|------------|
| Профили (константы в `profile.js`) | Список нетраннеров, active id |
| `cp2020_netrun_save_1` … `_5` | Ручные слоты |
| `cp2020_netrun_session` | Autosave (~15 с) |

Снапшот сейва включает: fort, runner, programs, demons, fog (`explored`), alarm/wounds, netLoc/time, profileId, опционально LotF.

UI: модальное меню `#save-menu` (SAVE/LOAD, import JSON, export). Fallback — скачивание файла, если localStorage недоступен.

---

## 9. Форматы данных

### 9.1. Крепость (DF Designer / cybersmily JSON)

Нормализация в `fort.js` → `normalizeFort`:

- `rows`, `columns`, `cpu`, `int`, `datawallStr`
- `datawallNodes`, `codegates`, `cpuNodes`, `muNodes`, `remotes`, `defenses`
- ICE: `program.strength` / `_str`, `options[]`, class

### 9.2. Offline update ZIP

```
manifest.json   { id, version, minVersion, notes, created }
version.txt
renderer/       полная копия UI-дерева
```

Сборка патча: `npm run make-update` → `tools/make-update.cjs` (или `.mjs`).

Установка: кнопка **UPDATE** → `netrunAPI.applyUpdate()` → extract → copy в `userData/patch` → `relaunch()`.

**Важно:** патч не заменяет `main.js` / Electron binary. Изменения main process требуют новой portable-сборки.

### 9.3. Внутренние ассеты renderer

| Путь | Роль |
|------|------|
| `nm/*.png` | Карта нейро-урона (доли мозга) |
| `assets/fly.png` | UI-спрайт мух LotF |
| `terminals/*.html` | Вложенные «терминалы» |
| `ARCHITECTURE.md` | Карта модулей (краткая) |

---

## 10. Инструменты разработки и сборки

| Инструмент | Зачем |
|------------|--------|
| **Node.js / npm** | Зависимости, скрипты |
| **Electron** | `npm start` — локальный запуск |
| **electron-builder** | `dist`, `dist:win` (portable), `dist:linux` |
| **cross-env** | Отключение auto code signing на Windows |
| **make-update.cjs/.mjs** | Упаковка ZIP-патча renderer |
| **PowerShell Expand-Archive / unzip** | Распаковка патча в main process |

Разработка велась итеративными **offline patch zip** (1.6.19…1.6.44), без обязательного git-deploy на машине игрока.

---

## 11. Безопасность модели

- Renderer **без** прямого Node API.
- Все привилегированные операции — через явный `netrunAPI`.
- `sandbox: true` + `contextIsolation`.
- ZIP-патч проверяет `manifest.id` и опционально `minVersion`.

Это не античит и не secure enclave: цель — удобный офлайн-инструмент мастера/игрока CP2020, а не MMO.

---

## 12. Зависимости npm (package.json)

**runtime (фактически):** Electron runtime + статический Phaser в `renderer/`.

**devDependencies:**

- `electron` ^38  
- `electron-builder` ^25.1.8  
- `cross-env` ^7.0.3  

Отдельного `phaser` в package.json может не быть — используется вендоренный `renderer/phaser.min.js`.

---

## 13. Горячие клавиши (типичные)

| Клавиша | Действие |
|---------|----------|
| WASD / стрелки | Движение |
| R | RUN program |
| T | End turn |
| L | Load JSON |
| F3 | Debug overlay |
| F5 | Меню SAVE |
| F9 | Меню LOAD |
| (F4 в старых доках) | CRT — в части сборок зафиксирован ON |

---

## 14. Связанные документы

- `renderer/ARCHITECTURE.md` — карта файлов и load order  
- `README.md` (базовый пакет) — запуск, portable, offline updates  
- Rulebooks (вне репо): Cyberpunk 2020 core, Rache Bartmoss’ Guide to the Net, Brainware Blowout  

---

## 15. Краткая схема вызова

```
User → DOM / Phaser input
  → combat.tryMove / runSelectedProgram / demons.confirmDemonPlan
  → fort.startTurn → systemPhase + lotfTick
  → scene.rebuildMap (Phaser)
  → saves.saveSession (localStorage)
  → netrunAPI.* (только файлы / update / quit)
```

---

*Документ сгенерирован по состоянию кодовой базы Netrun Terminal (Electron shell + Phaser renderer + patch pipeline).*
