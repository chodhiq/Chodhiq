import { supabase } from '../lib/supabase';

const POSTCODE_API = 'https://api.postcodes.io';

export async function suggestUkAddresses(query, signal) {
  const value = String(query || '').trim();
  if (value.length < 3) return [];
  if (!supabase) return [];

  const { data, error } = await supabase.functions.invoke('uk-address-suggestions', {
    body: { query: value },
    signal,
  });
  if (error) throw new Error('Address suggestions are unavailable.');
  return Array.isArray(data?.result) ? data.result : [];
}

export async function suggestUkPostcodes(query, signal) {
  const value = String(query || '').trim();
  if (value.replace(/\s/g, '').length < 2) return [];
  const response = await fetch(
    `${POSTCODE_API}/postcodes/${encodeURIComponent(value)}/autocomplete?limit=8`,
    { signal },
  );
  if (!response.ok) throw new Error('Postcode suggestions are unavailable.');
  const payload = await response.json();
  return Array.isArray(payload.result) ? payload.result : [];
}

export async function lookupUkPostcode(postcode, signal) {
  const normalized = String(postcode || '')
    .trim()
    .replace(/\s+/g, '');
  const lookup = async (type) =>
    fetch(`${POSTCODE_API}/${type}/${encodeURIComponent(normalized)}`, { signal });
  let response = await lookup('postcodes');
  if (response.status === 404) response = await lookup('terminated_postcodes');
  if (!response.ok) throw new Error('That postcode could not be found.');
  const payload = await response.json();
  if (payload.status !== 200 || !payload.result)
    throw new Error('That postcode could not be found.');
  return payload.result;
}
