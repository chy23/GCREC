import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, FolderOpen, RefreshCw, Download, ChevronDown, 
  CheckCircle2, Loader2, Cpu, AlertTriangle, ExternalLink, 
  Sparkles, BookOpen, ShieldAlert, HardDrive 
} from 'lucide-react';
import './ModelHubManager.css';

export default function ModelHubManager({ onModelLoaded }) {
  const [desktopStatus, setDesktopStatus] = useState(null);
  const [selectedModel, setSelectedModel] = useState('Llama-3.2-3B-Instruct-Q4_K_M.gguf');
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const dropdownRef = useRef(null);

  const refreshStatus = async () => {
    if (window.electronAPI?.getModelsStatus) {
      try {
        const status = await window.electronAPI.getModelsStatus();
        setDesktopStatus(status);
        if (status.currentLoadedModel) {
          setSelectedModel(status.currentLoadedModel);
        }
      } catch (e) {
        console.error('refreshStatus error:', e);
      }
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleSelectDir = async () => {
    const res = await window.electronAPI?.selectModelDir();
    if (res?.success) refreshStatus();
  };

  const handleOpenDir = async () => {
    await window.electronAPI?.openModelDir(desktopStatus?.effectiveModelDir);
  };

  const handleOpenExternal = (url) => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleLoadModel = async () => {
    const allModels = [...(desktopStatus?.models || []), ...(desktopStatus?.customModels || [])];
    const target = allModels.find(m => m.id === selectedModel);
    
    if (!target?.isAvailable) {
      setShowGuideModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const res = await window.electronAPI.loadModel(selectedModel);
      if (res.success) {
        await refreshStatus();
        if (onModelLoaded) onModelLoaded(res);
      } else {
        alert("模型載入失敗：" + res.error);
      }
    } catch (e) {
      alert("載入出錯：" + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const predefinedModels = desktopStatus?.models || [];
  const customModels = desktopStatus?.customModels || [];
  const allModels = [...predefinedModels, ...customModels];
  const currentObj = allModels.find(m => m.id === selectedModel) || predefinedModels[0] || {};

  return (
    <div className="model-hub-container">
      {/* 1. 本機共享模型庫管理列 */}
      <div className="model-hub-bar">
        <div className="model-dir-info">
          <Folder size={16} color="#2563eb" />
          <span>
            <b>本機共享模型庫：</b>
            <code>{desktopStatus?.effectiveModelDir || '~/Models'}</code>
          </span>
        </div>
        <div className="model-hub-actions">
          <button className="hub-btn secondary" onClick={handleOpenDir} title="在 Finder 中打開此資料夾">
            <FolderOpen size={14} /> 在 Finder 打開
          </button>
          <button className="hub-btn secondary" onClick={handleSelectDir} title="變更模型存放資料夾">
            <Folder size={14} /> 變更資料夾
          </button>
          <button className="hub-btn secondary" onClick={refreshStatus} title="重新整理掃描">
            <RefreshCw size={14} /> 重新整理
          </button>
          <button className="hub-btn primary" onClick={() => setShowGuideModal(true)}>
            <Download size={14} /> 模型下載指引與社群擴充
          </button>
        </div>
      </div>

      {/* 2. 尚未放入模型時的提醒卡片 */}
      {!desktopStatus?.hasAnyModel && (
        <div className="hub-alert warning">
          <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <b>💡 尚未偵測到離線模型！本系統為輕量化版本</b>
            <p>
              請點擊上方<b>【模型下載指引與社群擴充】</b>取得模型（預設推薦 <b>Meta Llama 3.2 3B</b>，體積僅 2.0GB），下載完成後放入上述模型庫資料夾即可秒速啟用。所有 Antigravity 本地工具均可統一共享使用！
            </p>
          </div>
        </div>
      )}

      {/* 3. 模型選擇下拉列與載入按鈕 */}
      <div className="model-select-row">
        <div className="model-custom-select" ref={dropdownRef}>
          <div className="select-trigger" onClick={() => !isLoading && setIsDropdownOpen(!isDropdownOpen)}>
            <div className="trigger-content">
              <span className="model-title">{currentObj.name || selectedModel}</span>
              <span className={`tag-badge ${currentObj.isDefault ? 'default' : ''}`}>
                {currentObj.tag || '本地模型'}
              </span>
              <span className={`status-badge ${currentObj.isAvailable ? 'available' : 'unavailable'}`}>
                {currentObj.isAvailable ? `🟢 就緒 (${currentObj.size})` : '⚪ 尚未下載'}
              </span>
            </div>
            <ChevronDown size={18} color="#6b7280" />
          </div>

          {isDropdownOpen && (
            <div className="select-menu">
              <div className="menu-group-header">官方主流推薦模型</div>
              {predefinedModels.map(m => (
                <div 
                  key={m.id} 
                  className={`menu-option ${selectedModel === m.id ? 'active' : ''}`}
                  onClick={() => { setSelectedModel(m.id); setIsDropdownOpen(false); }}
                >
                  <div className="option-top">
                    <span className="option-name">{m.isDefault ? '⭐️ ' : ''}{m.name} - {m.size}</span>
                    <span className={`status-pill ${m.isAvailable ? 'online' : 'offline'}`}>
                      {m.isAvailable ? '🟢 已就緒' : '⚪ 尚未下載'}
                    </span>
                  </div>
                  <div className="option-desc">
                    <div className="pros-text">{m.pros}</div>
                    <div className="cons-text">{m.cons}</div>
                  </div>
                </div>
              ))}

              {customModels.length > 0 && (
                <>
                  <div className="menu-group-header">Hugging Face / 社群自訂微調模型 ({customModels.length} 個)</div>
                  {customModels.map(m => (
                    <div 
                      key={m.id} 
                      className={`menu-option ${selectedModel === m.id ? 'active' : ''}`}
                      onClick={() => { setSelectedModel(m.id); setIsDropdownOpen(false); }}
                    >
                      <div className="option-top">
                        <span className="option-name">🧩 {m.name}</span>
                        <span className="status-pill online">🟢 {m.size}</span>
                      </div>
                      <div className="option-desc path">{m.path}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <button 
          className={`load-btn ${desktopStatus?.currentLoadedModel === selectedModel ? 'ready' : ''}`}
          onClick={handleLoadModel}
          disabled={isLoading}
        >
          {desktopStatus?.currentLoadedModel === selectedModel ? (
            <><CheckCircle2 size={16}/> 模型已就緒 ({desktopStatus?.gpuEngine?.toUpperCase() || 'GPU'} 加速)</>
          ) : isLoading ? (
            <><Loader2 className="spin" size={16}/> 載入中...</>
          ) : !currentObj.isAvailable ? (
            <><Download size={16}/> 下載指引</>
          ) : (
            <><Cpu size={16}/> 載入離線模型</>
          )}
        </button>
      </div>

      {/* 4. 模型下載與 Hugging Face 社群擴充 Modal */}
      {showGuideModal && (
        <div className="hub-modal-overlay" onClick={() => setShowGuideModal(false)}>
          <div className="hub-modal-card" onClick={e => e.stopPropagation()}>
            <div className="hub-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HardDrive size={20} color="#2563eb" />
                <h3>本機共享模型庫配置與下載指引</h3>
              </div>
              <button className="hub-close-btn" onClick={() => setShowGuideModal(false)}>×</button>
            </div>

            <div className="hub-modal-body">
              {/* 核心說明 */}
              <div className="modal-info-box">
                <div className="info-title"><FolderOpen size={16} /> 統一模型庫架構說明（所有軟體共用）</div>
                <p>
                  本軟體為<b>無模型輕量化版本</b>（約 80~180 MB）。未來您所有的 Antigravity 本地 AI 工具皆共用此資料夾，一次下載即可在所有桌面軟體中調度，免重複佔用硬碟空間。
                </p>
                <div className="dir-display-bar">
                  <div><b>目前路徑：</b><code>{desktopStatus?.effectiveModelDir || '~/Models'}</code></div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="hub-btn secondary" onClick={handleOpenDir}><FolderOpen size={13}/> 在 Finder 打開</button>
                    <button className="hub-btn secondary" onClick={handleSelectDir}><Folder size={13}/> 變更資料夾</button>
                  </div>
                </div>
              </div>

              {/* 主流模型下載卡片 */}
              <div>
                <h4 className="section-title"><Sparkles size={16} color="#f59e0b" /> 主流推薦模型（點擊直達 Hugging Face 下載）</h4>
                <div className="model-cards-grid">
                  {/* Llama 3.2 3B */}
                  <div className="model-card featured">
                    <div className="card-header">
                      <div>
                        <div className="card-name">⭐️ Meta Llama 3.2 (3B) Instruct</div>
                        <div className="card-spec">Meta 出品 · 4-bit 量化 (Q4_K_M) · 檔案約 2.0 GB · 記憶體需 8GB</div>
                      </div>
                      <div className="card-actions">
                        <button 
                          className="hub-btn primary"
                          onClick={() => handleOpenExternal('https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf?download=true')}
                        >
                          <Download size={13} /> 下載 .gguf (2.0 GB)
                        </button>
                        <button className="hub-btn secondary" onClick={() => handleOpenExternal('https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF')}>
                          <ExternalLink size={13} /> 模型卡
                        </button>
                      </div>
                    </div>
                    <div className="pros-cons-box">
                      <div className="pro-item"><b>優點：</b> 體積僅 2.0GB 秒級下載；推論秒級響應（Apple Silicon 每秒 40+ 字）；低發熱省電；日常生活與任務最穩定精準。</div>
                      <div className="con-item"><b>限制：</b> 3B 規模較小，針對極複雜文學長句或深奧哲理修辭發揮略有限度。</div>
                    </div>
                  </div>

                  {/* Gemma 4 E4B */}
                  <div className="model-card">
                    <div className="card-header">
                      <div>
                        <div className="card-name">✨ Google Gemma 4 (E4B) Instruct</div>
                        <div className="card-spec">Google DeepMind · 4-bit 量化 (Q4_K_M) · 檔案約 5.0 GB · 建議 8GB~16GB 記憶體</div>
                      </div>
                      <div className="card-actions">
                        <button 
                          className="hub-btn primary purple"
                          onClick={() => handleOpenExternal('https://huggingface.co/bartowski/google_gemma-4-E4B-it-GGUF/resolve/main/google_gemma-4-E4B-it-Q4_K_M.gguf?download=true')}
                        >
                          <Download size={13} /> 下載 .gguf (5.0 GB)
                        </button>
                        <button className="hub-btn secondary" onClick={() => handleOpenExternal('https://huggingface.co/models?search=gemma-4-E4B+gguf')}>
                          <ExternalLink size={13} /> 探索版本
                        </button>
                      </div>
                    </div>
                    <div className="pros-cons-box">
                      <div className="pro-item"><b>優點：</b> Google 旗艦架構；詞彙豐富靈動文采佳；具備 128K 超長脈絡，能消化大量複雜背景資料。</div>
                      <div className="con-item"><b>限制：</b> 檔案較大（約 5.0GB）下載需時；記憶體建議 8GB~16GB 以上；速度略慢於 3B。</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hugging Face 社群微調探索 */}
              <div className="modal-info-box">
                <div className="info-title" style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><BookOpen size={16} color="#059669" /> 探索 Hugging Face 社群微調模型（支援自動辨識）</span>
                  <button className="hub-btn secondary sm" onClick={() => handleOpenExternal('https://huggingface.co/models?search=gguf+traditional+chinese')}>
                    <ExternalLink size={12} /> 前往 Hugging Face GGUF 模型庫
                  </button>
                </div>
                <p>
                  <a href="https://huggingface.co" onClick={(e) => { e.preventDefault(); handleOpenExternal('https://huggingface.co'); }} style={{ color: '#2563eb', fontWeight: 600 }}>
                    Hugging Face (https://huggingface.co)
                  </a> 是全球最大開源 AI 平台。本軟體支援<b>動態模型掃描</b>，只要下載相容的 <code>.gguf</code> 檔案並放進共享資料夾，軟體啟動時就會自動列入下拉選單供您直接調度！
                </p>
                <div className="keywords-hint">
                  <b>💡 推薦搜尋關鍵字：</b>
                  <span className="kw-pill">Taiwan-LLM GGUF</span>
                  <span className="kw-pill">Breeze GGUF</span>
                  <span className="kw-pill">Traditional Chinese GGUF</span>
                </div>
              </div>

              {/* 風險提示 */}
              <div className="risk-warning-box">
                <div className="risk-title"><ShieldAlert size={16} color="#b91c1c" /> ⚠️ 第三方與社群微調模型重要使用風險須知</div>
                <ul>
                  <li><b>格式限制：</b> 引擎專為 <code>GGUF</code> 格式設計，請務必下載檔名結尾為 <code>.gguf</code> 的檔案（建議選 <code>Q4_K_M</code> 量化版本）。其他格式如 <code>.safetensors</code> 或 <code>.bin</code> 將無法載入。</li>
                  <li><b>記憶體與閃退風險：</b> 一般個人電腦強烈建議挑選 <b>3B ~ 8B</b> 規模；若嘗試載入 14B、32B 或 70B 等超大模型，可能導致系統記憶體耗盡、介面嚴重卡頓或程式直接崩潰。</li>
                  <li><b>內容安全與幻覺風險：</b> 社群微調模型多由個人上傳，品質與對齊程度不一。非官方微調模型可能含有未過濾之偏見、邏輯錯誤或生成虛構事實（幻覺），建議優先挑選高下載量與口碑良好的知名創作者版本。</li>
                </ul>
              </div>
            </div>

            <div className="hub-modal-footer">
              <button className="hub-btn secondary" onClick={refreshStatus}><RefreshCw size={14}/> 重新掃描模型庫</button>
              <button className="hub-btn primary" onClick={() => setShowGuideModal(false)}>關閉指引</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
