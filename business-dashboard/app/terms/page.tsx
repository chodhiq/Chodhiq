import { notFound } from 'next/navigation';
import LegalPage from '../components/legal-page';
import { legalDocument } from '../../lib/legal-publication';

export const metadata = { title: 'Terms of Service | ChodhiQ' };

export default function TermsPage() {
  const markdown = legalDocument('terms');
  if (!markdown) notFound();
  return <LegalPage markdown={markdown} />;
}
