'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from '../components/admin-link';
import { EmptyState, LoadError, Page, Pager, Skeleton, Status } from '../components/ui';
import { range, useAdmin } from '../../lib/admin';
import { supabase } from '../../lib/supabase';
import { sendNotification } from '../../lib/notify-user';
import { useCounts, type CountDef } from '../../lib/use-counts';
import { useUrlFilter } from '../../lib/url-filter';

type Application = {
  id: string;
  business_name: string;
  city: string;
  postcode: string;
  phone: string;
  email: string;
  status: string;
  submitted_at: string;
  review_due_at: string;
  proof_path: string;
  proof_name: string;
  review_note: string | null;
  revision: number;
  applicant_id: string;
  provider_id: string | null;
  categories: { name: string } | null;
};
const APPLICATION_COUNTS = [
  { key: 'pending', table: 'business_applications', filters: { status: 'pending' } },
  { key: 'approved', table: 'business_applications', filters: { status: 'approved' } },
  { key: 'changes', table: 'business_applications', filters: { status: 'changes_requested' } },
  { key: 'rejected', table: 'business_applications', filters: { status: 'rejected' } },
] as const satisfies readonly CountDef[];
export default function Applications() {
  const [now, setNow] = useState(() => Date.now());
  const admin = useAdmin();
  const { show } = useCounts(APPLICATION_COUNTS);
  const [rows, setRows] = useState<Application[]>([]),
    [status, setStatus] = useUrlFilter('status', ['pending', 'approved', 'changes_requested', 'rejected'], 'pending', 'applications-results'),
    [page, setPage] = useState(0),
    [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notes, setNotes] = useState<Record<string, string>>({});
  const requestId = useRef(0);
  const load = useCallback(
    async (quiet = false) => {
      const request = ++requestId.current;
      setNow(Date.now());
      if (!quiet) setLoading(true);
      setError('');
      try {
        const result = await supabase
          .from('business_applications')
          .select('*,categories(name)', { count: 'exact' })
          .eq('status', status)
          .order('submitted_at', { ascending: true })
          .range(...range(page));
        if (request !== requestId.current) return;
        if (result.error) throw new Error('load');
        setRows((result.data ?? []) as Application[]);
        setTotal(result.count ?? 0);
      } catch {
        if (request === requestId.current) setError('Business applications could not be loaded.');
      } finally {
        if (request === requestId.current) setLoading(false);
      }
    },
    [status, page],
  );
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => {
      clearTimeout(timer);
      requestId.current += 1;
    };
  }, [load]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void load(true);
    };
    const timer = window.setInterval(refresh, 30000);
    const channel = supabase
      .channel('admin-applications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'business_applications' },
        refresh,
      )
      .subscribe();
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      void supabase.removeChannel(channel);
    };
  }, [load]);
  async function review(row: Application, decision: 'approved' | 'rejected' | 'changes_requested') {
    if (busy) return;
    const note = (notes[row.id] ?? '').trim();
    if (decision !== 'approved' && note.length < 8) {
      admin.notify('Give a reason of at least 8 characters.', 'error');
      return;
    }
    if (
      !(await admin.confirmAction({
        title: decision === 'approved' ? 'Approve business account' : 'Send review decision',
        message:
          decision === 'approved'
            ? `Confirm you reviewed the UK business proof for ${row.business_name}. Approval creates and unlocks its provider workspace.`
            : `Send this decision and note to the application status page for ${row.business_name}?`,
        confirmLabel: decision === 'approved' ? 'Approve business' : 'Confirm decision',
      }))
    )
      return;
    setBusy(true);
    try {
      const result = await admin.act(
        `business_application_${decision}`,
        'business_application',
        row.id,
        () =>
          supabase.rpc('review_business_application', {
            application_id: row.id,
            expected_revision: row.revision,
            decision,
            decision_note: note || null,
          }),
        { server_audited: true },
      );
      if (result.ok) {
        const title = decision === 'approved' ? 'Your business application was approved' : decision === 'rejected' ? 'Your business application was not approved' : 'Changes are needed for your business application';
        const body = decision === 'approved' ? 'Your provider workspace is ready. You can now appear in the marketplace and receive bookings.' : decision === 'rejected' ? `Your application was not approved. Review the decision note and contact support if you think this was a mistake. ${note.slice(0, 350)}` : `Please update your application using this note, then submit it again: ${note.slice(0, 420)}`;
        try { await sendNotification({ audience: 'user', userId: row.applicant_id, title, body }); }
        catch { admin.notify('Saved, but the applicant notification could not be sent.', 'error'); }
        await load();
      }
    } finally {
      setBusy(false);
    }
  }
  async function openProof(row: Application) {
    const result = await supabase.storage
      .from('business-application-proofs')
      .createSignedUrl(row.proof_path, 120);
    if (result.error) {
      admin.notify('The proof could not be opened. Refresh and retry.', 'error');
      return;
    }
    window.open(result.data.signedUrl, '_blank', 'noopener,noreferrer');
  }
  return (

      <Page
        title="Business account review"
        note="Check the business details and UK trading evidence before granting provider access. Review pending applications within 3 days."
        stats={[{label:'Pending',value:show('pending'),tone:'amber',href:'/applications?status=pending'},{label:'Approved',value:show('approved'),tone:'green',href:'/applications?status=approved'},{label:'Changes requested',value:show('changes'),tone:'purple',href:'/applications?status=changes_requested'},{label:'Rejected',value:show('rejected'),href:'/applications?status=rejected'} ]}
      >
        <div className="pills" id="applications-results">
          {['pending', 'approved', 'changes_requested', 'rejected'].map((value) => (
            <button
              key={value}
              disabled={busy}
              aria-pressed={status === value}
              onClick={() => {
                setStatus(value);
                setPage(0);
              }}
            >
              {value.replaceAll('_', ' ')}
            </button>
          ))}
          <button disabled={busy} onClick={() => void load()}>
            Refresh
          </button>
        </div>
        {loading ? (
          <Skeleton rows={5} />
        ) : error ? (
          <LoadError message={error} retry={load} />
        ) : !rows.length ? (
          <EmptyState title="No applications with this status." />
        ) : (
          <section className="panel moderation">
            {rows.map((row) => (
              <article key={row.id}>
                <h3>{row.business_name}</h3>
                <small>Application reference: {row.id}</small>
                <Status value={row.status} />
                <p>
                  {row.categories?.name} · {row.city}, {row.postcode}
                </p>
                <p>
                  Email: {row.email}
                  <br />
                  Phone: {row.phone}
                </p>
                <p>
                  Submitted:{' '}
                  {new Date(row.submitted_at).toLocaleString('en-GB', {
                    timeZone: 'Europe/London',
                  })}
                  <br />
                  Response due:{' '}
                  {new Date(row.review_due_at).toLocaleString('en-GB', {
                    timeZone: 'Europe/London',
                  })}{' '}
                  UK time{' '}
                  {row.status === 'pending' && now > Date.parse(row.review_due_at) && (
                    <strong>— Overdue</strong>
                  )}
                </p>
                <button onClick={() => void openProof(row)}>
                  View business proof: {row.proof_name}
                </button>
                {row.provider_id && (
                  <p>
                    <Link href={`/providers/${row.provider_id}`}>
                      Open approved provider workspace details
                    </Link>
                  </p>
                )}
                {row.review_note && <p>Review note: {row.review_note}</p>}
                {row.status === 'pending' && (
                  <>
                    <label className="field" htmlFor={`note-${row.id}`}>
                      Review note (visible to applicant)
                      <textarea
                        id={`note-${row.id}`}
                        maxLength={1000}
                        value={notes[row.id] ?? ''}
                        disabled={busy}
                        onChange={(event) =>
                          setNotes((current) => ({ ...current, [row.id]: event.target.value }))
                        }
                      />
                    </label>
                    <footer>
                      <button disabled={busy} onClick={() => void review(row, 'changes_requested')}>
                        Request changes
                      </button>
                      <button
                        className="danger"
                        disabled={busy}
                        onClick={() => void review(row, 'rejected')}
                      >
                        Reject
                      </button>
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() => void review(row, 'approved')}
                      >
                        Approve business
                      </button>
                    </footer>
                  </>
                )}
              </article>
            ))}
            <Pager page={page} total={total} setPage={setPage} disabled={busy} />
          </section>
        )}
      </Page>

  );
}
