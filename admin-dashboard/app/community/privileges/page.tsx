'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from '../../components/admin-link';
import { AdminShell } from '../../components/admin-shell';
import { EmptyState, LoadError, Page, Pager, Skeleton } from '../../components/ui';
import { cleanSearch, range, useAdmin } from '../../../lib/admin';
import { supabase } from '../../../lib/supabase';

type Space = {
  id: string;
  slug: string;
  name: string;
  description: string;
  rules: string;
  visibility: string;
  status: string;
  posting_policy: string;
  comments_enabled: boolean;
  updated_at: string;
};
type Person = { id: string; full_name: string | null; city: string | null };
type Member = {
  user_id: string;
  role: string;
  name: string;
  can_post: boolean;
  can_comment: boolean;
  updated_at: string | null;
};
const blank = {
  slug: '',
  name: '',
  description: '',
  rules: '',
  visibility: 'public',
  status: 'active',
  posting_policy: 'members',
  comments_enabled: true,
};
const actionError = (result: { userMessage: string; diagnostic?: string }) => {
  const safe = [
    'Assign another owner before removing the last owner',
    'Membership changed. Refresh before saving.',
    'Permissions changed. Refresh before saving.',
    'This space changed. Refresh before saving.',
    'General must remain public and active',
  ];
  return safe.find((message) => result.diagnostic?.includes(message)) || result.userMessage;
};

