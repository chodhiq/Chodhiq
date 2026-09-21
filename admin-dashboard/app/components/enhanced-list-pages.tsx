"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "./admin-link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PaymentListRow, ProviderListRow, UserListRow } from "../../lib/database.types";
import { cleanSearch, range, useAdmin } from "../../lib/admin";
import { runBoundedBulk, safeErrorDiagnostic, type MutationResult } from "../../lib/operations";
import { supabase } from "../../lib/supabase";
import { AdminShell } from "./admin-shell";
import { EmptyState, LoadError, Page, Pager, Search, Skeleton, Status, exportCsv } from "./ui";

const datedFilename = (name: string) => `chodhiq-${name}-${new Date().toISOString().slice(0, 10)}.csv`;

export function ProvidersOperationsPage() {
  const admin = useAdmin();
  const [rows, setRows] = useState<ProviderListRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const activeRequest = ++requestId.current;
    setLoading(true); setError("");
    let request = supabase.from("providers").select("id,business_name,base_city,verification_status,sponsored_rank,categories(name)", { count: "exact" }).order("created_at", { ascending: false }).range(...range(page));
    const search = cleanSearch(query);
    if (search) request = request.or(`business_name.ilike.%${search}%,base_city.ilike.%${search}%`);
    const result = await request;
    if (activeRequest !== requestId.current) return;
    if (result.error) setError("Provider records are unavailable. Refresh and retry.");
    else { setRows((result.data ?? []) as unknown as ProviderListRow[]); setTotal(result.count ?? 0); }
    setLoading(false);
  }, [page, query]);
  useEffect(() => { void load(); return () => { requestId.current += 1; }; }, [load]);

  async function suspendSelected() {
    if (!selected.length || processing) return;
    const names = rows.filter(row => selected.includes(row.id)).map(row => row.business_name);
    if (!await admin.confirmAction({ title: "Suspend selected providers", message: `Remove ${names.length} providers from marketplace visibility?`, requiredText: "SUSPEND", confirmLabel: "Suspend providers" })) return;
    setProcessing(true);
    const summary = await runBoundedBulk(selected, id => admin.act("provider_bulk_suspended", "provider", id, () => supabase.from("providers").update({ verification_status: "suspended", is_verified: false }).eq("id", id), { bulk: true, reason: "Administrator bulk moderation" }));
    setSelected(summary.failed);
    admin.notify(summary.message, summary.failed.length ? "error" : "success");
    await load();
    setProcessing(false);
  }

  const csvRows = rows.map(row => ({ id: row.id, business_name: row.business_name, category: row.categories?.name, city: row.base_city, sponsored_rank: row.sponsored_rank, status: row.verification_status }));
  return <AdminShell title="Providers"><Page title="Provider directory" note="Search, export the current page, bulk-moderate, or open a provider dossier.">
    <Search id="provider-search" label="Search providers" value={query} onChange={value => { setQuery(value); setPage(0); }} />
    <div className="toolbar"><button className="danger" disabled={!selected.length || processing} onClick={suspendSelected}>{processing ? "Suspending…" : `Suspend selected (${selected.length})`}</button><button className="export" disabled={!rows.length} onClick={() => exportCsv(datedFilename("providers-current-page"), csvRows)}>Export current page CSV</button></div>
    {loading ? <Skeleton rows={7} /> : error ? <LoadError message={error} retry={load} /> : !rows.length ? <EmptyState title={query ? "No providers match your search." : "No providers are available."} actionLabel={query ? "Clear search" : undefined} onAction={query ? () => setQuery("") : undefined} /> : <section className="panel table"><table><thead><tr><th><input className="bulk-check" aria-label="Select all providers on this page" type="checkbox" checked={selected.length === rows.length} onChange={event => setSelected(event.target.checked ? rows.map(row => row.id) : [])} /></th><th>Business</th><th>Category</th><th>City</th><th>Sponsored rank</th><th>Status</th><th className="sticky-action">Details</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><input className="bulk-check" aria-label={`Select ${row.business_name}`} type="checkbox" checked={selected.includes(row.id)} onChange={event => setSelected(current => event.target.checked ? [...current, row.id] : current.filter(id => id !== row.id))} /></td><td><b>{row.business_name}</b></td><td>{row.categories?.name || "—"}</td><td>{row.base_city || "—"}</td><td>{row.sponsored_rank ?? 0}</td><td><Status value={row.verification_status} /></td><td className="sticky-action"><Link href={`/providers/${row.id}`}>Open dossier</Link></td></tr>)}</tbody></table><Pager page={page} total={total} setPage={setPage} /></section>}
  </Page></AdminShell>;
}

