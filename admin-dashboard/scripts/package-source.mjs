import { execFileSync } from 'node:child_process';
import { resolve, relative, basename } from 'node:path';

const workspace = resolve(import.meta.dirname, '../..');
const output = resolve(process.argv[2] || 'admin-dashboard-source.zip');
if (process.argv[2]) {
  const requested = resolve(workspace, process.argv[2]);
  if (!requested.startsWith(`${workspace}/`) && !requested.startsWith(`${workspace}\\`)) {
    throw new Error('Output must be inside the ChodhiQ workspace.');
  }
}
const tracked = execFileSync('git', ['ls-files', '-z', '--', 'admin-dashboard', 'supabase', 'packages'], {
  cwd: workspace,
  encoding: 'utf8',
}).split('\0').filter(Boolean);

const excluded = tracked.filter((file) => {
  const name = basename(file);
  return name.startsWith('.env') || /(^|\/)(dist|\.wrangler|node_modules)(\/|$)/.test(file) || /\.log$/i.test(name);
});
if (excluded.length) throw new Error(`Refusing to package ignored or sensitive files: ${excluded.join(', ')}`);

execFileSync('git', [
  'archive', '--format=zip', `--output=${output}`, 'HEAD',
  'admin-dashboard', 'supabase', 'packages',
], { cwd: workspace, stdio: 'inherit' });
process.stdout.write(`Created ${relative(workspace, output)} from the committed source tree.\n`);
