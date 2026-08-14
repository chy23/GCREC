import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const recordDelimiter = '<END_COMMIT>';
const fieldDelimiter = '|||';
const gitCommand = `git log -n 50 --pretty=format:"%h${fieldDelimiter}%cd${fieldDelimiter}%s${fieldDelimiter}%b${recordDelimiter}" --date=short`;

const TRANSLATIONS = {
  "bff66b3": { title: "修復更新紀錄讀取問題", details: "強制伺服器在部署時抓取完整的 Git 歷史紀錄，解決更新紀錄只顯示一筆的問題。", bugs: "修復更新紀錄抓取不到過去歷史的問題" },
  "b46ff37": { title: "全自動更新紀錄系統", details: "新增自動化腳本，在每次部署時自動抓取 Git 歷史紀錄並產生系統更新日誌。", bugs: "無" },
  "24a8e17": { title: "新增更新紀錄介面", details: "在畫面右上角加入「更新紀錄」按鈕，並設計彈出視窗以展示歷來更新標題、細節、修復項目與版本號。", bugs: "無" },
  "059e245": { title: "實作模型自動備援機制", details: "依序設定 4 個 Gemini 模型 (3.5-flash -> 3.6-flash -> 3.7-flash -> 3.1-pro-preview)，若呼叫失敗會自動無縫切換，確保服務穩定。", bugs: "無" },
  "5ea113c": { title: "優化初次使用說明", details: "移除 API Key 說明中的「免費」字眼，避免使用者誤解超出額度後的收費機制。", bugs: "無" },
  "f01dd4b": { title: "修復畫面空白錯誤", details: "補回遺失的拖曳狀態變數，解決 React 執行時期發生的嚴重崩潰錯誤。", bugs: "修復遺失變數造成的畫面空白問題" },
  "724fd3f": { title: "增強本機儲存安全性", details: "將 localStorage 的存取包裝上 try-catch 防護，避免無痕模式或阻擋 cookie 時造成網頁白畫面。", bugs: "修復嚴格隱私模式下的崩潰問題" },
  "2850bde": { title: "新增檔案上傳教學", details: "在初次使用說明中，補上四部曲教學，清楚引導使用者匯出與上傳檔案的方式。", bugs: "無" },
  "c7e1380": { title: "新增初次使用教學視窗", details: "當使用者第一次開啟網頁時，自動跳出教學視窗，解釋 API Key 的用途與安全性。", bugs: "無" },
  "fff2475": { title: "補齊遺失的依賴套件", details: "在 package.json 中補上 papaparse 與 lucide-react 套件，解決雲端部署時的編譯失敗。", bugs: "修復 Rollup/Vite 編譯失敗的問題" },
  "fa70295": { title: "修復編譯語法錯誤", details: "修正 App.jsx 中不合法的字串跳脫字元，解決 Vite 無法成功編譯的問題。", bugs: "修復不合法的跳脫字元錯誤" },
  "aeff83f": { title: "設定自動化雲端部署", details: "加入 GitHub Actions (deploy.yml)，達成只要推送程式碼就會自動部署至 GitHub Pages 的流程。", bugs: "無" },
  "98874b6": { title: "修正網頁 Base URL", details: "在 vite.config.js 中正確設定 base 路徑，解決 GitHub Pages 找不到資源檔的問題。", bugs: "修復 GitHub Pages 路徑錯誤導致 404 的問題" },
  "8c684bb": { title: "專案核心功能建置", details: "教師輔導紀錄小幫手雛形完成。支援 CSV/TXT 解析，並串接 Gemini AI 產出客觀訪談紀錄。", bugs: "無" },
  "5e363c2": { title: "上傳初始檔案", details: "建立初始 Git 儲存庫與資料夾結構。", bugs: "無" }
};

try {
  const output = execSync(gitCommand, { encoding: 'utf-8' });
  const commits = output.split(recordDelimiter).map(c => c.trim()).filter(Boolean);
  
  const changelog = commits.map(commit => {
    const parts = commit.split(fieldDelimiter);
    if (parts.length < 3) return null;
    
    const hash = parts[0];
    const date = parts[1];
    const title = parts[2];
    const body = parts.slice(3).join(fieldDelimiter).trim();
    
    const fullMessage = (title + ' ' + body).toLowerCase();
    
    let bugs = "無";
    if (fullMessage.includes('fix') || fullMessage.includes('bug') || fullMessage.includes('修復') || fullMessage.includes('修正')) {
      bugs = "系統修正：" + title;
    }

    let finalTitle = title;
    let finalDetails = body ? body : "常規系統更新或效能優化";
    let finalBugs = bugs;

    if (TRANSLATIONS[hash]) {
      finalTitle = TRANSLATIONS[hash].title;
      finalDetails = TRANSLATIONS[hash].details;
      finalBugs = TRANSLATIONS[hash].bugs;
    }

    return {
      version: `v-${hash}`,
      date: date,
      title: finalTitle,
      details: finalDetails,
      bugs: finalBugs
    };
  }).filter(Boolean);

  const outputPath = path.join(process.cwd(), 'src', 'changelog.json');
  fs.writeFileSync(outputPath, JSON.stringify(changelog, null, 2));
  console.log('Changelog generated successfully at src/changelog.json');
} catch (error) {
  console.error('Error generating changelog:', error);
}
