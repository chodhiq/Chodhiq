import { notFound } from 'next/navigation';
import LegalPage from '../components/legal-page';
import { legalDocument } from '../../lib/legal-publication';

export const metadata = { title: 'Privacy Policy | ChodhiQ' };

export default function PrivacyPage() {
  const markdown = legalDocument('privacy');
  if (!markdown) notFound();
  return <LegalPage markdown={markdown} />;
}
