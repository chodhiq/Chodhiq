import { notFound } from 'next/navigation';
import LegalPage from '../components/legal-page';
import { legalDocument } from '../../lib/legal-publication';

export const metadata = { title: 'Community Moderation Policy | ChodhiQ' };

export default function ModerationPolicyPage() {
  const markdown = legalDocument('moderation');
  if (!markdown) notFound();
  return <LegalPage markdown={markdown} />;
}
