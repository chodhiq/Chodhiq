export type ApplicationFields = { business_name: string; city: string; postcode: string; phone: string; category_id: string };
export function applicationErrors(value: ApplicationFields) {
  return {
    business_name: value.business_name.trim().length < 2 || value.business_name.trim().length > 120 ? 'Use 2–120 characters for your business name.' : '',
    city: value.city.trim().length < 2 || value.city.trim().length > 100 ? 'Enter your UK town or city (2–100 characters).' : '',
    postcode: /^(GIR ?0AA|[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2})$/i.test(value.postcode.trim()) ? '' : 'Enter a UK postcode, such as SW1A 1AA.',
    phone: /^(0[1-9][0-9]{9}|\+44[1-9][0-9]{9})$/.test(value.phone.replace(/[ ()-]/g, '')) ? '' : 'Enter a UK phone number starting with 0 or +44.',
    category_id: value.category_id ? '' : 'Choose your business category.',
  };
}
export function proofError(file: { size: number; type: string } | null) {
  if (!file) return 'Upload proof of your UK business.';
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) return 'Choose a PDF, JPG or PNG file.';
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) return 'Choose a non-empty file up to 10 MB.';
  return '';
}
