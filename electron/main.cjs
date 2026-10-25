const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { ModelManager } = require('./modelManager.cjs');

let mainWindow = null;
let modelManager = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 920,
    minHeight: 650,
    title: '教師輔導紀錄小幫手',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  modelManager = new ModelManager(mainWindow);
  modelManager.registerIpc();

  // 外部連結用系統瀏覽器開啟
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url) || /^antigravity-hub:/.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist-desktop', 'index.html'));
  }

  // 點擊叉叉（關閉視窗）後完全退出程式
  mainWindow.on('closed', () => {
    mainWindow = null;
    app.quit();
  });
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 所有視窗關閉時完全退出（包含 macOS）
app.on('window-all-closed', () => {
  app.quit();
});
