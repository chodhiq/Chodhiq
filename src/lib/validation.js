// @ts-check
/** @typedef {import('../types/domain').ProfileInput} ProfileInput */
/** @typedef {import('../types/domain').QuoteInput} QuoteInput */
/** @typedef {import('../types/domain').PreferredContact} PreferredContact */
/** @typedef {import('../types/domain').ReportReason} ReportReason */

import {
  cleanEmail,
  cleanPassword,
  cleanText,
  requireUuid,
  validateHttpsUrl,
} from '../../packages/validation/index.js';

export { cleanEmail, cleanPassword, cleanText, requireUuid, validateHttpsUrl };

/**
 * @param {unknown} value
 * @param {{field?: string, min?: number, max?: number, multiline?: boolean}} [options]
 */
/** @param {ProfileInput} profile */
export function validateProfile(profile) {
  return {
    ...profile,
    name: cleanText(profile.name || '', { field: 'Name', min: 1, max: 100 }),
    email: profile.email ? cleanEmail(profile.email) : '',
    phone: cleanText(profile.phone || '', { field: 'Phone', max: 30 }),
    location: cleanText(profile.location || '', { field: 'Location', min: 1, max: 100 }),
  };
}

/** @param {QuoteInput} input */
export function validateQuote(input) {
  const allowedContacts = new Set(['whatsapp', 'call', 'email']);
  const preferredContact =
    input.preferredContact && allowedContacts.has(input.preferredContact)
      ? input.preferredContact
      : 'whatsapp';
  return {
    providerId: requireUuid(input.providerId, 'Provider'),
    providerName: cleanText(input.providerName || 'Provider', {
      field: 'Provider name',
      min: 1,
      max: 160,
    }),
    message: cleanText(input.message || '', {
      field: 'Message',
      min: 1,
      max: 2000,
      multiline: true,
    }),
    preferredContact,
  };
}

/** @param {unknown} reason @param {unknown} details */
export function validateReport(reason, details) {
  /** @type {Set<string>} */
  const allowedReasons = new Set(['incorrect_information', 'closed_business', 'fraud', 'other']);
  if (typeof reason !== 'string' || !allowedReasons.has(reason))
    throw new Error('Report reason is invalid.');
  return {
    reason: /** @type {ReportReason} */ (reason),
    details: cleanText(details || '', {
      field: 'Report details',
      min: 3,
      max: 1500,
      multiline: true,
    }),
  };
}
