const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('netrunAPI', {
  loadDatabase: () => ipcRenderer.invoke('db:load'),
  saveDatabase: (db) => ipcRenderer.invoke('db:save', db),
  getDataPath: () => ipcRenderer.invoke('db:path'),
  openJsonFile: () => ipcRenderer.invoke('file:openJson'),
  getVersion: () => ipcRenderer.invoke('app:version'),
  setWindowMode: (options) => ipcRenderer.invoke('window:setMode', options || {}),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggleMaximize'),
  quitApp: () => ipcRenderer.invoke('app:quit'),
  applyUpdate: () => ipcRenderer.invoke('update:apply'),
  clearUpdate: () => ipcRenderer.invoke('update:clear'),
  relaunch: () => ipcRenderer.invoke('app:relaunch'),
  // GitHub Releases (electron-updater)
  githubStatus: () => ipcRenderer.invoke('github:status'),
  githubCheck: () => ipcRenderer.invoke('github:check'),
  githubDownload: () => ipcRenderer.invoke('github:download'),
  githubInstall: () => ipcRenderer.invoke('github:install'),
  onGithubStatus: (cb) => {
    if (typeof cb !== 'function') return () => {};
    const handler = (_e, status) => cb(status);
    ipcRenderer.on('github:status-changed', handler);
    return () => ipcRenderer.removeListener('github:status-changed', handler);
  }
});
