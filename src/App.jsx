import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { UploadCloud, FileText, Check, Copy, AlertCircle, Settings, History } from 'lucide-react';
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

# 輸出格式要求（專為 Google 文件設計）
所有紀錄必須設計成「方便使用者直接複製、貼上至 Google 文件（Google Docs）且排版完美不雜亂」的格式。請嚴格依循下方結構進行多檔案/多學生的輸出：

======================================================================
【 [學生座號與姓名] - 親師訪談紀錄檔案，共 [該生獨立計算之總筆數] 筆 】
======================================================================

#### **紀錄 [該生獨立編號]**
*   **訪談方式**：[根據對話內容判斷，例如：通訊軟體 / 電話 / 本人對談 / 聯絡簿 / 其他]
*   **訪談對象**：[學生姓名]家長（媽媽/爸爸/監護人）
*   **訪談日期**：YYYY/MM/DD（若該事件跨越數日對話，請寫日期區間，如 YYYY/MM/DD - MM/DD）
*   **輔導內容要點**：[精煉後的核心主題標題]
*   **聯絡事項**：
    *   **事件紀錄**：[客觀陳述教師告知的事實與學生的行為反應，文字去情緒化]
    *   **家長回應**：[如實記錄家長的回覆與互動過程，不做推論]

----------------------------------------------------------------------
（以上紀錄格式依該生對話次數重複。該生結束後，再使用等號線切換至下一位學生）

# 異常與安全處理
- 若對話中缺乏家長回應，請在該欄位寫「此段事件於對話紀錄中無家長當日之回覆」，不可憑空捏造。
- 遇有資訊不具體或模糊之處，請引導使用者補充，切勿自行推論。

以下為對話紀錄：\n`;

function App() {
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem('gemini_api_key') || ''; }
    catch(e) { return ''; }
  });
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showGuide, setShowGuide] = useState(() => {
    try { return localStorage.getItem('has_seen_guide') !== 'true'; }
    catch(e) { return true; }
  });
  const fileInputRef = useRef(null);

  const closeGuide = () => {
    try { localStorage.setItem('has_seen_guide', 'true'); } catch(e) {}
    setShowGuide(false);
  };

  const handleApiKeyChange = (e) => {
    const val = e.target.value;
    setApiKey(val);
    try { localStorage.setItem('gemini_api_key', val); } catch(e) {}
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

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (!apiKey) {
      alert("請先輸入 Gemini API Key");
      return;
    }
    if (files.length === 0) {
      alert("請上傳至少一個 CSV 檔案");
      return;
    }

    setIsProcessing(true);
    setResult('');

    try {
      let combinedData = '';
      
      for (const file of files) {
        combinedData += `--- 檔案：${file.name} ---\n`;
        const text = await file.text();
        combinedData += text + '\n\n';
      }

      const modelsToTry = [
        'gemini-3.5-flash',
        'gemini-3.6-flash',
        'gemini-3.7-flash',
        'gemini-3.1-pro-preview'
      ];

      let generatedText = null;
      let lastError = null;

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
        <button 
          onClick={() => setShowChangelog(true)}
          style={{ position: 'absolute', top: 0, right: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}
        >
          <History size={18} /> 更新紀錄
        </button>
        <h1>教師輔導紀錄小幫手</h1>
        <p>一鍵將對話紀錄轉化為標準化的親師訪談紀錄表</p>
      </div>

      <div className="glass-card">
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={20} color="var(--text-muted)" />
          <label style={{ margin: 0 }}>設定 Gemini API Key</label>
        </div>
        <div className="form-group">
          <input 
            type="password" 
            className="input-field" 
            placeholder="輸入您的 Gemini API Key..." 
            value={apiKey}
            onChange={handleApiKeyChange}
          />
          <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>
            *API Key 會儲存在您的瀏覽器中，不會上傳至任何伺服器。
          </small>
        </div>
      </div>

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
            <h4 style={{ marginBottom: '1rem' }}>已選擇的檔案：</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {files.map((f, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.6)', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={18} color="var(--primary)" />
                    <span>{f.name}</span>
                  </div>
                  <button onClick={() => removeFile(idx)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontWeight: 500 }}>
                    移除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button className="btn" onClick={processFiles} disabled={isProcessing || files.length === 0}>
            {isProcessing ? (
              <>
                <div className="loader"></div>
                處理中...
              </>
            ) : (
              '開始轉換紀錄'
            )}
          </button>
        </div>
      </div>

      {(result || isProcessing) && (
        <div className="glass-card" style={{ scrollMarginTop: '2rem' }} id="result-section">
          <div className="action-bar">
            <h3 style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={20} color="var(--secondary)" />
              轉換結果
            </h3>
            <button className="btn btn-secondary" onClick={copyToClipboard} disabled={!result}>
              {copied ? <Check size={18} color="var(--secondary)" /> : <Copy size={18} />}
              {copied ? '已複製！' : '複製到 Google 文件'}
            </button>
          </div>
          <textarea 
            className="result-area" 
            value={result} 
            readOnly
            placeholder={isProcessing ? "AI 正在為您彙整資料，這可能需要幾十秒鐘的時間..." : ""}
          ></textarea>
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
                <strong>設定 API Key：</strong>為了自動「擷取重點」與「客觀化」，本系統採用 Google Gemini AI。請前往 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a> 申請 API Key 並填入。（您的資料與 Key <strong>只會存在本機瀏覽器</strong>，絕無外流風險）
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
