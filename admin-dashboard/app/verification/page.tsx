"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VerificationDocumentRow, VerificationRequestRow, VerificationStatus } from "../../lib/database.types";
import { range, useAdmin } from "../../lib/admin";
import { isLegalTransition } from "../../lib/operations";
import { supabase } from "../../lib/supabase";
import { AdminShell } from "../components/admin-shell";
import { EmptyState, LoadError, Page, Pager, Skeleton, Status } from "../components/ui";

const filters: Array<VerificationStatus | "all"> = ["pending", "changes_requested", "approved", "rejected", "revoked", "all"];
export default function Verification() {
  const admin = useAdmin();
  const [rows, setRows] = useState<VerificationRequestRow[]>([]), [selected, setSelected] = useState<VerificationRequestRow | null>(null), [docs, setDocs] = useState<VerificationDocumentRow[]>([]);
  const [note, setNote] = useState(""), [status, setStatus] = useState<VerificationStatus | "all">("pending"), [page, setPage] = useState(0), [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true), [docsLoading, setDocsLoading] = useState(false), [processing, setProcessing] = useState(false), [error, setError] = useState(""), [docsError, setDocsError] = useState("");
  const requestId = useRef(0);
  const load = useCallback(async () => { const active = ++requestId.current; setLoading(true); setError(""); let request = supabase.from("verification_requests").select("*,providers(business_name,base_city)", { count: "exact" }).order("submitted_at", { ascending: false }).range(...range(page)); if (status !== "all") request = request.eq("status", status); const result = await request; if (active !== requestId.current) return; if (result.error) setError("Verification requests are unavailable."); else { const nextRows = (result.data ?? []) as unknown as VerificationRequestRow[]; setRows(nextRows); setTotal(result.count ?? 0); setSelected(current => nextRows.find(row => row.id === current?.id) ?? nextRows[0] ?? null); } setLoading(false); }, [page, status]);
  const loadDocs = useCallback(async (request: VerificationRequestRow | null) => { if (!request) { setDocs([]); return; } setDocsLoading(true); setDocsError(""); const result = await supabase.from("verification_documents").select("*").eq("request_id", request.id).order("created_at", { ascending: false }); if (result.error) { setDocsError("Evidence documents could not be loaded."); setDocs([]); } else setDocs((result.data ?? []) as VerificationDocumentRow[]); setDocsLoading(false); }, []);
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
    let active = true;
    const run = async () => {
      if (!active) return;
      await loadDocs(selected);
    };
    void run();
    return () => { active = false; };
  }, [loadDocs, selected]);
  useEffect(() => { const channel = supabase.channel("verification-admin-queue").on("postgres_changes", { event: "*", schema: "public", table: "verification_requests" }, () => void load()).subscribe(); return () => { void supabase.removeChannel(channel); }; }, [load]);

  async function decide(decision: VerificationStatus) {
    if (!selected || processing || !isLegalTransition("verification", selected.status, decision)) return;
    if (["rejected", "revoked", "changes_requested"].includes(decision) && note.trim().length < 8) { admin.notify("Enter a decision note of at least 8 characters.", "error"); return; }
    if (decision === "approved" && !docs.length) { admin.notify("Approval requires at least one evidence document.", "error"); return; }
    const name = selected.providers?.business_name || "this provider";
    if (!await admin.confirmAction({ title: `${decision.replaceAll("_", " ")} verification`, message: `Change verification for ${name}?`, requiredText: ["approved", "revoked"].includes(decision) ? name : undefined, confirmLabel: `Confirm ${decision.replaceAll("_", " ")}` })) return;
    setProcessing(true);
    const result = await admin.act(`verification_${decision}`, "verification_request", selected.id, () => supabase.rpc("admin_decide_verification", { request_id: selected.id, expected_status: selected.status, expected_updated_at: selected.updated_at ?? null, decision, decision_note: note.trim() || null }), { server_audited: true, reason: note.trim() || null, previous_status: selected.status, new_status: decision });
    if (result.ok) { setNote(""); await load(); }
    setProcessing(false);
  }
  async function openDocument(doc: VerificationDocumentRow) { const result = await supabase.storage.from("verification-documents").createSignedUrl(doc.storage_path, 120); if (result.error) admin.notify("The document link could not be created.", "error"); else window.open(result.data.signedUrl, "_blank", "noopener,noreferrer"); }

  return <AdminShell title="Verification"><Page title="Verification operations" note="Evidence review with server-validated, audited decisions.">
    <div className="pills" aria-label="Verification status filter">{filters.map(value => <button key={value} aria-pressed={status === value} className={status === value ? "on" : ""} onClick={() => { setStatus(value); setPage(0); }}>{value.replaceAll("_", " ")}</button>)}</div>
    {loading ? <Skeleton rows={6} /> : error ? <LoadError message={error} retry={load} /> : !rows.length ? <EmptyState title="No verification requests are waiting." detail="Choose another status to inspect completed requests." /> : <div className="verify"><section className="panel list">{rows.map(row => <button className={selected?.id === row.id ? "selected" : ""} key={row.id} onClick={() => setSelected(row)}><i aria-hidden="true">{row.providers?.business_name?.[0]}</i><span><b>{row.providers?.business_name}</b><small>{new Date(row.submitted_at).toLocaleDateString("en-GB", { timeZone: "Europe/London" })}</small></span><Status value={row.status} /></button>)}<Pager page={page} total={total} setPage={setPage} disabled={processing} /></section>{selected && <section className="panel dossier"><h3>{selected.providers?.business_name}</h3><p>{selected.notes || "No provider note."}</p><h4>Evidence documents</h4>{docsLoading ? <Skeleton rows={2} /> : docsError ? <LoadError message={docsError} retry={() => loadDocs(selected)} /> : docs.length ? docs.map(doc => <button className="document" key={doc.id} onClick={() => void openDocument(doc)}><b>{doc.document_type}</b><span>{doc.original_filename || "Protected document"} · {doc.created_at ? new Date(doc.created_at).toLocaleDateString("en-GB", { timeZone: "Europe/London" }) : "Upload date unavailable"}</span><small>Open a 2-minute signed link</small></button>) : <EmptyState title="No evidence documents were uploaded." />}
      <label className="field" htmlFor="verification-note"><span>Decision note</span><textarea id="verification-note" value={note} minLength={8} maxLength={1000} onChange={event => setNote(event.target.value)} /><small>Required for rejection, revocation, and changes requested.</small></label>
      <div className="decision">{selected.status === "pending" && <><button disabled={processing} onClick={() => void decide("changes_requested")}>Request changes</button><button className="danger" disabled={processing} onClick={() => void decide("rejected")}>Reject</button><button className="primary" disabled={processing || !docs.length} onClick={() => void decide("approved")}>{processing ? "Processing…" : "Approve"}</button></>}{selected.status === "approved" && <button className="danger" disabled={processing} onClick={() => void decide("revoked")}>Revoke</button>}{["rejected", "changes_requested", "revoked"].includes(selected.status) && <button disabled={processing} onClick={() => void decide("pending")}>Reopen</button>}</div></section>}</div>}
  </Page></AdminShell>;
}
