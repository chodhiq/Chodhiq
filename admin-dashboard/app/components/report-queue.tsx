'use client';

import Link from './admin-link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReportRow, ReportStatus } from '../../lib/database.types';
import { cleanSearch, range, useAdmin } from '../../lib/admin';
import { runBoundedBulk } from '../../lib/operations';
import { supabase } from '../../lib/supabase';
import { AdminShell } from './admin-shell';
import { EmptyState, LoadError, Page, Pager, Search, Skeleton, Status } from './ui';

export function ReportQueue({ kind }: { kind: 'provider' | 'community' }) {
  const admin = useAdmin();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<ReportStatus>('open');
  const [search, setSearch] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const table = kind === 'provider' ? 'provider_reports' : 'community_post_reports';

  const load = useCallback(async () => {
    const activeRequest = ++requestId.current;
    setLoading(true);
    setError('');
    let request = supabase
      .from(table)
      .select(
        kind === 'provider'
          ? '*,providers(business_name)'
          : '*,community_posts(body,status),community_comments(body,status)',
        { count: 'exact' },
      )
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(...range(page));
    const cleaned = cleanSearch(search);
    if (cleaned) request = request.ilike('reason', `%${cleaned}%`);
    const result = await request;
    if (activeRequest !== requestId.current) return;
    if (result.error) setError('The report queue is unavailable. Refresh and retry.');
    else {
      setRows((result.data ?? []) as unknown as ReportRow[]);
      setTotal(result.count ?? 0);
    }
    setLoading(false);
  }, [kind, page, search, status, table]);
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!active) return;
      await load();
    };
    void run();
    return () => {
      active = false;
      requestId.current += 1;
    };
  }, [load]);
  useEffect(() => {
    const channel = supabase
      .channel(`${table}-admin-queue`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, table]);

  async function update(report: ReportRow, next: ReportStatus) {
    if (processing) return;
    if (['resolved', 'dismissed'].includes(next) && resolutionNote.trim().length < 8) {
      admin.notify('Enter a resolution note of at least 8 characters.', 'error');
      return;
    }
    if (
      ['resolved', 'dismissed'].includes(next) &&
      !(await admin.confirmAction({
        title: `${next === 'resolved' ? 'Resolve' : 'Dismiss'} report`,
        message:
          next === 'resolved'
            ? `Act on the reported ${kind} and close this report?`
            : 'Close this report without changing the underlying record?',
        confirmLabel: next === 'resolved' ? 'Resolve report' : 'Dismiss report',
      }))
    )
      return;
    setProcessing(true);
    const result = await admin.act(
      `${kind}_report_${next}`,
      `${kind}_report`,
      report.id,
      () =>
        supabase.rpc('admin_resolve_report', {
          report_kind: kind,
          report_id: report.id,
          expected_status: report.status,
          expected_updated_at: report.updated_at ?? null,
          next_status: next,
          resolution_note: resolutionNote.trim() || null,
        }),
      {
        server_audited: true,
        reason: resolutionNote.trim() || null,
        previous_status: report.status,
        new_status: next,
      },
    );
    if (result.ok) {
      setResolutionNote('');
      await load();
    }
    setProcessing(false);
  }

  async function bulkDismiss() {
    if (!selected.length || processing) return;
    if (resolutionNote.trim().length < 8) {
      admin.notify('Enter a resolution note of at least 8 characters.', 'error');
      return;
    }
    if (
      !(await admin.confirmAction({
        title: 'Dismiss selected reports',
        message: `Close ${selected.length} reports without changing their underlying records?`,
        confirmLabel: 'Dismiss reports',
      }))
    )
      return;
    setProcessing(true);
    const byId = new Map(rows.map((row) => [row.id, row]));
    const summary = await runBoundedBulk(selected, (id) => {
      const report = byId.get(id)!;
      return admin.act(
        `${kind}_report_dismissed`,
        `${kind}_report`,
        id,
        () =>
          supabase.rpc('admin_resolve_report', {
            report_kind: kind,
            report_id: id,
            expected_status: report.status,
            expected_updated_at: report.updated_at ?? null,
            next_status: 'dismissed',
            resolution_note: resolutionNote.trim(),
          }),
        { server_audited: true, bulk: true, reason: resolutionNote.trim() },
      );
    });
    setSelected(summary.failed);
    admin.notify(
      `${summary.message}${summary.failed.length ? ' Failed reports remain selected.' : ''}`,
      summary.failed.length ? 'error' : 'success',
    );
    await load();
    setProcessing(false);
  }

  async function moderatePost(report: ReportRow, next: 'published' | 'removed') {
    if (!report.post_id || processing) return;
    if (next === 'removed' && resolutionNote.trim().length < 8) {
      admin.notify('Enter a moderation reason of at least 8 characters.', 'error');
      return;
    }
    setProcessing(true);
    const result = await admin.act(
      `community_post_${next}`,
      'community_post',
      report.post_id,
      () =>
        supabase.rpc('admin_transition_community_post', {
          post_id: report.post_id,
          expected_status: report.community_posts?.status,
          next_status: next,
          reason: resolutionNote.trim() || null,
        }),
      { server_audited: true, report_id: report.id, reason: resolutionNote.trim() || null },
    );
    if (result.ok) await load();
    setProcessing(false);
  }

  const title = kind === 'provider' ? 'Provider reports' : 'Community reports';
  return (
    <AdminShell title={title}>
      <Page
        title={kind === 'provider' ? 'Provider-report queue' : 'Reported community content'}
        note="Realtime moderation with server-validated transitions and audited decisions."
      >
        <div className="pills" aria-label="Report status filter">
          {(['open', 'reviewing', 'resolved', 'dismissed'] as ReportStatus[]).map((value) => (
            <button
              aria-pressed={status === value}
              className={status === value ? 'on' : ''}
              onClick={() => {
                setStatus(value);
                setPage(0);
                setSelected([]);
              }}
              key={value}
            >
              {value}
            </button>
          ))}
        </div>
        <Search
          id={`${kind}-report-search`}
          label="Search reports by reason"
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(0);
          }}
        />
        <label className="field" htmlFor={`${kind}-resolution-note`}>
          <span>Resolution or moderation note</span>
          <textarea
            id={`${kind}-resolution-note`}
            value={resolutionNote}
            minLength={8}
            maxLength={1000}
            onChange={(event) => setResolutionNote(event.target.value)}
          />
          <small>Required for destructive decisions and dismissals.</small>
        </label>
        <div className="toolbar">
          <button disabled={!selected.length || processing} onClick={bulkDismiss}>
            {processing ? 'Processing…' : `Dismiss selected (${selected.length})`}
          </button>
        </div>
        {loading ? (
          <Skeleton rows={6} />
        ) : error ? (
          <LoadError message={error} retry={load} />
        ) : !rows.length ? (
          <EmptyState
            title={`No ${kind === 'provider' ? 'provider' : 'community'} reports match this status.`}
            detail="Try another status or clear the search."
            actionLabel={search ? 'Clear search' : undefined}
            onAction={search ? () => setSearch('') : undefined}
          />
        ) : (
          <section className="panel moderation">
            <label className="select-all">
              <input
                className="bulk-check"
                type="checkbox"
                checked={selected.length === rows.length}
                onChange={(event) =>
                  setSelected(event.target.checked ? rows.map((row) => row.id) : [])
                }
              />{' '}
              Select all visible
            </label>
            {rows.map((report) => {
              const commentReport = kind === 'community' && Boolean(report.comment_id);
              const reportedBody = commentReport
                ? report.community_comments?.body
                : report.community_posts?.body;
              return (
                <article key={report.id}>
                  <div>
                    <label>
                      <input
                        className="bulk-check"
                        aria-label={`Select report ${report.id}`}
                        type="checkbox"
                        checked={selected.includes(report.id)}
                        onChange={(event) =>
                          setSelected((current) =>
                            event.target.checked
                              ? [...current, report.id]
                              : current.filter((id) => id !== report.id),
                          )
                        }
                      />
                    </label>
                    <span className="tag">{commentReport ? 'comment' : report.reason}</span>
                    <Status value={report.status} />
                  </div>
                  <h3>
                    {kind === 'provider'
                      ? report.providers?.business_name
                      : `${commentReport ? 'Comment' : 'Post'}: ${String(reportedBody || 'Content unavailable').slice(0, 100)}`}
                  </h3>
                  {commentReport && (
                    <p>
                      On post:{' '}
                      {String(report.community_posts?.body || 'Post unavailable').slice(0, 180)}
                    </p>
                  )}
                  <p>{report.details || report.reason}</p>
                  <small>
                    Report {report.id.slice(0, 8)} · Reporter{' '}
                    {report.reporter_id?.slice(0, 8) || 'anonymous'} ·{' '}
                    {new Date(report.created_at).toLocaleString('en-GB', {
                      timeZone: 'Europe/London',
                    })}
                  </small>
                  <footer>
                    {kind === 'community' && (
                      <>
                        <Link className="text" href={`/community#post-${report.post_id}`}>
                          Open post
                        </Link>
                        {!commentReport && (
                          <>
                            <button
                              disabled={processing}
                              onClick={() => moderatePost(report, 'published')}
                            >
                              Publish post
                            </button>
                            <button
                              className="danger"
                              disabled={processing}
                              onClick={() => moderatePost(report, 'removed')}
                            >
                              Remove post
                            </button>
                          </>
                        )}
                      </>
                    )}
                    <button
                      disabled={processing || report.status !== 'open'}
                      onClick={() => update(report, 'reviewing')}
                    >
                      Mark reviewing
                    </button>
                    <button
                      disabled={processing || !['open', 'reviewing'].includes(report.status)}
                      onClick={() => update(report, 'dismissed')}
                    >
                      Dismiss
                    </button>
                    <button
                      className="danger"
                      disabled={processing || !['open', 'reviewing'].includes(report.status)}
                      onClick={() => update(report, 'resolved')}
                    >
                      {commentReport ? 'Remove comment & resolve' : 'Resolve'}
                    </button>
                  </footer>
                </article>
              );
            })}
            <Pager page={page} total={total} setPage={setPage} disabled={processing} />
          </section>
        )}
      </Page>
    </AdminShell>
  );
}
