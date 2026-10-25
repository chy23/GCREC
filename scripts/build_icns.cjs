const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const buildDir = path.join(root, 'build');
const srcPng = path.join(buildDir, 'icon_1024.png');
const iconsetDir = path.join(buildDir, 'icon.iconset');

if (!fs.existsSync(iconsetDir)) fs.mkdirSync(iconsetDir, { recursive: true });

const pairs = [
  { size: 16, name: 'icon_16x16.png' },
  { size: 32, name: 'icon_16x16@2x.png' },
  { size: 32, name: 'icon_32x32.png' },
  { size: 64, name: 'icon_32x32@2x.png' },
  { size: 128, name: 'icon_128x128.png' },
  { size: 256, name: 'icon_128x128@2x.png' },
  { size: 256, name: 'icon_256x256.png' },
  { size: 512, name: 'icon_256x256@2x.png' },
  { size: 512, name: 'icon_512x512.png' },
  { size: 1024, name: 'icon_512x512@2x.png' }
];

for (const p of pairs) {
  const out = path.join(iconsetDir, p.name);
  execSync(`sips -z ${p.size} ${p.size} "${srcPng}" --out "${out}"`);
}

const icnsPath = path.join(buildDir, 'icon.icns');
execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`);
console.log('Successfully created', icnsPath);

fs.copyFileSync(path.join(iconsetDir, 'icon_512x512.png'), path.join(buildDir, 'icon.png'));
