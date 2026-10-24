// Electron 主程序：負責視窗與內嵌 llama-server 的生命週期。
const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

const isDev = !app.isPackaged;
const platformDir = process.platform === 'win32' ? 'win-x64' : 'mac-arm64';
const serverExe = process.platform === 'win32' ? 'llama-server.exe' : 'llama-server';

// 打包後資源在 process.resourcesPath；開發時直接讀專案內的 desktop/
const resourceRoot = isDev ? path.join(__dirname, '..', 'desktop') : process.resourcesPath;
const binDir = path.join(resourceRoot, 'bin', platformDir);
const modelsDir = path.join(resourceRoot, 'models');
const manifestPath = isDev
  ? path.join(resourceRoot, 'editions', `${process.env.APP_EDITION || 'lite'}.json`)
  : path.join(resourceRoot, 'edition.json');

const CONTEXT_SIZE = 16384;

let mainWindow = null;
let server = null; // { proc, port, modelId }

const readManifest = () => JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

// 只回傳實際存在於安裝包內的模型
const listModels = () => {
  const manifest = readManifest();
  return {
    edition: manifest.edition,
    editionName: manifest.editionName,
    models: manifest.models
      .filter((m) => fs.existsSync(path.join(modelsDir, m.file)))
      .map(({ url, bytes, ...rest }) => rest),
  };
};

const getFreePort = () =>
  new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });

const stopServer = () =>
  new Promise((resolve) => {
    if (!server) return resolve();
    const { proc } = server;
    server = null;
    if (proc.exitCode !== null) return resolve();
    const timer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch (e) {}
      resolve();
    }, 5000);
    proc.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    try { proc.kill(); } catch (e) { resolve(); }
  });

const sendStatus = (text) => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('desktop:status', text);
};

const waitForHealth = async (port, proc, timeoutMs) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (proc.exitCode !== null) throw new Error(`推論引擎意外結束 (exit ${proc.exitCode})`);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) return;
    } catch (e) {
      // 伺服器尚未開始監聽
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('等待模型載入逾時');
};

const startModel = async (modelId) => {
  if (server && server.modelId === modelId && server.proc.exitCode === null) {
    return { baseUrl: `http://127.0.0.1:${server.port}` };
  }
  await stopServer();

  const model = readManifest().models.find((m) => m.id === modelId);
  if (!model) throw new Error(`找不到模型 ${modelId}`);
  const modelPath = path.join(modelsDir, model.file);
  if (!fs.existsSync(modelPath)) throw new Error(`安裝包內缺少模型檔 ${model.file}`);

  const exePath = path.join(binDir, serverExe);
  if (!fs.existsSync(exePath)) throw new Error(`找不到推論引擎 ${exePath}`);

  const port = await getFreePort();
  const args = [
    '-m', modelPath,
    '--host', '127.0.0.1',
    '--port', String(port),
    '-c', String(CONTEXT_SIZE),
    '-ngl', '99',
    '--jinja',
    '--no-webui',
  ];

  sendStatus(`正在載入 ${model.name}，首次啟動約需 10~60 秒...`);
  const proc = spawn(exePath, args, {
    cwd: binDir,
    windowsHide: true,
    env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH || ''}` },
  });
  let lastLog = '';
  const onLog = (buf) => {
    lastLog = (lastLog + buf.toString()).slice(-4000);
  };
  proc.stdout.on('data', onLog);
  proc.stderr.on('data', onLog);
  server = { proc, port, modelId };

  try {
    await waitForHealth(port, proc, 300000);
  } catch (err) {
    await stopServer();
    const tail = lastLog.split('\n').filter(Boolean).slice(-8).join('\n');
    throw new Error(`${err.message}\n\n${tail}`);
  }
  sendStatus(`${model.name} 已就緒`);
  return { baseUrl: `http://127.0.0.1:${port}` };
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: '教師輔導紀錄小幫手',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 外部連結 (例如 Google AI Studio) 用系統瀏覽器開啟
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist-desktop', 'index.html'));
};

ipcMain.handle('desktop:listModels', () => listModels());
ipcMain.handle('desktop:startModel', (_e, modelId) => startModel(modelId));
ipcMain.handle('desktop:stopModel', () => stopServer());

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

// 確保結束 App 時一併關閉背景推論引擎
let quitting = false;
app.on('before-quit', (event) => {
  if (quitting || !server) return;
  event.preventDefault();
  quitting = true;
  stopServer().finally(() => app.quit());
});

process.on('uncaughtException', (err) => {
  dialog.showErrorBox('發生錯誤', String(err && err.stack ? err.stack : err));
});
