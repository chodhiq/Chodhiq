const fs = require('node:fs');

function readEnv(path) {
  return Object.fromEntries(
    fs
      .readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [
          line.slice(0, separator).trim(),
          line
            .slice(separator + 1)
            .trim()
            .replace(/^['"]|['"]$/g, ''),
        ];
      }),
  );
}

const env = readEnv('.env');
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) throw new Error('Staging public Supabase configuration missing');
if (!url.includes('ljhncdzhzoatonhhofbv')) {
  throw new Error('Root environment is not configured for ChodhiQ Staging');
}

async function get(path) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`${response.status}: ${body}`);
  return JSON.parse(body);
}

const expectedNames = [
  'Leicester Plumbers Ltd',
  'LT Electrical',
  'Jaffer Motor Care',
  'M8 PitStop Ltd',
  'Abbey Cars & MOT',
  'Amicare',
  'Reliance Community Care',
  'Leicester Accountants',
  'Insight Consultancy',
  'Leicester Moving Company',
  'Leicester Couriers',
  'Emma Brown Hair',
  'Remy Hair Salon',
  'Lavish Leicester',
  'Sarafina Events',
  'The Event Decor Company',
  'Leicester Tutors',
  'Leicester Music Lessons Ltd',
  'MH Cleaning Solutions Ltd',
  'Reveal Cleaning Solutions Ltd',
];

const nameFilter = encodeURIComponent(`(${expectedNames.map((name) => `"${name}"`).join(',')})`);

get(
  `providers?select=business_name,base_city,cover_image_url,categories(slug)&business_name=in.${nameFilter}`,
).then((providers) => {
  const categoryCounts = {};
  for (const provider of providers) {
    if (provider.base_city !== 'Leicester')
      throw new Error(`${provider.business_name} is not Leicester`);
    if (provider.cover_image_url !== null)
      throw new Error(`${provider.business_name} has a remote image`);
    const slug = provider.categories?.slug;
    categoryCounts[slug] = (categoryCounts[slug] || 0) + 1;
  }

  const expected = {
    'home-property': 2,
    automotive: 3,
    'personal-family': 2,
    'business-professional': 2,
    'moving-delivery': 2,
    'beauty-wellness': 3,
    events: 2,
    education: 2,
    'commercial-services': 2,
  };

  if (providers.length !== 20) throw new Error(`Expected 20 providers, found ${providers.length}`);
  if (JSON.stringify(categoryCounts) !== JSON.stringify(expected)) {
    throw new Error(`Category counts differ: ${JSON.stringify(categoryCounts)}`);
  }

  console.log(JSON.stringify({ providerCount: providers.length, categoryCounts }));
});
