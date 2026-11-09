const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
execFileSync(process.execPath, [path.join(__dirname, 'check.cjs')], { stdio: 'inherit' });
const output = path.join(root, 'dist');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.cpSync(path.join(root, 'src'), path.join(output, 'src'), {
  recursive: true,
  filter: (file) => file !== path.join(root, 'src/data'),
});
fs.copyFileSync(path.join(root, 'server.js'), path.join(output, 'server.js'));
fs.writeFileSync(
  path.join(output, 'build.json'),
  JSON.stringify(
    { name: 'hustlehub-api', version: require('../package.json').version, node: process.version },
    null,
    2,
  ),
);
console.log('Backend distribution built without secrets, tests, certificates, or runtime stores.');
