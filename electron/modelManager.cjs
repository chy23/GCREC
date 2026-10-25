const { app, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// 1. 官方主流推薦模型定義（以 Meta Llama 3.2 3B 為預設輕量推薦）
const MODEL_DEFINITIONS = [
  {
    id: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    name: 'Llama 3.2 (3B) Instruct (Meta, 美國)',
    size: '2.0 GB',
    tag: '預設推薦 · 輕量極速首選',
    isDefault: true,
    hint: '體積極小（約 2.0GB），下載快、8GB 記憶體即可秒級響應，指令遵循度高，日常生活與任務最穩定。',
    pros: '【優點】體積僅 2.0GB 秒級下載、推論極為敏捷流暢、低耗電發熱、指令遵循度高，8GB 記憶體即可完美運作。',
    cons: '【限制】參數量較小（3B），針對超長文學修辭、高深度哲理反思之發揮空間略有限度。',
    downloadUrl: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf?download=true',
    hfPageUrl: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF'
  },
  {
    id: 'google_gemma-4-E4B-it-Q4_K_M.gguf',
    aliases: ['gemma-4-E4B-it-Q4_K_M.gguf'],
    name: 'Gemma 4 (E4B) Instruct (Google DeepMind)',
    size: '5.0 GB',
    tag: '進階平衡 · 靈動文采與超長脈絡',
    isDefault: false,
    hint: 'Google DeepMind 旗艦輕量架構，具備 128K 超長上下文，詞彙細膩豐富、文采靈動。',
    pros: '【優點】Google 旗艦架構、詞彙變化多樣文采佳、128K 超長脈絡可消化大量長篇資料。',
    cons: '【限制】檔案較大（約 5.0GB）、記憶體建議 8GB~16GB 以上、推論速度略慢於 3B。',
    downloadUrl: 'https://huggingface.co/bartowski/google_gemma-4-E4B-it-GGUF/resolve/main/google_gemma-4-E4B-it-Q4_K_M.gguf?download=true',
    hfPageUrl: 'https://huggingface.co/models?search=gemma-4-E4B+gguf'
  }
];

class ModelManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.llamaInstance = null;
    this.currentModel = null;
    this.currentContext = null;
    this.currentSession = null;
    this.currentModelFileName = null;
    this.currentAbortController = null;
  }

  // 讀取持久化設定
  loadSettings() {
    try {
      const p = path.join(app.getPath('userData'), 'settings.json');
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch (e) {}
    return {};
  }

  // 儲存設定
  saveSettings(cfg) {
    try {
      const dir = app.getPath('userData');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify(cfg, null, 2), 'utf-8');
    } catch (e) {}
  }

  // 取得所有模型候選目錄（最優先：使用者自訂；預設：~/Models）
  getModelDirs() {
    const dirs = [];
    const settings = this.loadSettings();
    if (settings.customModelDir && fs.existsSync(settings.customModelDir)) {
      dirs.push(settings.customModelDir);
    }
    const homeModels = path.join(app.getPath('home'), 'Models');
    dirs.push(homeModels); // 全域共享目錄
    dirs.push(path.join(app.getPath('userData'), 'models'));
    dirs.push(path.join(__dirname, '../models'));
    if (process.resourcesPath) dirs.push(path.join(process.resourcesPath, 'models'));
    return Array.from(new Set(dirs.filter(Boolean)));
  }

  // 依檔名搜尋實體路徑
  resolveModelPath(fileName) {
    const candidateNames = [fileName];
    const def = MODEL_DEFINITIONS.find(m => m.id === fileName);
    if (def && def.aliases) candidateNames.push(...def.aliases);

    for (const dir of this.getModelDirs()) {
      for (const name of candidateNames) {
        const full = path.join(dir, name);
        if (fs.existsSync(full)) return full;
      }
    }
    return null;
  }

  // 初始化所有 IPC 通訊
  registerIpc() {
    // 1. 取得模型狀態與動態掃描目錄
    ipcMain.handle('get-models-status', async () => {
      let gpuEngine = 'cpu';
      try {
        if (!this.llamaInstance) {
          const { getLlama } = await import('node-llama-cpp');
          this.llamaInstance = await getLlama();
        }
        gpuEngine = this.llamaInstance.gpu || 'cpu';
      } catch (e) {}

      const settings = this.loadSettings();
      const defaultModelDir = path.join(app.getPath('home'), 'Models');
      const effectiveModelDir = settings.customModelDir || defaultModelDir;
      const modelDirs = this.getModelDirs();

      // 檢查官方主流模型狀態
      const models = MODEL_DEFINITIONS.map(m => {
        const resolved = this.resolveModelPath(m.id);
        let realSize = 0;
        if (resolved) {
          try { realSize = fs.statSync(resolved).size; } catch (e) {}
        }
        return {
          ...m,
          isAvailable: !!resolved && realSize > 50 * 1024 * 1024,
          isLoaded: this.currentModelFileName === m.id,
          path: resolved,
          fileSizeMB: realSize > 0 ? (realSize / 1024 / 1024).toFixed(1) : 0
        };
      });

      // 動態掃描：自動抓取放入目錄的任何 Hugging Face 社群微調 .gguf 檔案
      const predefinedIds = new Set(MODEL_DEFINITIONS.map(m => m.id));
      MODEL_DEFINITIONS.forEach(m => {
        if (m.aliases) m.aliases.forEach(a => predefinedIds.add(a));
      });

      const customModels = [];
      for (const dir of modelDirs) {
        if (fs.existsSync(dir)) {
          try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
              if (file.endsWith('.gguf') && !predefinedIds.has(file)) {
                const filePath = path.join(dir, file);
                try {
                  const stat = fs.statSync(filePath);
                  if (stat.size > 50 * 1024 * 1024) {
                    customModels.push({
                      id: file,
                      name: file.replace('.gguf', ''),
                      size: (stat.size / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                      tag: 'Hugging Face / 社群自訂微調模型',
                      isCustom: true,
                      isAvailable: true,
                      isLoaded: this.currentModelFileName === file,
                      path: filePath,
                      fileSizeMB: (stat.size / 1024 / 1024).toFixed(1)
                    });
                  }
                } catch (e) {}
              }
            }
          } catch (e) {}
        }
      }

      return {
        platform: process.platform,
        gpuEngine,
        currentLoadedModel: this.currentModelFileName,
        models,
        customModels,
        effectiveModelDir,
        hasAnyModel: models.some(m => m.isAvailable) || customModels.length > 0
      };
    });

    // 2. 原生彈窗選擇資料夾
    ipcMain.handle('select-model-dir', async () => {
      const settings = this.loadSettings();
      const defaultDir = settings.customModelDir || path.join(app.getPath('home'), 'Models');
      if (!fs.existsSync(defaultDir)) {
        try { fs.mkdirSync(defaultDir, { recursive: true }); } catch (e) {}
      }
      const res = await dialog.showOpenDialog(this.mainWindow, {
        title: '選擇離線 AI 共享模型存放資料夾',
        defaultPath: defaultDir,
        properties: ['openDirectory', 'createDirectory']
      });
      if (!res.canceled && res.filePaths?.[0]) {
        settings.customModelDir = res.filePaths[0];
        this.saveSettings(settings);
        return { success: true, modelDir: res.filePaths[0] };
      }
      return { success: false, canceled: true };
    });

    // 3. 在 Finder / 檔案總管中打開
    ipcMain.handle('open-model-dir', async (event, dirPath) => {
      const settings = this.loadSettings();
      const target = dirPath || settings.customModelDir || path.join(app.getPath('home'), 'Models');
      if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
      await shell.openPath(target);
      return { success: true, dir: target };
    });

    // 4. 安全開啟瀏覽器至外部網頁（如 Hugging Face）
    ipcMain.handle('open-external', async (event, url) => {
      if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
        await shell.openExternal(url);
        return { success: true };
      }
      return { success: false, error: '非法的外部連結' };
    });

    // 5. 載入模型到 GPU/CPU
    ipcMain.handle('load-model', async (event, modelFileName) => {
      try {
        const modelPath = this.resolveModelPath(modelFileName);
        if (!modelPath) throw new Error(`找不到本機模型檔案: ${modelFileName}`);

        if (!this.llamaInstance) {
          const { getLlama } = await import('node-llama-cpp');
          this.llamaInstance = await getLlama();
        }

        if (this.currentContext) await this.currentContext.dispose();
        if (this.currentModel) await this.currentModel.dispose();

        this.currentModel = await this.llamaInstance.loadModel({
          modelPath,
          gpuLayers: 'max' // 智慧最大化卸載至 Apple Silicon Metal 或 Windows Vulkan
        });

        this.currentContext = await this.currentModel.createContext({ contextSize: 8192 });
        const { LlamaChatSession } = await import('node-llama-cpp');
        this.currentSession = new LlamaChatSession({
          contextSequence: this.currentContext.getSequence()
        });

        this.currentModelFileName = modelFileName;
        return { success: true, modelFileName, gpu: this.llamaInstance.gpu };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    // 6. 生成文本 (串流 Streaming)
    ipcMain.handle('generate-ai', async (event, { prompt }) => {
      if (!this.currentSession) throw new Error("本機離線模型尚未載入就緒！");
      this.currentAbortController = new AbortController();
      const signal = this.currentAbortController.signal;
      try {
        const res = await this.currentSession.prompt(prompt, {
          signal,
          temperature: 0.1,
          onTextChunk: (chunk) => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.send('ai-chunk', chunk);
            }
          }
        });
        return { success: true, text: res };
      } catch (err) {
        if (signal.aborted) return { success: false, aborted: true };
        return { success: false, error: err.message };
      } finally {
        this.currentAbortController = null;
      }
    });

    // 7. 中斷生成
    ipcMain.handle('stop-generation', async () => {
      if (this.currentAbortController) {
        this.currentAbortController.abort();
        this.currentAbortController = null;
      }
      return { success: true };
    });
  }
}

module.exports = { ModelManager, MODEL_DEFINITIONS };
