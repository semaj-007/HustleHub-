const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'reports');
fs.mkdirSync(directory, { recursive: true });
const report = path.join(directory, 'eslint.json');
fs.rmSync(report, { force: true });
const run = spawnSync(
  process.execPath,
  [
    path.join(path.dirname(require.resolve('eslint/package.json')), 'bin/eslint.js'),
    '.',
    '--max-warnings=0',
    '--format=json',
    '--output-file',
    report,
  ],
  { cwd: root, stdio: 'inherit' },
);
if (fs.existsSync(report)) {
  const results = JSON.parse(fs.readFileSync(report, 'utf8'));
  for (const result of results) {
    for (const message of result.messages)
      console.log(
        `${path.relative(root, result.filePath)}:${message.line || 1} ${message.ruleId || 'parse'} ${message.message}`,
      );
    result.filePath = path.relative(root, result.filePath);
  }
  fs.writeFileSync(report, JSON.stringify(results, null, 2));
  const summary = {
    tool: `ESLint ${require('eslint/package.json').version}`,
    files: results.length,
    errors: results.reduce((sum, file) => sum + file.errorCount, 0),
    warnings: results.reduce((sum, file) => sum + file.warningCount, 0),
    exitCode: run.status ?? 1,
  };
  fs.writeFileSync(
    path.join(directory, 'static-analysis-summary.json'),
    JSON.stringify(summary, null, 2),
  );
  console.log(JSON.stringify(summary));
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## Static analysis\n${summary.tool}: ${summary.files} files, ${summary.errors} errors, ${summary.warnings} warnings. Exit ${summary.exitCode}.\n`,
    );
}
process.exitCode = run.status ?? 1;
