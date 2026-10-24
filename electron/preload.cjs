// 只暴露必要的 API 給前端，維持 contextIsolation 安全性。
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  platform: process.platform,
  listModels: () => ipcRenderer.invoke('desktop:listModels'),
  startModel: (modelId) => ipcRenderer.invoke('desktop:startModel', modelId),
  stopModel: () => ipcRenderer.invoke('desktop:stopModel'),
  onStatus: (callback) => {
    const listener = (_e, text) => callback(text);
    ipcRenderer.on('desktop:status', listener);
    return () => ipcRenderer.removeListener('desktop:status', listener);
  },
});
