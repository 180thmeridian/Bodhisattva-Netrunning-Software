const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Optional: electron-updater (GitHub Releases). Soft-fail if not installed.
let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (_) {
  autoUpdater = null;
}

// Single instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length) {
      if (wins[0].isMinimized()) wins[0].restore();
      wins[0].focus();
    }
  });
}

const DATA_DIR = path.join(app.getPath('userData'), 'CP2020_Netrun');
const DB_FILE = path.join(DATA_DIR, 'session.json');
const PATCH_DIR = path.join(DATA_DIR, 'patch');
const APP_ID = 'cp2020-netrun-terminal';

function ensureDir(p) {
  fs.mkdirSync(p || DATA_DIR, { recursive: true });
}

function readText(file) {
  try { return fs.readFileSync(file, 'utf8').trim(); } catch (_) { return null; }
}

function parseVer(v) {
  if (!v) return [0, 0, 0];
  const m = String(v).trim().match(/(\d+)\.(\d+)\.(\d+)/);
  if (!m) return [0, 0, 0];
  return [ +m[1], +m[2], +m[3] ];
}

function cmpVer(a, b) {
  const A = parseVer(a), B = parseVer(b);
  for (let i = 0; i < 3; i++) {
    if (A[i] > B[i]) return 1;
    if (A[i] < B[i]) return -1;
  }
  return 0;
}

function packagedVersion() {
  return (
    readText(path.join(__dirname, 'version.txt')) ||
    (function () {
      try { return require('./package.json').version; } catch (_) { return '0.0.0'; }
    })()
  );
}

function patchManifest() {
  const mf = path.join(PATCH_DIR, 'manifest.json');
  if (!fs.existsSync(mf)) return null;
  try { return JSON.parse(fs.readFileSync(mf, 'utf8')); } catch (_) { return null; }
}

function activeRendererDir() {
  const mf = patchManifest();
  const pack = packagedVersion();
  if (mf && mf.id === APP_ID && cmpVer(mf.version, pack) >= 0) {
    const r = path.join(PATCH_DIR, 'renderer');
    if (fs.existsSync(path.join(r, 'index.html'))) return r;
  }
  return path.join(__dirname, 'renderer');
}

function versionInfo() {
  const pack = packagedVersion();
  const mf = patchManifest();
  const usingPatch = !!(mf && mf.id === APP_ID && cmpVer(mf.version, pack) >= 0 &&
    fs.existsSync(path.join(PATCH_DIR, 'renderer', 'index.html')));
  return {
    packaged: pack,
    patch: mf ? mf.version : null,
    active: usingPatch ? mf.version : pack,
    usingPatch,
    patchDir: PATCH_DIR,
    githubUpdater: !!autoUpdater
  };
}

function seed() {
  return { version: 2, lastFort: null, history: [] };
}

function load() {
  ensureDir();
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(seed(), null, 2));
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return seed();
  }
}

function save(db) {
  ensureDir();
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
  return true;
}

function rmDeep(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) rmDeep(p);
    else fs.unlinkSync(p);
  }
  fs.rmdirSync(dir);
}

function extractZip(zipPath, destDir) {
  ensureDir(destDir);
  if (process.platform === 'win32') {
    const ps = `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`;
    const r = spawnSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
    if (r.status !== 0) {
      throw new Error((r.stderr || r.stdout || 'Expand-Archive failed').toString().slice(0, 400));
    }
    return;
  }
  const r = spawnSync('unzip', ['-o', zipPath, '-d', destDir], { encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || 'unzip failed').toString().slice(0, 400));
  }
}

