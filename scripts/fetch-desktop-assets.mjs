// 下載桌面版所需的 llama-server 執行檔與 GGUF 模型。
// 用法：node scripts/fetch-desktop-assets.mjs [lite|full]
// 已存在且大小正確的檔案會自動略過；中斷後重跑會續傳 (curl -C -)。
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const DESKTOP = path.join(ROOT, 'desktop');
const CACHE = path.join(DESKTOP, '.cache');
const LLAMA_TAG = 'b11774';

const BINARIES = [
  {
    dir: 'mac-arm64',
    url: `https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_TAG}/llama-${LLAMA_TAG}-bin-macos-arm64.tar.gz`,
    archive: 'tar',
  },
  {
    dir: 'win-x64',
    url: `https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_TAG}/llama-${LLAMA_TAG}-bin-win-vulkan-x64.zip`,
    archive: 'zip',
  },
];

const edition = process.argv[2] || 'lite';
const manifest = JSON.parse(fs.readFileSync(path.join(DESKTOP, 'editions', `${edition}.json`), 'utf-8'));

const curl = (url, out) => {
  execFileSync('curl', ['-L', '--fail', '--retry', '5', '-C', '-', '-o', out, url], { stdio: 'inherit' });
};

fs.mkdirSync(CACHE, { recursive: true });

// 1. llama-server 執行檔
for (const bin of BINARIES) {
  const target = path.join(DESKTOP, 'bin', bin.dir);
  const exe = path.join(target, bin.dir.startsWith('win') ? 'llama-server.exe' : 'llama-server');
  if (fs.existsSync(exe)) {
    console.log(`✓ 已存在 ${path.relative(ROOT, exe)}`);
    continue;
  }
  const archivePath = path.join(CACHE, path.basename(bin.url));
  console.log(`↓ 下載 ${bin.url}`);
  curl(bin.url, archivePath);
  const extractDir = path.join(CACHE, `extract-${bin.dir}`);
  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });
  if (bin.archive === 'tar') execFileSync('tar', ['-xzf', archivePath, '-C', extractDir]);
  else execFileSync('unzip', ['-q', archivePath, '-d', extractDir]);

  // 找到 llama-server 所在資料夾，將整個資料夾 (含動態函式庫) 複製到 target
  const findServer = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = findServer(p);
        if (found) return found;
      } else if (entry.name === 'llama-server' || entry.name === 'llama-server.exe') {
        return dir;
      }
    }
    return null;
  };
  const serverDir = findServer(extractDir);
  if (!serverDir) throw new Error(`在 ${bin.url} 中找不到 llama-server`);
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(serverDir, target, { recursive: true, verbatimSymlinks: true });
  // 只保留執行所需檔案，移除其他 CLI 工具以縮小安裝檔
  for (const f of fs.readdirSync(target)) {
    const keep = /^llama-server(\.exe)?$/.test(f) || /\.(dylib|dll|metal|so)$/.test(f) || /^LICENSE/i.test(f);
    if (!keep) fs.rmSync(path.join(target, f), { recursive: true, force: true });
  }
  console.log(`✓ 已安裝 ${path.relative(ROOT, target)}`);
}

// 2. 模型
for (const model of manifest.models) {
  const out = path.join(DESKTOP, 'models', model.file);
  if (fs.existsSync(out) && fs.statSync(out).size === model.bytes) {
    console.log(`✓ 已存在 ${model.file}`);
    continue;
  }
  console.log(`↓ 下載 ${model.name} (${(model.bytes / 1e9).toFixed(2)} GB)`);
  curl(model.url, out);
  const size = fs.statSync(out).size;
  if (size !== model.bytes) throw new Error(`${model.file} 大小不符：${size} ≠ ${model.bytes}`);
  console.log(`✓ 完成 ${model.file}`);
}
console.log(`\n${edition} 版所需檔案已全部就緒。`);
