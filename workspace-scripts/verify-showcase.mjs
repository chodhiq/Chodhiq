import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const npm = 'npm';
const checks = [
  ['Mobile type-check', 'chodhiq', ['run','typecheck']],
  ['Mobile tests', 'chodhiq', ['test']],
  ['Mobile security', 'chodhiq', ['run','security:check']],
  ['Business lint', 'chodhiq-business-dashboard', ['run','lint']],
  ['Business type-check', 'chodhiq-business-dashboard', ['run','typecheck']],
  ['Business build and tests', 'chodhiq-business-dashboard', ['test']],
  ['Admin lint', 'chodhiq-admin-dashboard', ['run','lint']],
  ['Admin type-check', 'chodhiq-admin-dashboard', ['run','typecheck']],
  ['Admin build and tests', 'chodhiq-admin-dashboard', ['test']],
];

let failed = 0;
for (const [label, directory, args] of checks) {
  process.stdout.write(`\n## ${label}\n`);
  const result = spawnSync(npm, args, { cwd: join(root,directory), stdio:'inherit', shell:process.platform === 'win32' });
  if (result.status !== 0) { failed += 1; process.stderr.write(`FAILED: ${label}\n`); }
}
process.stdout.write(`\n${checks.length-failed}/${checks.length} showcase checks passed.\n`);
process.exitCode = failed ? 1 : 0;