function findManifest(root) {
  const direct = path.join(root, 'manifest.json');
  if (fs.existsSync(direct)) return direct;
  // zip may contain a single top folder
  const entries = fs.readdirSync(root);
  for (const e of entries) {
    const p = path.join(root, e, 'manifest.json');
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function applyUpdateZip(zipPath) {
  const tmp = path.join(DATA_DIR, '_update_tmp_' + Date.now());
  ensureDir(tmp);
  try {
    extractZip(zipPath, tmp);
    const mfPath = findManifest(tmp);
    if (!mfPath) throw new Error('manifest.json not found in update package');
    const mf = JSON.parse(fs.readFileSync(mfPath, 'utf8'));
    if (mf.id !== APP_ID) throw new Error('Wrong package id: ' + (mf.id || '?'));
    if (!mf.version) throw new Error('manifest.version missing');
    const pack = packagedVersion();
    if (mf.minVersion && cmpVer(pack, mf.minVersion) < 0) {
      throw new Error(`This patch needs app ≥ ${mf.minVersion} (you have ${pack})`);
    }
    const bundleRoot = path.dirname(mfPath);
    const rendererSrc = path.join(bundleRoot, 'renderer');
    if (!fs.existsSync(path.join(rendererSrc, 'index.html'))) {
      throw new Error('renderer/index.html missing in update package');
    }
    // install
    if (fs.existsSync(PATCH_DIR)) rmDeep(PATCH_DIR);
    ensureDir(PATCH_DIR);
    // copy manifest + renderer (+ version.txt if any)
    fs.copyFileSync(mfPath, path.join(PATCH_DIR, 'manifest.json'));
    copyDir(rendererSrc, path.join(PATCH_DIR, 'renderer'));
    const vt = path.join(bundleRoot, 'version.txt');
    if (fs.existsSync(vt)) fs.copyFileSync(vt, path.join(PATCH_DIR, 'version.txt'));
    return { ok: true, version: mf.version, previous: pack };
  } finally {
    try { rmDeep(tmp); } catch (_) {}
  }
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

/* ========== GitHub Releases auto-update (electron-updater) ========== */
let lastGithubStatus = { status: 'idle', message: null };

function setupAutoUpdater() {
  if (!autoUpdater || !app.isPackaged) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  // Uses publish.provider from package.json (github)

  autoUpdater.on('checking-for-update', () => {
    lastGithubStatus = { status: 'checking', message: 'Checking GitHub Releases…' };
  });
  autoUpdater.on('update-available', (info) => {
    lastGithubStatus = {
      status: 'available',
      message: `Update ${info.version} available`,
      version: info.version,
      releaseNotes: info.releaseNotes || null
    };
  });
  autoUpdater.on('update-not-available', () => {
    lastGithubStatus = { status: 'uptodate', message: 'Already up to date' };
  });
  autoUpdater.on('download-progress', (p) => {
    lastGithubStatus = {
      status: 'downloading',
      message: `Downloading ${Math.round(p.percent)}%`,
      percent: p.percent
    };
  });
  autoUpdater.on('update-downloaded', (info) => {
    lastGithubStatus = {
      status: 'downloaded',
      message: `v${info.version} ready — restart to install`,
      version: info.version
    };
  });
  autoUpdater.on('error', (err) => {
    lastGithubStatus = {
      status: 'error',
      message: (err && err.message) ? err.message.slice(0, 200) : String(err)
    };
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#050805',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.once('ready-to-show', () => win.show());
  if (!app.isPackaged && process.env.NETRUN_DEV === '1') {
    win.webContents.openDevTools({ mode: 'detach' });
  }
  const renderer = activeRendererDir();
  await win.loadFile(path.join(renderer, 'index.html'));
}

ipcMain.handle('db:load', () => load());
ipcMain.handle('db:save', (_e, db) => save(db));
ipcMain.handle('db:path', () => DATA_DIR);

ipcMain.handle('app:version', () => versionInfo());

ipcMain.handle('update:apply', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Install offline update package',
    filters: [
      { name: 'Netrun Update', extensions: ['zip'] },
      { name: 'All', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths.length) return { ok: false, canceled: true };
  try {
    const info = await applyUpdateZip(result.filePaths[0]);
    return info;
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
});

ipcMain.handle('update:clear', () => {
  try {
    if (fs.existsSync(PATCH_DIR)) rmDeep(PATCH_DIR);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('app:relaunch', () => {
  app.relaunch();
  app.exit(0);
});

// --- GitHub update IPC ---
ipcMain.handle('github:status', () => lastGithubStatus);

ipcMain.handle('github:check', async () => {
  if (!autoUpdater) {
    return { ok: false, error: 'electron-updater not available (dev mode or not installed)' };
  }
  if (!app.isPackaged) {
    return { ok: false, error: 'GitHub updates only work in packaged builds' };
  }
  try {
    lastGithubStatus = { status: 'checking', message: 'Checking GitHub Releases…' };
    const result = await autoUpdater.checkForUpdates();
    return { ok: true, updateInfo: result && result.updateInfo ? {
      version: result.updateInfo.version,
      releaseDate: result.updateInfo.releaseDate
    } : null, status: lastGithubStatus };
  } catch (e) {
    lastGithubStatus = { status: 'error', message: e.message || String(e) };
    return { ok: false, error: e.message || String(e), status: lastGithubStatus };
  }
});

ipcMain.handle('github:download', async () => {
  if (!autoUpdater || !app.isPackaged) {
    return { ok: false, error: 'Updater unavailable' };
  }
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true, status: lastGithubStatus };
  } catch (e) {
    return { ok: false, error: e.message || String(e), status: lastGithubStatus };
  }
});

ipcMain.handle('github:install', () => {
  if (!autoUpdater) return { ok: false, error: 'Updater unavailable' };
  // Quits and installs
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
  return { ok: true };
});

ipcMain.handle('file:openJson', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Load Cybersmily Datafort JSON',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths.length) return null;
  try {
    const raw = fs.readFileSync(result.filePaths[0], 'utf8');
    return { path: result.filePaths[0], data: JSON.parse(raw) };
  } catch (e) {
    dialog.showErrorBox('Load failed', e.message);
    return null;
  }
});

app.whenReady().then(() => {
  setupAutoUpdater();
  createWindow();
  // Optional quiet check a few seconds after launch (packaged only)
  if (autoUpdater && app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 4000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

process.on('uncaughtException', (err) => {
  console.error('[main] uncaught', err);
});
