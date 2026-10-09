import { notFound } from 'next/navigation';
import Link from 'next/link';
import { legalDocument, legalPrivacyEmail } from '../../lib/legal-publication';

export const metadata = { title: 'Delete your ChodhiQ account' };

export default function DeleteAccountPage() {
  const privacy = legalDocument('privacy');
  const email = legalPrivacyEmail();
  if (!privacy || !email) notFound();
  const mailto = `mailto:${email}?subject=${encodeURIComponent('ChodhiQ account deletion request')}`;
  return (
    <main className="legal-shell">
      <nav aria-label="Legal pages" className="legal-nav">
        <Link href="/">ChodhiQ</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
      </nav>
      <article className="legal-document">
        <h1>Delete your ChodhiQ account</h1>
        <p>
          You can request deletion even if you no longer have the app. Email the ChodhiQ privacy
          team from the address associated with your account if possible. If you no longer have access to that email, explain this in your request so we can offer another verification method. Do not include your password,
          confirmation links, identity documents or other sensitive details in the first message.
        </p>
        <p>
          <a className="legal-action" href={mailto}>
            Request account deletion by email
          </a>
        </p>
        <p>
          We may ask you to verify that you own the account before deleting it. Account-linked
          product records and uploaded media are removed, subject to the limited exceptions
          described in our <Link href="/privacy">Privacy Policy</Link> and{' '}
          <Link href="/retention-policy">retention schedule</Link>.
        </p>
        <p>
          If you still have the app, you can also open Profile &gt; Settings &gt; Privacy &amp; your data,
          type DELETE and choose Delete my account.
        </p>
      </article>
    </main>
  );
}