export default function CommunityPrivileges() {
  const admin = useAdmin();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selected, setSelected] = useState('');
  const [draft, setDraft] = useState(blank);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [role, setRole] = useState('member');
  const [canPost, setCanPost] = useState(true);
  const [canComment, setCanComment] = useState(true);
  const [memberReason, setMemberReason] = useState('');
  const memberRequest = useRef(0);
  const active = spaces.find((s) => s.id === selected);
  const load = useCallback(async () => {
    if (!admin.isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const result = await supabase.from('community_spaces').select('*').order('name');
    if (result.error) setError('Community spaces could not be loaded.');
    else setSpaces((result.data || []) as Space[]);
    setLoading(false);
  }, [admin.isAdmin]);
  useEffect(() => {
    void load();
  }, [load]);
  const loadMembers = useCallback(async () => {
    const request = ++memberRequest.current;
    if (!selected || !admin.isAdmin) {
      setMembers([]);
      setTotal(0);
      return;
    }
    const rows = await supabase
      .from('community_memberships')
      .select('user_id,role', { count: 'exact' })
      .eq('space_id', selected)
      .order('joined_at')
      .range(...range(page));
    if (request !== memberRequest.current) return;
    if (rows.error) {
      setError('Memberships could not be loaded.');
      return;
    }
    const ids = (rows.data || []).map((m) => m.user_id as string);
    const [profiles, permissions] = ids.length
      ? await Promise.all([
          supabase.from('profiles').select('id,full_name').in('id', ids),
          supabase
            .from('community_member_permissions')
            .select('*')
            .eq('space_id', selected)
            .in('user_id', ids),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];
    if (request !== memberRequest.current) return;
    if (profiles.error || permissions.error) {
      setError('Member privileges could not be loaded.');
      return;
    }
    setTotal(rows.count || 0);
    setMembers(
      (rows.data || []).map((row) => {
        const permission = permissions.data?.find((p) => p.user_id === row.user_id);
        return {
          ...row,
          name: profiles.data?.find((p) => p.id === row.user_id)?.full_name || 'Community member',
          can_post: permission?.can_post ?? true,
          can_comment: permission?.can_comment ?? true,
          updated_at: permission?.updated_at || null,
        } as Member;
      }),
    );
  }, [selected, page, admin.isAdmin]);
  useEffect(() => {
    setMembers([]);
    void loadMembers();
  }, [loadMembers]);
  useEffect(() => {
    let cancelled = false;
    const search = cleanSearch(query);
    if (!selected || search.length < 2 || !admin.isAdmin) {
      setPeople([]);
      return;
    }
    const timer = setTimeout(async () => {
      let request = supabase.from('profiles').select('id,full_name,city').limit(10);
      request = /^[0-9a-f-]{36}$/i.test(search)
        ? request.eq('id', search)
        : request.ilike('full_name', `%${search}%`);
      const result = await request;
      if (!cancelled) {
        if (result.error) setError('Member search failed.');
        else setPeople(result.data || []);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, selected, admin.isAdmin]);
  const chooseSpace = (id: string) => {
    ++memberRequest.current;
    setSelected(id);
    setPage(0);
    setMember(null);
    setQuery('');
    setPeople([]);
    setReason('');
    setError('');
    const space = spaces.find((s) => s.id === id);
    setDraft(space ? { ...space } : blank);
  };
  const editMember = (row: Member) => {
    setMember(row);
    setRole(row.role || 'member');
    setCanPost(row.can_post);
    setCanComment(row.can_comment);
    setMemberReason('');
  };
  const choosePerson = async (person: Person) => {
    const request = ++memberRequest.current;
    const [membership, permission] = await Promise.all([
      supabase
        .from('community_memberships')
        .select('role')
        .eq('space_id', selected)
        .eq('user_id', person.id)
        .maybeSingle(),
      supabase
        .from('community_member_permissions')
        .select('can_post,can_comment,updated_at')
        .eq('space_id', selected)
        .eq('user_id', person.id)
        .maybeSingle(),
    ]);
    if (request !== memberRequest.current) return;
    if (membership.error || permission.error) {
      setError('Member could not be loaded.');
      return;
    }
    editMember({
      user_id: person.id,
      name: person.full_name || 'Community member',
      role: membership.data?.role || '',
      can_post: permission.data?.can_post ?? true,
      can_comment: permission.data?.can_comment ?? true,
      updated_at: permission.data?.updated_at || null,
    });
    setPeople([]);
    setQuery('');
  };
  async function saveSpace() {
    if (busy || reason.trim().length < 3) return;
    if (
      !(await admin.confirmAction({
        title: active ? 'Update community space' : 'Create community space',
        message: `Save the visibility and participation rules for ${draft.name}?`,
        confirmLabel: 'Save space',
      }))
    )
      return;
    setBusy(true);
    try {
      const result = await admin.act(
        'community_space_save',
        'community_space',
        selected || 'new',
        () =>
          supabase.rpc('admin_save_community_space', {
            target_space: selected || null,
            changes: draft,
            expected_updated_at: active?.updated_at || null,
            decision_note: reason.trim(),
          }),
        { server_audited: true },
      );
      if (result.ok) {
        setSelected(String(result.data));
        setReason('');
        await load();
      } else setError(actionError(result));
    } finally {
      setBusy(false);
    }
  }
  async function saveMember(remove = false) {
    if (!member || busy || memberReason.trim().length < 3) return;
    if (
      !(await admin.confirmAction({
        title: remove ? 'Remove space membership' : 'Change community privileges',
        message: `${member.name}: ${remove ? 'remove membership (public spaces can be rejoined)' : `set ${role} role, posting ${canPost ? 'allowed' : 'restricted'}, comments ${canComment ? 'allowed' : 'restricted'}`}. This does not grant platform administrator access.`,
        confirmLabel: remove ? 'Remove membership' : 'Save privileges',
      }))
    )
      return;
    setBusy(true);
    try {
      const result = await admin.act(
        'community_member_privileges',
        'community_space',
        selected,
        () =>
          supabase.rpc('admin_set_community_member', {
            target_space: selected,
            target_user: member.user_id,
            new_role: remove ? null : role,
            allow_posts: canPost,
            allow_comments: canComment,
            expected_role: member.role || null,
            expected_permission_update: member.updated_at,
            decision_note: memberReason.trim(),
          }),
        { server_audited: true },
      );
      if (result.ok) {
        setMember(null);
        await loadMembers();
        setError('');
      } else setError(actionError(result));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminShell title="Community privileges">
      <Page
        title="Community privileges"
        note="Manage spaces and participation. Owner and moderator roles apply only within a community; dashboard access remains limited to platform administrators."
      >
        <nav className="quick" aria-label="Community tools">
          <Link href="/community">Live community feed</Link>
          <Link href="/moderation/community">Reports and moderation</Link>
          <Link href="/audit">Audit log</Link>
        </nav>
        {error && (
          <LoadError
            message={error}
            retry={async () => {
              setError('');
              await load();
              await loadMembers();
            }}
          />
        )}
        {loading ? (
          <Skeleton />
        ) : (
          <>
            <section className="panel form-grid">
              <label className="field">
                Community space
                <select
                  value={selected}
                  disabled={busy}
                  onChange={(e) => chooseSpace(e.target.value)}
                >
                  <option value="">Create a new space</option>
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Name
                <input
                  value={draft.name}
                  maxLength={80}
                  disabled={busy}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <label className="field">
                Address slug
                <input
                  value={draft.slug}
                  disabled={busy || !!active}
                  maxLength={40}
                  placeholder="local-events"
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase() })}
                />
              </label>
              <label className="field">
                Description
                <textarea
                  value={draft.description}
                  maxLength={2000}
                  disabled={busy}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </label>
              <label className="field">
                Community rules
                <textarea
                  value={draft.rules}
                  maxLength={10000}
                  disabled={busy}
                  onChange={(e) => setDraft({ ...draft, rules: e.target.value })}
                />
              </label>
              <label className="field">
                Visibility
                <select
                  value={draft.visibility}
                  disabled={busy || active?.slug === 'general'}
                  onChange={(e) => setDraft({ ...draft, visibility: e.target.value })}
                >
                  <option value="public">Public</option>
                  <option value="private">Private — members only</option>
                </select>
              </label>
              <label className="field">
                Status
                <select
                  value={draft.status}
                  disabled={busy || !active || active.slug === 'general'}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived — hidden from the app</option>
                </select>
              </label>
              <label className="field">
                Who can post?
                <select
                  value={draft.posting_policy}
                  disabled={busy}
                  onChange={(e) => setDraft({ ...draft, posting_policy: e.target.value })}
                >
                  <option value="members">Members</option>
                  <option value="moderators">Owners and moderators</option>
                  <option value="closed">Posting closed</option>
                </select>
              </label>
              <label className="field">
                <span>Comments enabled</span>
                <input
                  type="checkbox"
                  checked={draft.comments_enabled}
                  disabled={busy}
                  onChange={(e) => setDraft({ ...draft, comments_enabled: e.target.checked })}
                />
              </label>
              <label className="field">
                Reason for change
                <textarea
                  value={reason}
                  maxLength={1000}
                  disabled={busy}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <button
                className="primary"
                disabled={
                  busy ||
                  reason.trim().length < 3 ||
                  draft.name.trim().length < 2 ||
                  !/^[a-z0-9][a-z0-9-]{1,39}$/.test(draft.slug)
                }
                onClick={() => void saveSpace()}
              >
                {busy ? 'Saving…' : 'Save space'}
              </button>
            </section>
            {active && (
              <>
                <section className="panel">
                  <h3>Members and roles</h3>
                  <p>
                    Members follow the space rules. Owners and moderators can post when posting is
                    limited to those roles. Individual restrictions take precedence. Assign a
                    replacement before removing the last owner.
                  </p>
                  <label className="field">
                    Find a user to add or manage
                    <input
                      type="search"
                      value={query}
                      disabled={busy}
                      placeholder="Name or user ID"
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  {people.map((p) => (
                    <button key={p.id} disabled={busy} onClick={() => void choosePerson(p)}>
                      {p.full_name || 'Unnamed member'} · {p.city || 'No city'} · {p.id.slice(0, 8)}
                    </button>
                  ))}
                  {members.length ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Member</th>
                            <th>Role</th>
                            <th>Can post</th>
                            <th>Can comment</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((m) => (
                            <tr key={m.user_id}>
                              <td>
                                {m.name}
                                <br />
                                <small>{m.user_id}</small>
                              </td>
                              <td>{m.role}</td>
                              <td>{m.can_post ? 'Yes' : 'Restricted'}</td>
                              <td>{m.can_comment ? 'Yes' : 'Restricted'}</td>
                              <td>
                                <button disabled={busy} onClick={() => editMember(m)}>
                                  Edit privileges
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      title="No members on this page"
                      detail="Find a user above to add them to this space."
                    />
                  )}
                  <Pager page={page} total={total} setPage={setPage} disabled={busy} />
                </section>
                {member && (
                  <section className="panel form-grid">
                    <h3>Privileges for {member.name}</h3>
                    <p>{member.user_id}</p>
                    <label className="field">
                      Community role
                      <select
                        value={role}
                        disabled={busy}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        <option value="member">Member</option>
                        <option value="moderator">Moderator</option>
                        <option value="owner">Owner</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Allow posting</span>
                      <input
                        type="checkbox"
                        checked={canPost}
                        disabled={busy}
                        onChange={(e) => setCanPost(e.target.checked)}
                      />
                    </label>
                    <label className="field">
                      <span>Allow comments</span>
                      <input
                        type="checkbox"
                        checked={canComment}
                        disabled={busy}
                        onChange={(e) => setCanComment(e.target.checked)}
                      />
                    </label>
                    <label className="field">
                      Reason for privilege change
                      <textarea
                        value={memberReason}
                        maxLength={1000}
                        disabled={busy}
                        onChange={(e) => setMemberReason(e.target.value)}
                      />
                    </label>
                    <button
                      className="primary"
                      disabled={busy || memberReason.trim().length < 3}
                      onClick={() => void saveMember()}
                    >
                      Save privileges
                    </button>
                    {member.role && (
                      <button
                        className="danger"
                        disabled={busy || memberReason.trim().length < 3}
                        onClick={() => void saveMember(true)}
                      >
                        Remove membership
                      </button>
                    )}
                    <button disabled={busy} onClick={() => setMember(null)}>
                      Cancel
                    </button>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </Page>
    </AdminShell>
  );
}
