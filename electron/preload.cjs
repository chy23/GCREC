const { contextBridge, ipcRenderer } = require('electron');

const api = {
  isDesktop: true,
  platform: process.platform,
  getModelsStatus: () => ipcRenderer.invoke('get-models-status'),
  launchHub: () => ipcRenderer.invoke('launch-hub'),
  openModelDir: (dir) => ipcRenderer.invoke('open-model-dir', dir),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  ensureModel: (modelId) => ipcRenderer.invoke('ensure-model', modelId),
  generateAi: (params) => ipcRenderer.invoke('generate-ai', params),
  selectModelDir: () => ipcRenderer.invoke('select-model-dir')
};

contextBridge.exposeInMainWorld('electronAPI', api);
contextBridge.exposeInMainWorld('desktopAPI', api);
