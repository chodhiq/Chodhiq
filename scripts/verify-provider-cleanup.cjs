const fs = require('node:fs');

function readEnv(path) {
  if (!fs.existsSync(path)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        const key = line.slice(0, separator).trim();
        const value = line
          .slice(separator + 1)
          .trim()
          .replace(/^['"]|['"]$/g, '');
        return [key, value];
      }),
  );
}

const candidates = [
  '.env.local',
  '.env',
  'business-dashboard/.env.local',
  'admin-dashboard/.env.local',
].map(readEnv);
const env = candidates.find((candidate) =>
  String(candidate.EXPO_PUBLIC_SUPABASE_URL || candidate.NEXT_PUBLIC_SUPABASE_URL).includes(
    'gfjhvsajwjrrlylgrkhf',
  ),
);
const url = env?.EXPO_PUBLIC_SUPABASE_URL || env?.NEXT_PUBLIC_SUPABASE_URL;
const key = env?.EXPO_PUBLIC_SUPABASE_ANON_KEY || env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) throw new Error('Production public Supabase configuration missing');
if (!url.includes('gfjhvsajwjrrlylgrkhf')) {
  throw new Error('Root environment is not configured for ChodhiQ Production');
}

async function count(path) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`${response.status}: ${body}`);
  return response.headers.get('content-range');
}

Promise.all([
  count('providers?select=id'),
  count('providers?select=id&source_profile_id=not.is.null'),
  count('directory_profiles?select=source_id'),
]).then(([providers, importedProviders, directoryProfiles]) => {
  console.log(JSON.stringify({ providers, importedProviders, directoryProfiles }));
});
