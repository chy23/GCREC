const { app, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

const HUB_URL = 'http://127.0.0.1:51123';

// 6 大官方核心模型定義（同步自 Antigravity Model Hub）
const CORE_MODELS = [
  {
    id: 'gemma-4-E2B-it-Q4_K_M.gguf',
    canonicalId: 'gemma-4-e2b',
    name: 'Gemma 4 (E2B) Instruct',
    provider: 'Google DeepMind',
    size: '1.6 GB',
    bytes: 1.6 * 1024 * 1024 * 1024,
    minRamGB: 8,
    recRamGB: 8,
    category: '極致輕量 · 邊緣首選',
    isDefault: false,
    tag: '⚡ 輕量極速',
    summary: 'Google 旗艦第 4 代超輕量架構，體積極小秒級加載，耗電發熱低，日常任務最敏捷。',
    pros: '【優點】體積僅 1.6GB 下載秒就緒、推論速度極快、耗電低發熱極少，8GB 記憶體 Mac 即可飛速流暢運行。',
    cons: '【限制】參數量精簡（2B），面對深奧多步邏輯推理、超長哲理創作之論述深度相對有限。',
    downloadUrl: 'https://huggingface.co/bartowski/google_gemma-4-2B-it-GGUF/resolve/main/google_gemma-4-2B-it-Q4_K_M.gguf?download=true',
    hfPageUrl: 'https://huggingface.co/models?search=gemma-4-2b+gguf'
  },
  {
    id: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    canonicalId: 'llama-3.2-3b',
    name: 'Llama 3.2 (3B) Instruct',
    provider: 'Meta AI',
    size: '2.0 GB',
    bytes: 2.0 * 1024 * 1024 * 1024,
    minRamGB: 8,
    recRamGB: 8,
    category: '全能輕量 · 指令首選',
    isDefault: true,
    tag: '⭐️ 預設推薦',
    summary: 'Meta 最經典的輕量指令模型，遵循能力高、回覆迅速精確，一般工作任務最穩定。',
    pros: '【優點】指令遵循度極高、輸出格式規範嚴謹、2.0GB 輕盈體積，Apple Silicon GPU 加速可達 50+ tokens/s。',
    cons: '【限制】3B 規模在超長篇學術知識深度與複雜生僻領域的論述豐富度略低於大型模型。',
    downloadUrl: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf?download=true',
    hfPageUrl: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF'
  },
  {
    id: 'gemma-4-26B-A4B-it-Q4_K_M.gguf',
    canonicalId: 'gemma-4-26b-a4b',
    name: 'Gemma 4 (26B A4B) MoE',
    provider: 'Google DeepMind',
    size: '15.5 GB',
    bytes: 15.5 * 1024 * 1024 * 1024,
    minRamGB: 16,
    recRamGB: 24,
    category: '混合專家 · 高性價比',
    isDefault: false,
    tag: '🚀 MoE 旗艦',
    summary: '總參數量 26B 但推論僅激活 4B（Active 4B），同時擁有 26B 的知識廣度與 4B 的飛快速度。',
    pros: '【優點】兼具 26B 廣博知識庫與 4B 等級的高速生成效率、支援 128K 超長上下文，極高性價比。',
    cons: '【限制】完整模型仍需常駐記憶體，檔案約 15.5GB，建議 16GB~24GB 以上 RAM 的 Mac 運行。',
    downloadUrl: 'https://huggingface.co/bartowski/google_gemma-4-26B-A4B-it-GGUF/resolve/main/google_gemma-4-26B-A4B-it-Q4_K_M.gguf?download=true',
    hfPageUrl: 'https://huggingface.co/models?search=gemma-4-26b+gguf'
  },
  {
    id: 'Llama-3.2-11B-Vision-Instruct-Q4_K_M.gguf',
    canonicalId: 'llama-3.2-vision-11b',
    name: 'Llama 3.2 Vision (11B)',
    provider: 'Meta AI',
    size: '6.8 GB',
    bytes: 6.8 * 1024 * 1024 * 1024,
    minRamGB: 16,
    recRamGB: 16,
    category: '多模態視覺 · 圖文理解',
    isDefault: false,
    tag: '👁️ 多模態視覺',
    summary: '具備視覺感知能力，可處理圖片辨識、圖表分析、OCR 文字提取與教材圖像問答。',
    pros: '【優點】支援視覺與文本雙模態、圖表與截圖分析力強，11B 規模在推論邏輯與辨識度取得優秀平衡。',
    cons: '【限制】純文字生成速度略慢於純文本 3B/8B，若需要視覺投影功能需額外掛載 mmproj。',
    downloadUrl: 'https://huggingface.co/bartowski/Llama-3.2-11B-Vision-Instruct-GGUF/resolve/main/Llama-3.2-11B-Vision-Instruct-Q4_K_M.gguf?download=true',
    hfPageUrl: 'https://huggingface.co/bartowski/Llama-3.2-11B-Vision-Instruct-GGUF'
  },
  {
    id: 'gemma-4-31B-Dense-it-Q4_K_M.gguf',
    canonicalId: 'gemma-4-31b-dense',
    name: 'Gemma 4 (31B Dense) Instruct',
    provider: 'Google DeepMind',
    size: '18.5 GB',
    bytes: 18.5 * 1024 * 1024 * 1024,
    minRamGB: 24,
    recRamGB: 32,
    category: '稠密旗艦 · 深度推理',
    isDefault: false,
    tag: '🧠 深度旗艦',
    summary: '全參數激活稠密模型，邏輯推演極為嚴密，繁體中文文采細膩，複雜程式與教材編寫力強。',
    pros: '【優點】思維鏈條深厚、邏輯推理強悍、長文寫作與繁中語感極佳，適合高品質內容產出。',
    cons: '【限制】檔案近 19GB，需要較高記憶體頻寬，建議配備 24GB 或 32GB 以上記憶體。',
    downloadUrl: 'https://huggingface.co/bartowski/google_gemma-4-31B-it-GGUF/resolve/main/google_gemma-4-31B-it-Q4_K_M.gguf?download=true',
    hfPageUrl: 'https://huggingface.co/models?search=gemma-4-31b+gguf'
  },
  {
    id: 'Llama-4-Scout-109B-MoE-Q4_K_M.gguf',
    canonicalId: 'llama-4-scout-109b',
    name: 'Llama 4 Scout (109B) MoE',
    provider: 'Meta AI',
    size: '62.0 GB',
    bytes: 62.0 * 1024 * 1024 * 1024,
    minRamGB: 64,
    recRamGB: 96,
    category: '超巨型怪獸 · 極限專家',
    isDefault: false,
    tag: '👑 頂級巨獸',
    summary: 'Meta 次世代 109B 頂尖架構（17B Active），極限跨領域專家理解與深度上下文感知。',
    pros: '【優點】世界一流的推理能力、多輪超長上下文對話極致精準、專家層級解題深度。',
    cons: '【限制】體積超過 60GB，僅限 64GB 以上之 Mac Studio 或 MacBook Pro Max 高配機型！',
    downloadUrl: 'https://huggingface.co/bartowski/Llama-4-Scout-109B-GGUF/resolve/main/Llama-4-Scout-109B-Q4_K_M.gguf?download=true',
    hfPageUrl: 'https://huggingface.co/models?search=llama-4-scout+gguf'
  }
];

class ModelManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
  }

  // 1. 讀取共享設定檔（優先讀取 ~/.antigravity-model-hub.json）
  loadHubSettings() {
    try {
      const p = path.join(os.homedir(), '.antigravity-model-hub.json');
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, 'utf-8'));
      }
    } catch (e) {}

    try {
      const p2 = path.join(app.getPath('userData'), 'settings.json');
      if (fs.existsSync(p2)) {
        return JSON.parse(fs.readFileSync(p2, 'utf-8'));
      }
    } catch (e) {}

    return {
      customModelDir: path.join(os.homedir(), 'Models')
    };
  }

  // 取得有效模型目錄（預設 ~/Models）
  getEffectiveModelDir() {
    const s = this.loadHubSettings();
    const dir = s.customModelDir || path.join(os.homedir(), 'Models');
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
    return dir;
  }

  // 取得所有候選模型搜尋路徑
  getModelDirs() {
    const dirs = [];
    dirs.push(this.getEffectiveModelDir());
    dirs.push(path.join(os.homedir(), 'Models'));
    dirs.push(path.join(app.getPath('userData'), 'models'));
    return Array.from(new Set(dirs.filter(Boolean)));
  }

  // 解析模型實體路徑
  resolveModelPath(fileNameOrId) {
    if (!fileNameOrId) return null;
    const clean = fileNameOrId.trim();
    for (const dir of this.getModelDirs()) {
      if (fs.existsSync(dir)) {
        const full = path.join(dir, clean);
        if (fs.existsSync(full)) {
          try {
            const stat = fs.statSync(full);
            if (stat.size > 20 * 1024 * 1024) return full;
          } catch (e) {}
        }
      }
    }
    return null;
  }

  // 檢查 Antigravity Model Hub (127.0.0.1:51123) 連線狀態
  async checkHubConnection() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${HUB_URL}/api/status`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}
    return null;
  }

  // 註冊所有 IPC 通道
  registerIpc() {
    // 1. 取得完整模型狀態（核心 6 大模型 + ~/Models 社群微調掃描 + Hub 服務狀態）
    ipcMain.handle('get-models-status', async () => {
      const hubData = await this.checkHubConnection();
      const hubOnline = !!hubData;
      const effectiveDir = this.getEffectiveModelDir();
      const totalRamGB = Math.round(os.totalmem() / (1024 * 1024 * 1024));

      // 檢查 6 款核心模型
      const coreModels = CORE_MODELS.map(m => {
        const resolved = this.resolveModelPath(m.id);
        let realSize = 0;
        if (resolved) {
          try { realSize = fs.statSync(resolved).size; } catch (e) {}
        }
        const isAvailable = !!resolved && realSize > 50 * 1024 * 1024;
        const isLoadedInHub = hubData?.currentLoadedModel === m.id;
        return {
          ...m,
          isAvailable,
          isLoaded: isLoadedInHub,
          path: resolved || path.join(effectiveDir, m.id),
          fileSizeMB: realSize > 0 ? (realSize / 1024 / 1024).toFixed(1) : 0,
          ramWarning: totalRamGB < m.minRamGB ? `⚠️ 您的 Mac 記憶體為 ${totalRamGB}GB，低於建議門檻 (${m.minRamGB}GB)` : null
        };
      });

      // 動態掃描 ~/Models 內的社群微調 .gguf 檔案
      const coreIds = new Set(CORE_MODELS.map(m => m.id.toLowerCase()));
      const customModels = [];
      for (const dir of this.getModelDirs()) {
        if (fs.existsSync(dir)) {
          try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
              if (file.endsWith('.gguf') && !coreIds.has(file.toLowerCase()) && !file.endsWith('.part')) {
                const fullPath = path.join(dir, file);
                try {
                  const stat = fs.statSync(fullPath);
                  if (stat.size > 50 * 1024 * 1024) {
                    customModels.push({
                      id: file,
                      canonicalId: file,
                      name: file.replace('.gguf', ''),
                      provider: 'Hugging Face / 社群微調',
                      size: (stat.size / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                      tag: '社群模型',
                      category: '社群自訂微調',
                      isCustom: true,
                      isAvailable: true,
                      isLoaded: hubData?.currentLoadedModel === file,
                      path: fullPath,
                      fileSizeMB: (stat.size / 1024 / 1024).toFixed(1),
                      summary: '本機動態偵測到的自訂 GGUF 模型，隨放即用。',
                      pros: '社群開放權重、針對特定語言或領域微調。',
                      cons: '請確認自身電腦記憶體與量化規格是否相容。'
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
        totalRamGB,
        hubOnline,
        hubStatus: hubData,
        effectiveModelDir: effectiveDir,
        currentLoadedModel: hubData?.currentLoadedModel || null,
        coreModels,
        customModels,
        allAvailableCount: coreModels.filter(m => m.isAvailable).length + customModels.length
      };
    });

    // 2. 喚醒 / 開啟 Antigravity Model Hub
    ipcMain.handle('launch-hub', async () => {
      try {
        await shell.openExternal('antigravity-hub://launch');
        // 額外保險：若 protocol 未能喚起，執行 open -a
        exec('open -a "Antigravity Model Hub"', () => {});
        return { success: true };
      } catch (err) {
        exec('open -a "Antigravity Model Hub"', () => {});
        return { success: true };
      }
    });

    // 3. 在 Finder / 檔案總管打開共享資料夾
    ipcMain.handle('open-model-dir', async (event, dirPath) => {
      const target = dirPath || this.getEffectiveModelDir();
      if (!fs.existsSync(target)) {
        try { fs.mkdirSync(target, { recursive: true }); } catch (e) {}
      }
      await shell.openPath(target);
      return { success: true };
    });

    // 4. 開啟外部網址
    ipcMain.handle('open-external', async (event, url) => {
      if (url && (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('antigravity-hub://'))) {
        await shell.openExternal(url);
        return { success: true };
      }
      return { success: false, error: '非法的外部連結' };
    });

    // 5. 確認模型就緒 (POST http://127.0.0.1:51123/api/ensure-model)
    ipcMain.handle('ensure-model', async (event, modelId) => {
      try {
        const res = await fetch(`${HUB_URL}/api/ensure-model`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId, autoLoad: true })
        });
        const data = await res.json();
        return data;
      } catch (err) {
        return { success: false, exists: false, ready: false, error: '無法連線至 Model Hub: ' + err.message };
      }
    });

    // 6. 派送推論 (POST http://127.0.0.1:51123/api/generate)
    ipcMain.handle('generate-ai', async (event, { prompt, modelId }) => {
      try {
        const res = await fetch(`${HUB_URL}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, modelId })
        });
        const data = await res.json();
        return data;
      } catch (err) {
        return { success: false, error: 'Model Hub 推論請求失敗: ' + err.message };
      }
    });

    // 7. 選擇資料夾
    ipcMain.handle('select-model-dir', async () => {
      const defaultDir = this.getEffectiveModelDir();
      const res = await dialog.showOpenDialog(this.mainWindow, {
        title: '選擇離線 AI 共享模型存放資料夾',
        defaultPath: defaultDir,
        properties: ['openDirectory', 'createDirectory']
      });
      if (!res.canceled && res.filePaths?.[0]) {
        return { success: true, modelDir: res.filePaths[0] };
      }
      return { success: false, canceled: true };
    });
  }
}

module.exports = { ModelManager, CORE_MODELS };
