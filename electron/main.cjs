const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '教師輔導紀錄小幫手',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

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
};

// 註冊 IPC：喚醒 Antigravity Model Hub (本機模型中樞)
ipcMain.handle('launch-hub', async () => {
  try {
    await shell.openExternal('antigravity-hub://launch');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 安全開啟外部網址或自訂協定
ipcMain.handle('open-external', async (event, url) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('antigravity-hub://'))) {
    await shell.openExternal(url);
    return { success: true };
  }
  return { success: false, error: '非法的外部連結' };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
