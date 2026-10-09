export function postVariant(post) {
  if (post.post_type === 'promotion') return 'provider_offer';
  if (post.post_type === 'marketplace') return 'marketplace';
  return 'discussion';
}

export function phoneParts(body = '') {
  const text = String(body);
  const pattern = /(?:\+44|0044|0)[\s().-]*(?:\(0\)[\s.-]*)?[127](?:[\s().-]*\d){8,9}/g;
  const parts = [];
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    const digits = match[0].replace(/\D/g, '').replace(/^0044/, '44').replace(/^440/, '44');
    const normalized = digits.startsWith('44') ? `0${digits.slice(2)}` : digits;
    const before = text[match.index - 1] || '';
    const after = text[match.index + match[0].length] || '';
    if (!/^0[127]\d{9}$/.test(normalized) || /[\w+]/.test(before) || /\d/.test(after)) continue;
    if (match.index > offset) parts.push({ text: text.slice(offset, match.index), phone: false });
    parts.push({ text: match[0], phone: true });
    offset = match.index + match[0].length;
  }
  if (offset < text.length) parts.push({ text: text.slice(offset), phone: false });
  return parts;
}

export function offerProgress(createdAt, expiresAt, now = Date.now()) {
  const end = Date.parse(expiresAt);
  const start = Date.parse(createdAt);
  if (!Number.isFinite(end)) return null;
  const remaining = Math.max(0, end - now);
  const duration = Number.isFinite(start) && end > start ? end - start : 86400000;
  const progress = Math.max(0, Math.min(1, 1 - remaining / duration));
  const label =
    remaining === 0
      ? 'Expired'
      : remaining < 3600000
        ? `${Math.ceil(remaining / 60000)}m`
        : remaining < 86400000
          ? `${Math.ceil(remaining / 3600000)}h`
          : `${Math.ceil(remaining / 86400000)}d`;
  return { remaining, progress, label, urgency: 1 - Math.min(1, remaining / 3600000) };
}

export function spaceAccent(slug = 'general') {
  const accents = ['#0E6B5C', '#F4A125', '#C5392B'];
  if (slug === 'general') return accents[0];
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return accents[hash % accents.length];
}

export function isNewMember(createdAt, now = Date.now(), days = 14) {
  const age = now - Date.parse(createdAt);
  return Number.isFinite(age) && age >= 0 && age < days * 86400000;
}
