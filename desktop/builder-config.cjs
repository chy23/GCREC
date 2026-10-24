// electron-builder 共用設定：依版本 (lite / full) 決定要打包哪些模型。
// 由根目錄的 electron-builder.lite.cjs / electron-builder.full.cjs 呼叫。
const fs = require('fs');
const path = require('path');

module.exports = (edition) => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'editions', `${edition}.json`), 'utf-8')
  );
  const editionLabel = edition === 'lite' ? 'Lite' : 'Full';

  const sharedResources = [
    { from: `desktop/editions/${edition}.json`, to: 'edition.json' },
    { from: 'desktop/licenses', to: 'licenses' },
    ...manifest.models.map((m) => ({ from: `desktop/models/${m.file}`, to: `models/${m.file}` })),
  ];

  return {
    appId: `tw.gcrec.desktop.${edition}`,
    productName: edition === 'lite' ? '教師輔導紀錄小幫手 輕量版' : '教師輔導紀錄小幫手',
    executableName: `GCREC-${editionLabel}`,
    directories: { output: `release/${edition}`, buildResources: 'desktop/build' },
    artifactName: `GCREC-Desktop-${editionLabel}-\${version}-\${os}-\${arch}.\${ext}`,
    // 前端已由 Vite 打包，不需要 node_modules
    files: ['dist-desktop/**/*', 'electron/**/*', 'package.json', '!node_modules/**/*'],
    // GGUF 已是壓縮過的權重，再壓縮只會拖慢打包速度
    compression: 'store',
    extraResources: sharedResources,
    mac: {
      target: [{ target: 'dmg', arch: ['arm64'] }],
      category: 'public.app-category.education',
      identity: '-', // ad-hoc 簽章 (無 Apple 開發者帳號)，Apple Silicon 執行原生程式所必需
      hardenedRuntime: false,
      signIgnore: ['\\.gguf$', '\\.json$', '\\.txt$'],
      extraResources: [{ from: 'desktop/bin/mac-arm64', to: 'bin/mac-arm64' }],
    },
    dmg: {
      title: `GCREC ${editionLabel}`,
    },
    win: {
      // NSIS 安裝檔上限 2GB，因此 Windows 版輸出為免安裝 zip
      target: [{ target: 'zip', arch: ['x64'] }],
      signAndEditExecutable: false,
      extraResources: [{ from: 'desktop/bin/win-x64', to: 'bin/win-x64' }],
    },
  };
};
