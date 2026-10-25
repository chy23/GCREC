import React, { useState, useEffect } from 'react';
import { 
  Server, Cpu, RefreshCw, AlertCircle, CheckCircle2, 
  ExternalLink, Sparkles, Download, ArrowRight, Folder, 
  FolderOpen, Layers, ShieldAlert, HardDrive, Info
} from 'lucide-react';
import './ModelHubManager.css';

// 6 大 Antigravity Model Hub 官方核心模型定義
export const CORE_MODELS = [
  {
    id: 'gemma-4-E2B-it-Q4_K_M.gguf',
    canonicalId: 'gemma-4-e2b',
    name: 'Gemma 4 (E2B) Instruct',
    provider: 'Google DeepMind',
    size: '1.6 GB',
    minRamGB: 8,
    recRamGB: 8,
    category: '極致輕量 · 邊緣首選',
    isDefault: false,
    tag: '⚡ 輕量極速',
    summary: 'Google 旗艦第 4 代超輕量架構，體積極小秒級加載，耗電發熱低，日常任務最敏捷。',
    pros: '體積僅 1.6GB 下載秒就緒、推論極為敏捷、耗電低，8GB 記憶體即可完美流暢運行。',
    downloadUrl: 'https://huggingface.co/bartowski/google_gemma-4-2B-it-GGUF/resolve/main/google_gemma-4-2B-it-Q4_K_M.gguf?download=true',
    hfPageUrl: 'https://huggingface.co/models?search=gemma-4-2b+gguf'
  },
  {
    id: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    canonicalId: 'llama-3.2-3b',
    name: 'Llama 3.2 (3B) Instruct',
    provider: 'Meta AI',
    size: '2.0 GB',
    minRamGB: 8,
    recRamGB: 8,
    category: '全能輕量 · 指令首選',
    isDefault: true,
    tag: '⭐️ 預設推薦',
    summary: 'Meta 最經典的輕量指令模型，遵循能力高、格式嚴謹，親師訪談紀錄歸納最穩定。',
    pros: '指令遵循度極高、輸出格式規範嚴謹、2.0GB 輕盈體積，Apple Silicon GPU 加速秒級響應。',
    downloadUrl: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf?download=true',
    hfPageUrl: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF'
  },
  {
    id: 'gemma-4-26B-A4B-it-Q4_K_M.gguf',
    canonicalId: 'gemma-4-26b-a4b',
    name: 'Gemma 4 (26B A4B) MoE',
    provider: 'Google DeepMind',
    size: '15.5 GB',
    minRamGB: 16,
    recRamGB: 24,
    category: '混合專家 · 高性價比',
    isDefault: false,
    tag: '🚀 MoE 旗艦',
    summary: '總參數量 26B 但推論僅激活 4B（Active 4B），同時擁有 26B 的知識廣度與 4B 的飛快速度。',
    pros: '兼具 26B 廣博知識庫與 4B 級的高速生成效率、支援 128K 超長上下文，長篇紀錄不遺漏。',
    downloadUrl: 'https://huggingface.co/bartowski/google_gemma-4-26B-A4B-it-GGUF/resolve/main/google_gemma-4-26B-A4B-it-Q4_K_M.gguf?download=true',
    hfPageUrl: 'https://huggingface.co/models?search=gemma-4-26b+gguf'
  },
  {
    id: 'Llama-3.2-11B-Vision-Instruct-Q4_K_M.gguf',
    canonicalId: 'llama-3.2-vision-11b',
    name: 'Llama 3.2 Vision (11B)',
    provider: 'Meta AI',
    size: '6.8 GB',
    minRamGB: 16,
    recRamGB: 16,
    category: '多模態視覺 · 圖文理解',
    isDefault: false,
    tag: '👁️ 多模態視覺',
    summary: '具備視覺感知能力，可處理圖片辨識、對話截圖 OCR 與圖表分析。',
    pros: '支援文本與圖像雙模態、截圖分析力強，11B 規模在推論邏輯與辨識度取得優秀平衡。',
    downloadUrl: 'https://huggingface.co/bartowski/Llama-3.2-11B-Vision-Instruct-GGUF/resolve/main/Llama-3.2-11B-Vision-Instruct-Q4_K_M.gguf?download=true',
    hfPageUrl: 'https://huggingface.co/bartowski/Llama-3.2-11B-Vision-Instruct-GGUF'
  },
  {
    id: 'gemma-4-31B-Dense-it-Q4_K_M.gguf',
    canonicalId: 'gemma-4-31b-dense',
    name: 'Gemma 4 (31B Dense) Instruct',
    provider: 'Google DeepMind',
    size: '18.5 GB',
    minRamGB: 24,
    recRamGB: 32,
    category: '稠密旗艦 · 深度推理',
    isDefault: false,
    tag: '🧠 深度旗艦',
    summary: '全參數激活稠密旗艦，邏輯推演極為嚴密，繁體中文文采細膩，修辭與心理分析深刻。',
    pros: '思維鏈條深厚、邏輯推理強悍、長文寫作與繁中語感極佳，適合高品質行政與心理評析。',
    downloadUrl: 'https://huggingface.co/bartowski/google_gemma-4-31B-it-GGUF/resolve/main/google_gemma-4-31B-it-Q4_K_M.gguf?download=true',
    hfPageUrl: 'https://huggingface.co/models?search=gemma-4-31b+gguf'
  },
  {
    id: 'Llama-4-Scout-109B-MoE-Q4_K_M.gguf',
    canonicalId: 'llama-4-scout-109b',
    name: 'Llama 4 Scout (109B) MoE',
    provider: 'Meta AI',
    size: '62.0 GB',
    minRamGB: 64,
    recRamGB: 96,
    category: '超巨型怪獸 · 極限專家',
    isDefault: false,
    tag: '👑 頂級巨獸',
    summary: 'Meta 次世代 109B 頂尖架構（17B Active），極限跨領域專家理解與深度上下文感知。',
    pros: '世界一流的推理能力、多輪超長上下文對話極致精準、專家層級解題深度。',
    downloadUrl: 'https://huggingface.co/bartowski/Llama-4-Scout-109B-GGUF/resolve/main/Llama-4-Scout-109B-Q4_K_M.gguf?download=true',
    hfPageUrl: 'https://huggingface.co/models?search=llama-4-scout+gguf'
  }
];

