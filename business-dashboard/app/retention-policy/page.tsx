import { notFound } from 'next/navigation';
import LegalPage from '../components/legal-page';
import { legalDocument } from '../../lib/legal-publication';

export const metadata = { title: 'Data Retention Policy | ChodhiQ' };

export default function RetentionPolicyPage() {
  const markdown = legalDocument('retention');
  if (!markdown) notFound();
  return <LegalPage markdown={markdown} />;
}
