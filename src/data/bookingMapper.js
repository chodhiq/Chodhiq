// @ts-check
/** @typedef {import('../types/domain').BookingRecord} BookingRecord */
/** @typedef {import('../types/domain').BookingStatus} BookingStatus */
/**
 * @typedef {object} BookingRow
 * @property {string} id
 * @property {string} user_id
 * @property {string} provider_id
 * @property {string | null} service_id
 * @property {string} requested_date
 * @property {string | null} requested_time
 * @property {BookingStatus | null} status
 * @property {string | null} notes
 * @property {string | null} provider_message
 * @property {string} created_at
 * @property {{business_name?: string} | {business_name?: string}[] | null} [providers]
 * @property {{name?: string} | {name?: string}[] | null} [services]
 */

/** @template T @param {T | T[] | null | undefined} value @returns {T | undefined} */
const firstRelation = (value) => (Array.isArray(value) ? value[0] : value || undefined);

/** @param {BookingRow} row @returns {BookingRecord} */
export const mapBooking = (row) => {
  const provider = firstRelation(row.providers);
  const service = firstRelation(row.services);
  return {
    id: row.id,
    userId: row.user_id,
    providerId: row.provider_id,
    serviceId: row.service_id,
    providerName: provider?.business_name || 'Provider',
    serviceName: service?.name || 'General appointment',
    requestedDate: row.requested_date,
    requestedTime: String(row.requested_time || '').slice(0, 5),
    status: row.status || 'pending',
    notes: row.notes || '',
    providerMessage: row.provider_message || '',
    createdAt: row.created_at,
  };
};
// @ts-check
