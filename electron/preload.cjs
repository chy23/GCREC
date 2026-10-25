const { contextBridge, ipcRenderer } = require('electron');

const api = {
  isDesktop: true,
  platform: process.platform,
  getModelsStatus: () => ipcRenderer.invoke('get-models-status'),
  loadModel: (modelFileName) => ipcRenderer.invoke('load-model', modelFileName),
  selectModelDir: () => ipcRenderer.invoke('select-model-dir'),
  openModelDir: (dirPath) => ipcRenderer.invoke('open-model-dir', dirPath),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  generateAi: (data) => ipcRenderer.invoke('generate-ai', data),
  stopGeneration: () => ipcRenderer.invoke('stop-generation'),
  onChunk: (callback) => {
    const sub = (e, chunk) => callback(chunk);
    ipcRenderer.on('ai-chunk', sub);
    return () => ipcRenderer.removeListener('ai-chunk', sub);
  }
};

contextBridge.exposeInMainWorld('electronAPI', api);
contextBridge.exposeInMainWorld('desktopAPI', api);

