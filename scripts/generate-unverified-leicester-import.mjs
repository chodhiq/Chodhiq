import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const input = path.join(root, 'project-docs', 'seed', 'leicester-review.csv');
const output = path.join(
  root,
  'supabase',
  'migrations',
  '20260924133000_import_unverified_leicester_directory.sql',
);

function parseCsv(source) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') {
      row.push(cell);
      cell = '';
    } else if (character === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else cell += character;
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }
  const headers = rows.shift().map((header) => header.replace(/^\uFEFF/, ''));
  return rows
    .filter((values) => values.some(Boolean))
    .map((values) =>
      Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])),
    );
}

const categorySlugs = {
  'Food & Drink': 'restaurants',
  'Fashion, Jewellery, Gifts & Shopping': 'fashion-tailoring',
  'Grocery & Food Retail': 'grocery-stores',
  'Beauty & Personal Care': 'beauty-wellness',
  'Health, Fitness & Wellness': 'personal-family',
  'Home & Local Services': 'home-property',
  'Catering & Events': 'catering',
  Automotive: 'automotive',
  'Creative & Entertainment': 'events',
  'Travel, Visa & NRI': 'business-professional',
  'Professional Services': 'business-professional',
  'Sports & Specialist Retail': 'personal-family',
  'Technology & Electronics': 'commercial-services',
  Pets: 'personal-family',
};

const previouslyImported = new Set([
  4, 6, 7, 14, 15, 17, 18, 19, 33, 35, 36, 39, 43, 101, 104, 119, 127, 130, 179, 181, 182, 205, 208,
  212, 213, 215, 216, 219,
]);

function sql(value) {
  if (value === null || value === undefined || value === '') return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function normalizePostcode(value) {
  const match = String(value)
    .toUpperCase()
    .match(/\b([A-Z]{1,2}\d[A-Z\d]?)[ -]?(\d[A-Z]{2})\b/);
  return match ? `${match[1]} ${match[2]}` : null;
}

const candidates = parseCsv(fs.readFileSync(input, 'utf8'))
  .filter((row) => !previouslyImported.has(Number(row.raw_id)))
  .filter((row) => row.raw_id !== '221' && row.review_status !== 'quarantined')
  .map((row) => {
    const parts = row.detail_as_extracted.split('•').map((part) => part.trim());
    const categoryAndSubtype = parts[0] || '';
    const subtype =
      categoryAndSubtype.split('/').slice(1).join('/').trim() || row.category_as_printed;
    const postcode = normalizePostcode(row.detail_as_extracted);
    const addressPart = parts.find(
      (part, index) =>
        index > 0 && part !== '—' && !normalizePostcode(part) && !/[+\d][\d\s()-]{7,}/.test(part),
    );
    return {
      rawId: Number(row.raw_id),
      name: row.name_as_extracted.replace(/\s*\|\s*REVIEW:.*$/i, '').trim(),
      categorySlug: categorySlugs[row.category_as_printed],
      subtype,
      postcode,
      streetAddress: addressPart || null,
    };
  })
  .filter((row) => row.name && row.categorySlug);

const seen = new Set();
const unique = candidates.filter((row) => {
  const key = `${row.name.toLowerCase()}|${row.postcode || ''}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

const values = unique
  .map(
    (row) =>
      `  (${sql(`leicester-seed-${String(row.rawId).padStart(3, '0')}`)},${sql(row.name)},${sql(row.categorySlug)},${sql(row.subtype)},${sql(row.postcode)},${sql(row.streetAddress)},${sql(String(row.rawId))})`,
  )
  .join(',\n');

const migration = `-- Public Leicester directory candidates requested for discovery coverage.
-- These rows are explicitly unverified: they receive no verified badge, no inferred
-- ownership, rating, phone number, website, or business claim.
begin;

with candidates(source_profile_id,business_name,category_slug,subcategory,base_postcode,street_address,raw_id) as (values
${values}
), resolved as (
  select x.*,c.id category_id
  from candidates x
  join public.categories c on c.slug=x.category_slug
)
insert into public.providers(
  source_profile_id,business_name,category_id,subcategory,description,base_city,
  base_postcode,street_address,service_areas,data_notes,data_verification_status,
  data_verified_at,is_verified,is_claimed,verification_status
)
select source_profile_id,business_name,category_id,subcategory,
  'Unverified community directory listing. Details may be incomplete; contact the business directly before relying on them.',
  'Leicester',base_postcode,street_address,array['Leicester'],
  'Source research row '||raw_id||'; not independently verified; contact and ownership details intentionally omitted.',
  'unchecked',null,false,false,'unverified'
from resolved
on conflict (business_name,base_postcode) do nothing;

commit;
`;

fs.writeFileSync(output, migration);
console.log(`Generated ${path.basename(output)} with ${unique.length} unverified candidates.`);
