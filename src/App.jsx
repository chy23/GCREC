import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { UploadCloud, FileText, Check, Copy, AlertCircle, Settings, History, X, Inbox, Highlighter, Cpu, CloudLightning } from 'lucide-react';
import { CreateMLCEngine } from '@mlc-ai/web-llm';
import './index.css';

import CHANGELOG from './changelog.json';

const SYSTEM_PROMPT = `你是一位心思細密、教學態度嚴謹、行政紀錄極具專業感的國小班導師。你的任務是將使用者提供的家長與老師對話紀錄（例如通訊軟體匯出的 CSV 檔案或聊天文字）進行重點節錄，轉化為客觀、標準化的「親師訪談紀錄表」。

# 核心工作原則
1. **日期篩選**：預設僅截取從 **2026/02/20 之後** 的對話資訊（除非使用者有特別指定其他時間）。
2. **輔導內容要點**：請根據該次溝通的核心主題，精煉出一句清晰的摘要作為「標題」。
3. **聯絡事項 -【事件紀錄】（極重要）**：
   - 僅能截取教師客觀陳述的學生具體表現、校內行為、課堂反應、態度或語氣。
   - 絕對「不要」記錄老師個人的主觀感受、感想、個人評論或情緒性字眼（例如：將「實在令人擔心」、「不可取」等情緒字眼剔除，僅保留、重塑為客觀事實表現）。
4. **聯絡事項 -【家長回應】**：
   - 如實記錄家長的回應、解釋、態度或提出的配合事項。
   - 抱持客觀過程記錄，絕對「不做任何動機或心理推論」。

# 批量上傳與獨立計數規則
當使用者一次上傳多份紀錄、多個 CSV 檔案或包含多位學生的資料時，你必須嚴格執行以下排版邏輯：
1. **明確區塊分隔**：不同學生之間，必須使用非常清晰的大分隔線隔開，並標明學生姓名與該生總紀錄筆數。
2. **紀錄次數獨立計算**：每位學生的紀錄編號必須「各自獨立從 1 開始計算」（例如：學生 A 有 21 筆紀錄，編號為 1~21；緊接著的學生 B 有 7 筆紀錄，編號必須歸零重新計算為 1~7），絕對不可跨學生跨檔案連續累加。

# 輸出格式要求（專為 Google 文件/Word 設計）
所有紀錄必須設計成「方便使用者直接複製、貼上至 Google 文件或 Word 且排版完美不雜亂」的純文字格式。
絕對【不要】輸出任何 Markdown 語法符號（例如：星號 '*' 或井字號 '#'），請維持乾淨的純文字。請嚴格依循下方結構進行輸出：

======================================================================
【 [學生座號與姓名] - 親師訪談紀錄檔案，共 [該生獨立計算之總筆數] 筆 】
======================================================================

紀錄 [該生獨立編號]
訪談方式：[根據對話內容判斷，例如：通訊軟體 / 電話 / 本人對談 / 聯絡簿 / 其他]
訪談對象：[學生姓名]家長（媽媽/爸爸/監護人）
訪談日期：YYYY/MM/DD（若該事件跨越數日對話，請寫日期區間，如 YYYY/MM/DD - MM/DD）
輔導內容要點：[精煉後的核心主題標題]
聯絡事項：
　事件紀錄：[客觀陳述教師告知的事實與學生的行為反應，文字去情緒化]
　家長回應：[如實記錄家長的回覆與互動過程，不做推論]

----------------------------------------------------------------------
（以上紀錄格式依該生對話次數重複。該生結束後，再使用等號線切換至下一位學生）

# 異常與安全處理
- 若對話中缺乏家長回應，請在該欄位寫「此段事件於對話紀錄中無家長當日之回覆」，不可憑空捏造。
- 遇有資訊不具體或模糊之處，請引導使用者補充，切勿自行推論。

以下為對話紀錄：\n`;

