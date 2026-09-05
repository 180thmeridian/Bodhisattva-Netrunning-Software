#!/usr/bin/env node
/**
 * Build offline update package (no network).
 * Usage: node tools/make-update.cjs
 * Output: dist-update/CP2020_Netrun_Update_<version>.zip
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const ver = fs.readFileSync(path.join(root, 'version.txt'), 'utf8').trim();
const outDir = path.join(root, 'dist-update');
const stage = path.join(outDir, 'stage');
const zipName = `CP2020_Netrun_Update_${ver}.zip`;
const zipPath = path.join(outDir, zipName);

fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(path.join(stage, 'renderer'), { recursive: true });

const manifest = {
  id: 'cp2020-netrun-terminal',
  version: ver,
  minVersion: '1.6.0',
  created: new Date().toISOString(),
  notes: '1.6.50: INT trauma CRT/noise/palette; INT stat death; Liche scars; AP fix; faster anim'
};
fs.writeFileSync(path.join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(stage, 'version.txt'), ver + '\n');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyDir(path.join(root, 'renderer'), path.join(stage, 'renderer'));

fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(zipPath, { force: true });

if (process.platform === 'win32') {
  const ps = `Compress-Archive -Path '${stage.replace(/'/g, "''")}\\*' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`;
  const r = spawnSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
} else {
  const r = spawnSync('zip', ['-r', zipPath, '.'], { cwd: stage, encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
}

console.log('Built', zipPath);
console.log('Users: open app → UPDATE → select this zip → auto restart.');
