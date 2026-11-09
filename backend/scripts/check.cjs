const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
function check(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) check(file);
    else if (/\.(js|cjs)$/.test(file))
      execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  }
}
for (const dir of ['src', 'scripts', 'test']) check(path.resolve(__dirname, '..', dir));
execFileSync(process.execPath, ['--check', path.resolve(__dirname, '../server.js')], {
  stdio: 'inherit',
});
console.log('Backend syntax checks passed.');