function App() {
  const [apiKey, setApiKey] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chunkProgress, setChunkProgress] = useState('');
  const [result, setResult] = useState('');
  const [viewMode, setViewMode] = useState('highlight');
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(() => {
    try { return localStorage.getItem('has_seen_guide') !== 'true'; }
    catch(e) { return true; }
  });
  const [engineMode, setEngineMode] = useState('setup'); // 'setup', 'api', 'local'
  const [mlcEngine, setMlcEngine] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [isModelLoading, setIsModelLoading] = useState(false);
  const fileInputRef = useRef(null);

  const initWebLLM = async () => {
    setIsModelLoading(true);
    setEngineMode('local');
    setDownloadProgress('正在初始化引擎，請稍候...');

    const translateProgress = (text) => {
      if (!text) return '';
      let zh = text;
      zh = zh.replace(/Loading model from cache/g, '從快取載入模型');
      zh = zh.replace(/Fetching param cache/g, '正在下載模型');
      zh = zh.replace(/loaded\./g, '已載入。');
      zh = zh.replace(/fetched\./g, '已下載。');
      zh = zh.replace(/completed,/g, '完成，耗時');
      zh = zh.replace(/secs elapsed\./g, '秒。');
      zh = zh.replace(/Start to fetch params/g, '開始準備模型檔案...');
      zh = zh.replace(/Finish loading on WebGPU/g, '本機模型載入完成！');
      return zh;
    };

    try {
      // 使用支援度極佳、中文能力不錯且小巧的 Qwen2.5 模型
      const engine = await CreateMLCEngine(
        'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
        {
          initProgressCallback: (progress) => {
            setDownloadProgress(translateProgress(progress.text));
          }
        }
      );
      setMlcEngine(engine);
      setDownloadProgress('');
      setIsApiKeySet(true); // 設定為準備就緒
    } catch (error) {
      console.error(error);
      alert("初始化本地模型失敗。您的瀏覽器可能不支援 WebGPU，或記憶體不足。請使用最新版 Chrome 或改用雲端 API 模式。\\n錯誤訊息: " + error.message);
      setEngineMode('setup');
    } finally {
      setIsModelLoading(false);
    }
  };

  const closeGuide = () => {
    try { localStorage.setItem('has_seen_guide', 'true'); } catch(e) {}
    setShowGuide(false);
  };

  const handleApiKeyChange = (e) => {
    setApiKey(e.target.value);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const csvFiles = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv') || f.name.endsWith('.txt'));
      setFiles(prev => [...prev, ...csvFiles]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const csvFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...csvFiles]);
    }
  };



  const renderHighlightedText = (text) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.includes('====') || line.includes('----')) {
        return <div key={idx} className="highlight-separator">{line}</div>;
      }
      
      const keywords = ['訪談方式：', '訪談對象：', '訪談日期：', '輔導內容要點：', '聯絡事項：', '事件紀錄：', '家長回應：'];
      for (const kw of keywords) {
        if (line.includes(kw)) {
          const parts = line.split(kw);
          return (
            <div key={idx}>
              {parts[0]}<span className="highlight-keyword">{kw}</span>{parts[1]}
            </div>
          );
        }
      }
      
      if (line.startsWith('【') && line.endsWith('】')) {
        return <div key={idx} style={{ color: '#60A5FA', fontWeight: 'bold', margin: '1rem 0' }}>{line}</div>;
      }
      return <div key={idx}>{line || ' '}</div>;
    });
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (engineMode === 'api' && !apiKey) {
      alert("請先輸入 Gemini API Key");
      return;
    }
    if (engineMode === 'local' && !mlcEngine) {
      alert("本地端模型尚未準備完成");
      return;
    }
    if (files.length === 0) {
      alert("請上傳至少一個 CSV 檔案");
      return;
    }

    setIsProcessing(true);
    setChunkProgress('');
    setResult('');

    try {
      let combinedData = '';
      
      for (const file of files) {
        combinedData += `--- 檔案：${file.name} ---\n`;
        const text = await file.text();
        combinedData += text + '\n\n';
      }

      if (engineMode === 'local') {
        try {
          console.log('開始本地端推理...');
          
          // 本地模型 Context Window 有限 (通常 4096)，必須將巨量文本分塊 (Chunking)
          const lines = combinedData.split('\n');
          const maxLinesPerChunk = 150; // 每次處理約 150 行對話，避免超過 Token 限制
          const chunks = [];
          for (let i = 0; i < lines.length; i += maxLinesPerChunk) {
            chunks.push(lines.slice(i, i + maxLinesPerChunk).join('\n'));
          }
          
          let fullResult = "";
          for (let i = 0; i < chunks.length; i++) {
            setChunkProgress(`處理進度: ${i+1} / ${chunks.length}`);
            console.log(`處理本地區塊 ${i+1}/${chunks.length}`);
            
            const reply = await mlcEngine.chat.completions.create({
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `這是第 ${i+1}/${chunks.length} 部分的對話紀錄，請依照系統提示進行轉換：\n\n` + chunks[i] }
              ],
              temperature: 0.1,
            });
            fullResult += reply.choices[0].message.content + "\n\n";
          }
          
          generatedText = fullResult;
          console.log('本地端推理完成');
        } catch (err) {
          throw new Error("本地模型推理失敗: " + err.message);
        }
      } else {
        const modelsToTry = [
          'gemini-3.7-flash',
          'gemini-3.6-flash',
          'gemini-3.5-flash',
          'gemini-3.1-pro-preview'
        ];

        for (const model of modelsToTry) {
          try {
            console.log(`嘗試使用模型: ${model}`);
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [{ text: SYSTEM_PROMPT + combinedData }]
                  }
                ]
              })
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error?.message || `模型 ${model} 呼叫失敗`);
            }

            const data = await response.json();
            generatedText = data.candidates[0].content.parts[0].text;
            console.log(`模型 ${model} 成功產出結果`);
            break; // 成功則跳出迴圈，不再嘗試下一個模型
          } catch (error) {
            console.warn(`模型 ${model} 失敗:`, error.message);
            lastError = error;
            // 繼續下一次迴圈嘗試下一個模型
          }
        }

        if (!generatedText) {
          throw new Error(`所有模型皆嘗試失敗。最後錯誤: ${lastError.message}`);
        }
      }

      setResult(generatedText);

    } catch (error) {
      console.error(error);
      alert("處理過程中發生錯誤: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="app-container">
      <div className="header" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => setShowSettings(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}
          >
            <Settings size={18} /> 設定
          </button>
          <button 
            onClick={() => setShowChangelog(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}
          >
            <History size={18} /> 更新紀錄
          </button>
        </div>
        <h1>教師輔導紀錄小幫手</h1>
        <p>一鍵將對話紀錄轉化為標準化的親師訪談紀錄表</p>
      </div>

      <div className="main-layout">
        {/* Left Column: Upload */}
        <div className="layout-col">

        {engineMode === 'setup' && (
          <div className="glass-card" style={{ border: '2px solid var(--primary)' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
              <Cpu size={24} />
              選擇您的 AI 運算引擎
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div 
                className="engine-option-card"
                onClick={() => setEngineMode('api')}
                style={{ p: 2, border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.5rem', cursor: 'pointer', background: 'rgba(255,255,255,0.9)', transition: 'all 0.2s' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <CloudLightning size={24} color="#4F46E5" />
                  <h4 style={{ margin: 0, fontSize: '1.1rem' }}>雲端 API 模式 <span style={{ fontSize: '0.8rem', background: '#DBEAFE', color: '#1E40AF', padding: '0.2rem 0.5rem', borderRadius: '4px', marginLeft: '0.5rem' }}>推薦</span></h4>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
                  使用 Google 強大的 Gemini 伺服器進行轉換。速度極快、排版最精確，且任何舊電腦或手機皆可使用。<strong>需自備 API Key。</strong>
                </p>
              </div>

              <div 
                className="engine-option-card"
                onClick={initWebLLM}
                style={{ p: 2, border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.5rem', cursor: 'pointer', background: 'rgba(255,255,255,0.9)', transition: 'all 0.2s' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <Cpu size={24} color="#10B981" />
                  <h4 style={{ margin: 0, fontSize: '1.1rem' }}>本機離線模式 <span style={{ fontSize: '0.8rem', background: '#D1FAE5', color: '#065F46', padding: '0.2rem 0.5rem', borderRadius: '4px', marginLeft: '0.5rem' }}>實驗性</span></h4>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
                  直接下載 AI 模型 (約 1.5GB) 到瀏覽器中執行。資料絕對保密，完全離線免費。<strong>【硬體建議】建議使用最新版 Chrome 或 Edge 瀏覽器，且電腦具備至少 8GB 記憶體與獨立顯示卡。若硬體效能較低，處理速度可能會較為緩慢（暫不支援 Safari 與手機）。</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {engineMode === 'local' && isModelLoading && (
          <div className="glass-card" style={{ border: '2px solid var(--secondary)', textAlign: 'center' }}>
            <Cpu size={32} color="var(--secondary)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '1rem', color: 'var(--secondary)' }}>正在為您下載並載入本機模型...</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              這會需要幾分鐘的時間，且取決於您的網路速度。<br/>若您的電腦沒有足夠的記憶體或未支援 WebGPU，載入可能會失敗。
            </p>
            <div style={{ background: '#F3F4F6', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', color: '#4B5563', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {downloadProgress}
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ marginTop: '1.5rem' }}
              onClick={() => {
                setEngineMode('setup');
                setIsModelLoading(false);
              }}
            >
              取消並返回
            </button>
          </div>
        )}

        {engineMode === 'api' && !isApiKeySet && (
          <div className="glass-card" style={{ border: '2px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', margin: 0 }}>
                <Settings size={20} />
                第一步：設定 API Key
              </h3>
              <button 
                onClick={() => setEngineMode('setup')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
              >
                返回選擇引擎
              </button>
            </div>
            <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
              為了讓 AI 替您產出紀錄，請先輸入您的 Gemini API Key。設定完成後此欄位將會自動隱藏，未來可至右上角「設定」中修改。
            </p>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <input 
                type="password" 
                className="input-field" 
                placeholder="輸入您的 Gemini API Key..." 
                value={apiKey}
                onChange={handleApiKeyChange}
              />
            </div>
            <button 
              className="btn" 
              onClick={() => {
                if(apiKey.trim().length > 10) {
                  setIsApiKeySet(true);
                } else {
                  alert("請輸入有效的 API Key");
                }
              }}
              disabled={!apiKey.trim()}
            >
              完成設定並繼續
            </button>
          </div>
        )}

        {isApiKeySet && !isModelLoading && (
        <div className="glass-card">
        <div className="form-group">
          <label>上傳對話紀錄 (支援 CSV 或 TXT)</label>
          <div 
            className={`dropzone ${isDragging ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
          >
            <UploadCloud className="dropzone-icon" />
            <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>點擊或拖曳檔案至此處</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>支援多個檔案同時上傳</p>
            <input 
              type="file" 
              multiple 
              accept=".csv,.txt"
              style={{ display: 'none' }} 
              ref={fileInputRef}
              onChange={handleFileSelect}
            />
          </div>
        </div>

        {files.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>已選擇的檔案 ({files.length})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {files.map((f, idx) => (
                <div key={idx} className="file-card">
                  <div className="file-card-info">
                    <div className="file-card-icon">
                      <FileText size={20} />
                    </div>
                    <div className="file-card-meta">
                      <h5>{f.name}</h5>
                      <span>{(f.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                  <button className="file-card-remove" onClick={() => removeFile(idx)} title="移除檔案">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button className="btn" onClick={processFiles} disabled={isProcessing || files.length === 0}>
            {isProcessing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="loader"></div>
                  處理中...
                </div>
                {chunkProgress && <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>{chunkProgress}</div>}
              </div>
            ) : (
              '開始轉換紀錄'
            )}
          </button>
        </div>
        </div>
        )}
        </div>

        {/* Right Column: Results / Skeleton / Empty State */}
        <div className="layout-col">
          <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {isProcessing ? (
              <div style={{ flex: 1 }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <AlertCircle size={20} color="var(--primary)" />
                  AI 正在努力撰寫中...
                </h3>
                <div className="skeleton-container">
                  <div className="skeleton-header">
                    <div className="skeleton-avatar"></div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div className="skeleton-line w-40"></div>
                      <div className="skeleton-line w-60"></div>
                    </div>
                  </div>
                  <div className="skeleton-line w-100"></div>
                  <div className="skeleton-line w-100"></div>
                  <div className="skeleton-line w-80"></div>
                  <br/>
                  <div className="skeleton-line w-100"></div>
                  <div className="skeleton-line w-60"></div>
                </div>
              </div>
            ) : result ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
                <div className="results-header-bar">
                  <div className="results-header-left">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, whiteSpace: 'nowrap' }}>
                      <AlertCircle size={20} color="var(--secondary)" />
                      轉換結果
                    </h3>
                    
                    <div className="view-mode-selector">
                      <button className={`view-mode-btn ${viewMode === 'highlight' ? 'active' : ''}`} onClick={() => setViewMode('highlight')}><Highlighter size={16}/> 重點高亮</button>
                      <button className={`view-mode-btn ${viewMode === 'document' ? 'active' : ''}`} onClick={() => setViewMode('document')}><FileText size={16}/> A4 預覽</button>
                    </div>
                  </div>

                  <button className="btn btn-secondary" onClick={copyToClipboard} style={{ flexShrink: 0 }}>
                    {copied ? <Check size={18} color="var(--secondary)" /> : <Copy size={18} />}
                    {copied ? '已複製！' : '複製純文字 (Word)'}
                  </button>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  {viewMode === 'highlight' && (
                    <div className="highlight-view">{renderHighlightedText(result)}</div>
                  )}
                  {viewMode === 'document' && (
                    <div className="a4-document-view">{result}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Inbox size={32} />
                </div>
                <h3>等待檔案上傳中</h3>
                <p>上傳您的對話紀錄檔案後，精美的訪談紀錄表就會顯示在這裡。</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={24} color="var(--primary)" />
                系統設定
              </h2>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color="var(--text-muted)" />
              </button>
            </div>
            
            <div className="form-group">
              <label>Gemini API Key</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="輸入您的 Gemini API Key..." 
                value={apiKey}
                onChange={handleApiKeyChange}
              />
              <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem', lineHeight: '1.5' }}>
                *基於極致的隱私安全，您的 API Key 絕對不會被儲存，每次重新載入網頁皆須重新輸入。<br/>
                *如果您發現無法轉換，請檢查您的 Key 是否正確或額度已滿。
              </small>
            </div>
            
            <div className="modal-actions" style={{ marginTop: '2rem' }}>
              <button className="btn" onClick={() => setShowSettings(false)}>儲存並關閉</button>
            </div>
          </div>
        </div>
      )}

      {showGuide && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>歡迎使用「教師輔導紀錄小幫手」</h2>
            <p>這個工具能幫您把雜亂的家長對話紀錄，自動整理成專業的「親師訪談紀錄表」。</p>
            
            <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>操作步驟四部曲：</h3>
            <ol style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', lineHeight: '1.8' }}>
              <li>
                <strong>設定 API Key：</strong>為了自動「擷取重點」與「客觀化」，本系統採用 Google Gemini AI。請前往 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a> 申請 API Key 並填入。（基於隱私安全，API Key <strong>不會被儲存</strong>，每次開啟網頁皆須重新輸入）
              </li>
              <li>
                <strong>匯出對話紀錄：</strong>請將通訊軟體（如 LINE）中的家長對話紀錄匯出為 <strong>CSV</strong> 或 <strong>TXT 文字檔</strong>。
              </li>
              <li>
                <strong>上傳檔案：</strong>點擊或直接將一個/多個對話檔案拖曳至網頁的「上傳對話紀錄」區塊中。
              </li>
              <li>
                <strong>一鍵轉換：</strong>點擊「開始轉換紀錄」，系統便會自動為每位學生產生一份排版完美的訪談紀錄，您可以直接一鍵複製到 Google 文件 (Google Docs) 中！
              </li>
            </ol>
            <div className="modal-actions">
              <button className="btn" onClick={closeGuide}>我了解了，開始使用</button>
            </div>
          </div>
        </div>
      )}

      {showChangelog && (
        <div className="modal-overlay" onClick={() => setShowChangelog(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>系統更新紀錄</h2>
            <div className="changelog-list">
              {CHANGELOG.map((log, index) => (
                <div key={index} className="changelog-item">
                  <div className="changelog-version">
                    <span className="badge">{log.version}</span>
                    <span className="changelog-date">{log.date}</span>
                  </div>
                  <div className="changelog-title">{log.title}</div>
                  <div className="changelog-details">{log.details}</div>
                  {log.bugs && log.bugs !== "無" && (
                    <div className="changelog-bugs"><strong>🐛 Bug 修復：</strong>{log.bugs}</div>
                  )}
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowChangelog(false)}>關閉</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
