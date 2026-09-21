import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectId = process.env.SUPABASE_PROJECT_ID?.trim();
const args = ['supabase', 'gen', 'types', 'typescript'];
if (projectId) args.push('--project-id', projectId);
else args.push('--local');

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(command, args, { encoding: 'utf8', shell: false });
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || 'Supabase type generation failed.\n');
  process.exit(result.status || 1);
}
if (!/export type Database/.test(result.stdout)) {
  throw new Error('Supabase did not return a Database type; existing types were preserved.');
}
writeFileSync(resolve('packages/types/database.generated.d.ts'), result.stdout, 'utf8');
console.log('Generated packages/types/database.generated.d.ts');
