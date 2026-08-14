import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const recordDelimiter = '<END_COMMIT>';
const fieldDelimiter = '|||';
const gitCommand = `git log -n 50 --pretty=format:"%h${fieldDelimiter}%cd${fieldDelimiter}%s${fieldDelimiter}%b${recordDelimiter}" --date=short`;

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

    return {
      version: `v-${hash}`,
      date: date,
      title: title,
      details: body ? body : "常規更新或效能優化",
      bugs: bugs
    };
  }).filter(Boolean);

  const outputPath = path.join(process.cwd(), 'src', 'changelog.json');
  fs.writeFileSync(outputPath, JSON.stringify(changelog, null, 2));
  console.log('Changelog generated successfully at src/changelog.json');
} catch (error) {
  console.error('Error generating changelog:', error);
}
