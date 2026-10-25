import React, { useState, useEffect } from 'react';
import { 
  Server, Cpu, RefreshCw, AlertCircle, CheckCircle2, 
  ExternalLink, Sparkles, Download, ArrowRight, ShieldAlert 
} from 'lucide-react';
import './ModelHubManager.css';

const HUB_BASE_URL = 'http://127.0.0.1:51123';

export const HUB_MODELS = [
  {
    id: 'gemma-4-E2B-it-Q4_K_M.gguf',
    name: 'Gemma 4 E2B (Google DeepMind)',
    size: '1.6 GB',
    tag: '極速敏捷 · 耗電極低',
    isDefault: false,
    desc: 'Google 最新旗艦輕量架構，體積極小（僅 1.6GB）秒級加載，日常對話重點萃取敏捷流暢。'
  },
  {
    id: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    name: 'Llama 3.2 (3B) Instruct (Meta)',
    size: '2.0 GB',
    tag: '預設推薦 · 格式嚴謹',
    isDefault: true,
    desc: 'Meta 官方輕量模型，排版格式規範嚴謹、指令遵循度高，家長對話紀錄轉化最穩定。'
  }
];

export default function ModelHubManager({ selectedModel, onSelectModel, onModelReady }) {
  const [hubOnline, setHubOnline] = useState(null); // null (checking) | true | false
  const [modelState, setModelState] = useState(null); // 'checking' | 'ready' | 'not_downloaded' | 'error'
  const [modelMessage, setModelMessage] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [serverInfo, setServerInfo] = useState(null);

  const currentModelId = selectedModel || HUB_MODELS[1].id; // 預設使用 Llama-3.2-3B

  // 1. 檢查 Hub 服務狀態
  const checkHubStatus = async () => {
    setIsChecking(true);
    try {
      const res = await fetch(`${HUB_BASE_URL}/api/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const data = await res.json();
        setHubOnline(true);
        setServerInfo(data);
        await ensureModel(currentModelId);
      } else {
        setHubOnline(false);
        setModelState('error');
        if (onModelReady) onModelReady({ ready: false });
      }
    } catch (e) {
      setHubOnline(false);
      setModelState('error');
      if (onModelReady) onModelReady({ ready: false });
    } finally {
      setIsChecking(false);
    }
  };

  // 2. 向 Hub 確認指定模型
  const ensureModel = async (modelId) => {
    setModelState('checking');
    try {
      const res = await fetch(`${HUB_BASE_URL}/api/ensure-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId, autoLoad: true })
      });
      const data = await res.json();

      if (data.exists === false) {
        setModelState('not_downloaded');
        setModelMessage(data.message || `模型 [${modelId}] 尚未下載。Model Hub 已自動彈出下載確認視窗，請於 Model Hub 中確認下載。`);
        if (onModelReady) onModelReady({ ready: false, modelId });
      } else if (data.ready) {
        setModelState('ready');
        setModelMessage(`模型 [${modelId}] 已於本機 GPU 載入就緒！`);
        if (onModelReady) onModelReady({ ready: true, modelId, modelInfo: data.model });
      } else {
        setModelState('error');
        setModelMessage(data.error || '模型載入失敗，請至 Model Hub 檢查記憶體狀態');
        if (onModelReady) onModelReady({ ready: false, modelId });
      }
    } catch (err) {
      setModelState('error');
      setModelMessage('無法與 Model Hub 通訊：' + err.message);
      if (onModelReady) onModelReady({ ready: false, modelId });
    }
  };

  // 3. 喚醒或開啟 Model Hub
  const handleLaunchHub = async () => {
    if (window.electronAPI?.launchHub) {
      await window.electronAPI.launchHub();
    } else {
      window.open('antigravity-hub://launch', '_self');
    }
    // 稍微延遲後自動重新檢測
    setTimeout(checkHubStatus, 2500);
  };

  useEffect(() => {
    checkHubStatus();
  }, [currentModelId]);

  return (
    <div className="hub-connector-card">
      {/* 伺服器狀態條 */}
      <div className="hub-status-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Server size={18} color={hubOnline ? '#10B981' : '#9CA3AF'} />
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>Antigravity Model Hub</span>
          <span className={`status-pill ${hubOnline ? 'online' : 'offline'}`}>
            {hubOnline ? '🟢 已連線 (127.0.0.1:51123)' : '⚪ 未連線'}
          </span>
          {serverInfo?.gpuEngine && (
            <span style={{ fontSize: '0.75rem', background: '#F3F4F6', color: '#4B5563', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              ⚡ {serverInfo.gpuEngine}
            </span>
          )}
        </div>
        <div>
          <button 
            type="button" 
            onClick={checkHubStatus} 
            disabled={isChecking}
            className="hub-icon-btn" 
            title="重新整理連線狀態"
          >
            <RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 若未連線提示開啟 Hub */}
      {hubOnline === false && (
        <div className="hub-warn-card">
          <AlertCircle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1, fontSize: '0.85rem' }}>
            <p style={{ fontWeight: 700, color: '#92400E', margin: '0 0 0.35rem 0' }}>未偵測到本機模型管理系統正在運行</p>
            <p style={{ color: '#B45309', margin: '0 0 0.75rem 0', lineHeight: 1.5 }}>
              本專案直接串接本機「Antigravity Model Hub」進行高效率推論。請確認已開啟 <b>Antigravity Model Hub.app</b>，或點擊下方按鈕進行自動喚醒：
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

      {/* 模型切換與狀態展示 */}
      {hubOnline && (
        <div style={{ marginTop: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            選擇目標推論模型（由 Model Hub 統一管理與硬體加速）
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
            {HUB_MODELS.map((m) => {
              const isSelected = m.id === currentModelId;
              return (
                <div 
                  key={m.id}
                  onClick={() => onSelectModel && onSelectModel(m.id)}
                  className={`model-option-card ${isSelected ? 'selected' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1F2937' }}>{m.name}</span>
                    <span style={{ fontSize: '0.75rem', background: isSelected ? '#DBEAFE' : '#F3F4F6', color: isSelected ? '#1E40AF' : '#4B5563', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>{m.size}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: isSelected ? '#2563EB' : '#10B981', fontWeight: 600, marginBottom: '0.25rem' }}>{m.tag}</div>
                  <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0, lineHeight: 1.4 }}>{m.desc}</p>
                </div>
              );
            })}
          </div>

          {/* 模型狀態回饋 */}
          {modelState === 'checking' && (
            <div className="hub-note-badge checking">
              <RefreshCw size={14} className="animate-spin" color="#4F46E5" />
              <span>正在向 Model Hub 確認 <b>{currentModelId}</b> 載入狀態...</span>
            </div>
          )}

          {modelState === 'not_downloaded' && (
            <div className="hub-warn-card info">
              <Download size={20} color="#2563EB" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1, fontSize: '0.85rem' }}>
                <p style={{ fontWeight: 700, color: '#1E40AF', margin: '0 0 0.25rem 0' }}>模型尚未下載</p>
                <p style={{ color: '#1D4ED8', margin: '0 0 0.5rem 0', lineHeight: 1.5 }}>
                  Model Hub 已在螢幕上彈出下載確認視窗！請前往確認下載完成後，點擊下方按鈕以就緒。
                </p>
                <button 
                  type="button" 
                  onClick={() => ensureModel(currentModelId)} 
                  className="hub-btn-blue"
                >
                  <RefreshCw size={13} /> 檢查下載進度並啟動
                </button>
              </div>
            </div>
          )}

          {modelState === 'ready' && (
            <div style={{ marginTop: '0.75rem' }}>
              <div className="hub-note-badge ready">
                <CheckCircle2 size={16} color="#059669" />
                <span style={{ fontWeight: 600, color: '#065F46' }}>
                  模型已於本機 GPU 載入就緒！
                </span>
              </div>
              <button 
                type="button"
                onClick={() => {
                  const confirmed = window.confirm("⚠️ 注意：離線模型處理效能有限，彙整資訊與原意可能有差異，請反覆確認才做使用。強烈建議以「雲端API模式」為優先使用。\n\n您確定要繼續使用本機模型嗎？");
                  if (confirmed && onModelReady) {
                    onModelReady({ ready: true, modelId: currentModelId, proceed: true });
                  }
                }}
                className="hub-btn-proceed"
              >
                <span>確認啟用此模型並開始記錄轉換</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {modelState === 'error' && (
            <div className="hub-warn-card error">
              <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1, fontSize: '0.85rem' }}>
                <p style={{ fontWeight: 700, color: '#991B1B', margin: '0 0 0.25rem 0' }}>連線或載入異常</p>
                <p style={{ color: '#B91C1C', margin: 0 }}>{modelMessage}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