export function UsersOperationsPage() {
  const admin = useAdmin();
  const [rows, setRows] = useState<UserListRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const activeRequest = ++requestId.current;
    setLoading(true); setError("");
    let request = supabase.from("profiles").select("id,full_name,city,created_at", { count: "exact" }).order("created_at", { ascending: false }).range(...range(page));
    const search = cleanSearch(query);
    if (search) request = request.or(`full_name.ilike.%${search}%,city.ilike.%${search}%`);
    const result = await request;
    if (activeRequest !== requestId.current) return;
    if (result.error) setError("User records are unavailable. Refresh and retry.");
    else {
      const profiles = result.data ?? [];
      // Both tables reference auth.users; PostgREST cannot embed moderation
      // directly into profiles without a foreign key between the public tables.
      const moderation = profiles.length
        ? await supabase.from("user_moderation_status").select("user_id,status,reason").in("user_id", profiles.map(row => row.id))
        : { data: [], error: null };
      if (activeRequest !== requestId.current) return;
      if (moderation.error) setError("User moderation status is unavailable. Refresh and retry.");
      else {
        setRows(profiles.map(row => ({ ...row, user_moderation_status: (moderation.data ?? []).filter(state => state.user_id === row.id) })) as UserListRow[]);
        setTotal(result.count ?? 0);
      }
    }
    setLoading(false);
  }, [page, query]);
  useEffect(() => { void load(); return () => { requestId.current += 1; }; }, [load]);

  async function control(ids: string[], action: "suspend" | "reactivate") {
    if (!ids.length || processing) return;
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 8) { admin.notify("Enter a reason of at least 8 characters.", "error"); return; }
    if (!await admin.confirmAction({ title: `${action === "suspend" ? "Suspend" : "Reactivate"} user accounts`, message: `${action === "suspend" ? "Block" : "Restore"} ${ids.length} selected account${ids.length === 1 ? "" : "s"}?`, requiredText: ids.length > 1 ? action.toUpperCase() : undefined, confirmLabel: `${action === "suspend" ? "Suspend" : "Reactivate"} accounts` })) return;
    setProcessing(true);
    const summary = await runBoundedBulk(ids, async userId => {
      const correlationId = crypto.randomUUID();
      const response = await supabase.functions.invoke("admin-user-control", { body: { userId, action, reason: trimmedReason, idempotencyKey: correlationId } });
      if (response.error || response.data?.error) return { ok: false, code: response.data?.code === "partial_failure" ? "partial_failure" : "mutation_failed", userMessage: response.data?.message || "User state could not be updated.", diagnostic: safeErrorDiagnostic(response.error || response.data?.error), correlationId } satisfies MutationResult<undefined>;
      return { ok: true, data: undefined, correlationId } satisfies MutationResult<undefined>;
    });
    setSelected(summary.failed);
    admin.notify(`${summary.message}${summary.failed.length ? " Failed accounts remain selected; refresh their state before retrying." : ""}`, summary.failed.length ? "error" : "success");
    await load();
    if (!summary.failed.length) setReason("");
    setProcessing(false);
  }

  const csvRows = rows.map(row => ({ id: row.id, name: row.full_name, city: row.city, joined: row.created_at, status: row.user_moderation_status?.[0]?.status || "active" }));
  return <AdminShell title="Users"><Page title="User management" note="Suspend or reactivate users through the trusted admin function.">
    <Search id="user-search" label="Search users" value={query} onChange={value => { setQuery(value); setPage(0); }} />
    <label className="field" htmlFor="user-control-reason"><span>Moderation reason or reactivation note</span><input id="user-control-reason" value={reason} minLength={8} maxLength={500} onChange={event => setReason(event.target.value)} aria-describedby="user-control-help" /><small id="user-control-help">Required for both suspension and reactivation; 8–500 characters.</small></label>
    <div className="toolbar"><button className="danger" disabled={!selected.length || processing} onClick={() => control(selected, "suspend")}>{processing ? "Processing…" : `Suspend selected (${selected.length})`}</button><button disabled={!selected.length || processing} onClick={() => control(selected, "reactivate")}>Reactivate selected</button><button className="export" disabled={!rows.length} onClick={() => exportCsv(datedFilename("users-current-page"), csvRows)}>Export current page CSV</button></div>
    {loading ? <Skeleton rows={7} /> : error ? <LoadError message={error} retry={load} /> : !rows.length ? <EmptyState title={query ? "No users match your search." : "No user records are available."} actionLabel={query ? "Clear search" : undefined} onAction={query ? () => setQuery("") : undefined} /> : <section className="panel table"><table><thead><tr><th><input className="bulk-check" aria-label="Select all users on this page" type="checkbox" checked={selected.length === rows.length} onChange={event => setSelected(event.target.checked ? rows.map(row => row.id) : [])} /></th><th>User</th><th>City</th><th>Joined</th><th>Status</th><th className="sticky-action">Control</th></tr></thead><tbody>{rows.map(row => { const status = row.user_moderation_status?.[0]?.status || "active"; const self = row.id === admin.session?.user.id; return <tr key={row.id}><td><input className="bulk-check" aria-label={`Select ${row.full_name || row.id}`} type="checkbox" disabled={self} checked={selected.includes(row.id)} onChange={event => setSelected(current => event.target.checked ? [...current, row.id] : current.filter(id => id !== row.id))} /></td><td>{row.full_name || row.id.slice(0, 8)}{self ? " (you)" : ""}</td><td>{row.city || "—"}</td><td>{new Date(row.created_at).toLocaleDateString("en-GB", { timeZone: "Europe/London" })}</td><td><Status value={status} /></td><td className="sticky-action"><button className={status === "active" ? "danger" : ""} disabled={self || processing} onClick={() => control([row.id], status === "suspended" ? "reactivate" : "suspend")}>{status === "suspended" ? "Reactivate" : "Suspend"}</button></td></tr>; })}</tbody></table><Pager page={page} total={total} setPage={setPage} /></section>}
  </Page></AdminShell>;
}