export const HUB_MODELS = CORE_MODELS;

export default function ModelHubManager({ selectedModel, onSelectModel, onModelReady }) {
  const [statusData, setStatusData] = useState(null);
  const [hubOnline, setHubOnline] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [currentModelId, setCurrentModelId] = useState(selectedModel || CORE_MODELS[1].id);

  // 1. 重新掃描 ~/Models 與檢查 Hub 連線
  const refreshStatus = async () => {
    setIsScanning(true);
    try {
      if (window.electronAPI?.getModelsStatus) {
        const data = await window.electronAPI.getModelsStatus();
        setStatusData(data);
        setHubOnline(data.hubOnline);
      } else {
        // 純網頁版降級檢查
        const res = await fetch('http://127.0.0.1:51123/api/status', {
          method: 'GET',
          signal: AbortSignal.timeout(2000)
        });
        if (res.ok) {
          const d = await res.json();
          setHubOnline(true);
          setStatusData({
            hubOnline: true,
            effectiveModelDir: d.effectiveModelDir || '~/Models',
            coreModels: CORE_MODELS,
            customModels: []
          });
        } else {
          setHubOnline(false);
        }
      }
    } catch (e) {
      setHubOnline(false);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const coreList = statusData?.coreModels || CORE_MODELS;
  const customList = statusData?.customModels || [];
  const allList = [...coreList, ...customList];

  const currentObj = allList.find(m => m.id === currentModelId) || coreList[1] || CORE_MODELS[1];

  const handleSelect = (id) => {
    setCurrentModelId(id);
    if (onSelectModel) onSelectModel(id);
  };

  const handleLaunchHub = async () => {
    if (window.electronAPI?.launchHub) {
      await window.electronAPI.launchHub();
    } else {
      window.open('antigravity-hub://launch', '_self');
    }
    setTimeout(refreshStatus, 2500);
  };

  const handleOpenDir = async () => {
    if (window.electronAPI?.openModelDir) {
      await window.electronAPI.openModelDir(statusData?.effectiveModelDir);
    }
  };

  const handleOpenExternal = (url) => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="hub-connector-card">
      {/* 頂部管理列：共享路徑與 Hub 中樞狀態 */}
      <div className="hub-status-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Server size={18} color={hubOnline ? '#10B981' : '#9CA3AF'} />
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>Antigravity Model Hub</span>
          <span className={`status-pill ${hubOnline ? 'online' : 'offline'}`}>
            {hubOnline ? '🟢 中樞就緒 (127.0.0.1:51123)' : '⚪ 中樞未啟動'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#6B7280' }}>
            <Folder size={14} color="#3B82F6" />
            <span>共享模型庫：<code>{statusData?.effectiveModelDir || '~/Models'}</code></span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            type="button" 
            onClick={handleOpenDir} 
            className="hub-icon-btn" 
            title="在 Finder 中打開本機共享模型資料夾"
          >
            <FolderOpen size={14} /> 在 Finder 打開
          </button>
          <button 
            type="button" 
            onClick={refreshStatus} 
            disabled={isScanning}
            className="hub-icon-btn" 
            title="重新掃描 ~/Models 與 Hub 連線"
          >
            <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} /> 重新掃描
          </button>
        </div>
      </div>

      {/* 若 Hub 未啟動，顯示友善導引與一鍵開啟 */}
      {!hubOnline && (
        <div className="hub-warn-card" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1, fontSize: '0.85rem' }}>
            <p style={{ fontWeight: 700, color: '#92400E', margin: '0 0 0.35rem 0' }}>未偵測到 Antigravity Model Hub 正在運行</p>
            <p style={{ color: '#B45309', margin: '0 0 0.6rem 0', lineHeight: 1.5 }}>
              本系統已全面串接「Antigravity Model Hub」共享模型中樞與 GPU 硬體加速。請開啟 <b>Antigravity Model Hub.app</b>，或點擊下方按鈕進行自動喚醒：
            </p>
            <button 
              type="button" 
              onClick={handleLaunchHub} 
              className="hub-action-btn"
            >
              <ExternalLink size={14} /> 開啟 / 喚醒 Antigravity Model Hub
            </button>
          </div>
        </div>
      )}

      {/* 模型下拉選單與動態掃描清單 */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#4B5563', marginBottom: '0.4rem' }}>
          選擇推論模型（支援 6 款官方核心模型 + ~/Models 社群微調模型）：
        </label>
        <select 
          value={currentModelId}
          onChange={(e) => handleSelect(e.target.value)}
          className="model-select-dropdown"
        >
          <optgroup label="⭐️ Antigravity Model Hub 官方 6 大核心模型">
            {coreList.map(m => (
              <option key={m.id} value={m.id}>
                {m.isAvailable ? '🟢 [已就緒] ' : '⚪ [未下載] '}
                {m.name} ({m.size}) · 建議 {m.minRamGB}GB+ RAM
              </option>
            ))}
          </optgroup>
          {customList.length > 0 && (
            <optgroup label={`🧩 ~/Models 社群微調自訂模型 (動態掃描到 ${customList.length} 款)`}>
              {customList.map(m => (
                <option key={m.id} value={m.id}>
                  🟢 [已就緒] {m.name} ({m.size})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* 當前所選模型規格資訊卡 */}
      <div className="model-detail-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <div>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#1F2937' }}>{currentObj.name}</span>
            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: '#DBEAFE', color: '#1E40AF', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
              {currentObj.tag || 'AI 模型'}
            </span>
            {currentObj.isAvailable ? (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: '#D1FAE5', color: '#065F46', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                🟢 本機已就緒
              </span>
            ) : (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: '#F3F4F6', color: '#6B7280', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                ⚪ 尚未下載
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: 'monospace', fontWeight: 600 }}>
            檔案大小：{currentObj.size} {currentObj.minRamGB && `· 建議 RAM: ${currentObj.minRamGB}GB+`}
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#4B5563', margin: '0 0 0.5rem 0', lineHeight: 1.5 }}>
          {currentObj.summary || currentObj.pros || '由本機 ~/Models 資料夾提供之離線推論模型。'}
        </p>

        {currentObj.ramWarning && (
          <div style={{ fontSize: '0.8rem', color: '#B45309', background: '#FEF3C7', padding: '0.4rem 0.75rem', borderRadius: '6px', marginBottom: '0.5rem' }}>
            {currentObj.ramWarning}
          </div>
        )}

        {/* 模型已就緒狀態 */}
        {currentObj.isAvailable ? (
          <div style={{ marginTop: '0.75rem' }}>
            <div className="hub-note-badge ready">
              <CheckCircle2 size={16} color="#059669" />
              <span style={{ fontWeight: 600, color: '#065F46' }}>
                檔案已存在於本機 <code>{statusData?.effectiveModelDir || '~/Models'}</code>，隨時可進行推論轉換！
              </span>
            </div>
            <button 
              type="button"
              onClick={() => {
                const confirmed = window.confirm("⚠️ 注意：離線模型處理效能有限，彙整資訊與原意可能有差異，請反覆確認才做使用。強烈建議以「雲端API模式」為優先使用。\n\n您確定要啟用此本機模型並開始記錄轉換嗎？");
                if (confirmed && onModelReady) {
                  onModelReady({ ready: true, modelId: currentObj.id, modelInfo: currentObj, proceed: true });
                }
              }}
              className="hub-btn-proceed"
            >
              <span>確認啟用此模型並開始記錄轉換</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          /* 模型尚未下載引導區塊 */
          <div className="hub-warn-card info" style={{ marginTop: '0.75rem' }}>
            <Download size={20} color="#2563EB" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1, fontSize: '0.85rem' }}>
              <p style={{ fontWeight: 700, color: '#1E40AF', margin: '0 0 0.25rem 0' }}>模型尚未下載至本機共享資料夾</p>
              <p style={{ color: '#1D4ED8', margin: '0 0 0.6rem 0', lineHeight: 1.5 }}>
                您可以透過 <b>Antigravity Model Hub</b> 一鍵安全下載，或直接前往 Hugging Face 下載後放入 <code>~/Models</code> 資料夾中。
              </p>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  onClick={handleLaunchHub} 
                  className="hub-action-btn"
                  style={{ background: '#2563EB' }}
                >
                  <ExternalLink size={14} /> 開啟 Antigravity Model Hub 管理下載
                </button>
                {currentObj.downloadUrl && (
                  <button 
                    type="button" 
                    onClick={() => handleOpenExternal(currentObj.downloadUrl)} 
                    className="hub-icon-btn"
                    style={{ background: '#FFFFFF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
                  >
                    <Download size={14} /> Hugging Face 官方直接下載
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={handleOpenDir} 
                  className="hub-icon-btn"
                >
                  <FolderOpen size={14} /> 打開 ~/Models
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
