const { contextBridge, ipcRenderer } = require('electron');

const api = {
  isDesktop: true,
  platform: process.platform,
  launchHub: () => ipcRenderer.invoke('launch-hub'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
};

contextBridge.exposeInMainWorld('electronAPI', api);
contextBridge.exposeInMainWorld('desktopAPI', api);
