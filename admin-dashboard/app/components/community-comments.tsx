'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { range, useAdminActions } from '../../lib/admin';
import { LoadError, Pager, Skeleton, Status } from './ui';
type Comment = {
  id: string;
  body: string;
  status: string;
  author_id: string;
  created_at: string;
  parent_comment_id: string | null;
};
export function CommunityComments({ postId }: { postId: string }) {
  const admin = useAdminActions();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const requestId = useRef(0);
  const load = useCallback(
    async (quiet = false) => {
      const request = ++requestId.current;
      if (!quiet) setLoading(true);
      try {
        const result = await supabase
          .from('community_comments')
          .select('id,body,status,author_id,created_at,parent_comment_id', { count: 'exact' })
          .eq('post_id', postId)
          .order('created_at', { ascending: false })
          .range(...range(page));
        if (request !== requestId.current) return;
        if (result.error) throw result.error;
        setRows(result.data || []);
        setTotal(result.count || 0);
        setError('');
      } catch {
        if (request === requestId.current) setError('Comments could not be loaded.');
      } finally {
        if (request === requestId.current) setLoading(false);
      }
    },
    [page, postId],
  );
  useEffect(() => {
    if (!open) return;
    const start = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true);
    }, 30000);
    return () => {
      clearTimeout(start);
      clearInterval(timer);
      requestId.current += 1;
    };
  }, [load, open]);
  async function moderate(row: Comment) {
    const next = row.status === 'removed' ? 'published' : 'removed';
    const note = (notes[row.id] || '').trim();
    if (note.length < 8)
      return admin.notify('Give a comment moderation reason of at least 8 characters.', 'error');
    if (
      !(await admin.confirmAction({
        title: next === 'removed' ? 'Remove comment' : 'Restore comment',
        message: 'This changes comment visibility and records your reason in the audit log.',
        confirmLabel: next === 'removed' ? 'Remove comment' : 'Restore comment',
      }))
    )
      return;
    const result = await admin.act(
      'community_comment_' + next,
      'community_comment',
      row.id,
      () =>
        supabase.rpc('admin_transition_community_comment', {
          comment_id: row.id,
          expected_status: row.status,
          next_status: next,
          reason: note,
        }),
      { server_audited: true },
    );
    if (result.ok) {
      setNotes((current) => ({ ...current, [row.id]: '' }));
      await load(true);
    }
  }
  return (
    <div className="comment-controls">
      <button
        aria-expanded={open}
        aria-controls={'comments-' + postId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Close comments' : 'Inspect & moderate comments'}
      </button>
      {open && (
        <div id={'comments-' + postId}>
          {loading ? (
            <Skeleton rows={3} />
          ) : error ? (
            <LoadError message={error} retry={load} />
          ) : !rows.length ? (
            <p>No comments on this post.</p>
          ) : (
            <>
              <ul className="comment-list">
                {rows.map((row) => (
                  <li key={row.id}>
                    <Status value={row.status} />
                    <p>{row.body}</p>
                    <small>
                      Author {row.author_id} | {new Date(row.created_at).toLocaleString('en-GB')}
                      {row.parent_comment_id ? ' | Reply' : ''}
                    </small>
                    <label className="field" htmlFor={'comment-note-' + row.id}>
                      Reason
                      <textarea
                        id={'comment-note-' + row.id}
                        maxLength={1000}
                        value={notes[row.id] || ''}
                        onChange={(event) =>
                          setNotes((current) => ({ ...current, [row.id]: event.target.value }))
                        }
                      />
                    </label>
                    <button
                      className={row.status === 'removed' ? '' : 'danger'}
                      disabled={admin.pending.has(
                        'community_comment_' +
                          (row.status === 'removed' ? 'published' : 'removed') +
                          ':community_comment:' +
                          row.id,
                      )}
                      onClick={() => void moderate(row)}
                    >
                      {row.status === 'removed' ? 'Restore comment' : 'Remove comment'}
                    </button>
                  </li>
                ))}
              </ul>
              <Pager page={page} total={total} setPage={setPage} />
            </>
          )}
          <button onClick={() => void load()} disabled={loading}>
            Refresh comments
          </button>
        </div>
      )}
    </div>
  );
}