export function PaymentsOperationsPage() {
  const [rows, setRows] = useState<PaymentListRow[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const activeRequest = ++requestId.current;
    setLoading(true); setError("");
    const result = await supabase.from("payment_records").select("id,provider_id,transaction_id,amount_pence,currency,status,receipt_url,invoice_url,created_at,providers(business_name)", { count: "exact" }).order("created_at", { ascending: false }).range(...range(page));
    if (activeRequest !== requestId.current) return;
    if (result.error) setError("Payment records are unavailable. Refresh and retry.");
    else { setRows((result.data ?? []) as unknown as PaymentListRow[]); setTotal(result.count ?? 0); }
    setLoading(false);
  }, [page]);
  useEffect(() => { void load(); return () => { requestId.current += 1; }; }, [load]);
  const csvRows = rows.map(row => ({ id: row.id, provider: row.providers?.business_name, transaction_id: row.transaction_id, amount_pence: row.amount_pence, currency: row.currency, status: row.status, created_at: row.created_at }));
  return <AdminShell title="Payments"><Page title="Payment records" note="Read-only payment ledger. Exports contain only the current page."><div className="toolbar"><button className="export" disabled={!rows.length} onClick={() => exportCsv(datedFilename("payments-current-page"), csvRows)}>Export current page CSV</button></div>{loading ? <Skeleton rows={7} /> : error ? <LoadError message={error} retry={load} /> : !rows.length ? <EmptyState title="No payment records are available." /> : <section className="panel table"><table><thead><tr><th>Provider</th><th>Transaction</th><th>Amount</th><th>Status</th><th>Created</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.providers?.business_name || row.provider_id.slice(0, 8)}</td><td>{row.transaction_id || "—"}</td><td>{new Intl.NumberFormat("en-GB", { style: "currency", currency: String(row.currency || "gbp").toUpperCase() }).format(row.amount_pence / 100)}</td><td><Status value={row.status} /></td><td>{new Date(row.created_at).toLocaleDateString("en-GB", { timeZone: "Europe/London" })}</td></tr>)}</tbody></table><Pager page={page} total={total} setPage={setPage} /></section>}</Page></AdminShell>;
}
