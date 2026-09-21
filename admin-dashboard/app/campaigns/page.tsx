"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "../components/admin-shell";
import { EmptyState, Page, Skeleton, Status } from "../components/ui";
import { useAdmin } from "../../lib/admin";
import { supabase } from "../../lib/supabase";

type Row = Record<string, any>;

export default function CampaignsPage() {
  const admin = useAdmin();
  const [enquiries, setEnquiries] = useState<Row[]>([]);
  const [campaigns, setCampaigns] = useState<Row[]>([]);
  const [performance, setPerformance] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const [e, c, p] = await Promise.all([
      supabase.from("ad_campaign_enquiries").select("id,provider_id,contact_email,objective,target_cities,requested_start,requested_end,budget_pence,status,created_at,providers(business_name)").order("created_at", { ascending: false }).range(0, 99),
      supabase.from("ad_campaigns").select("id,provider_id,name,headline,status,starts_at,ends_at,approved_at,providers(business_name)").order("created_at", { ascending: false }).range(0, 99),
      supabase.from("ad_campaign_performance").select("*").range(0, 99),
    ]);
    if (e.error || c.error || p.error) admin.notify("Campaign operations could not be loaded.", "error");
    setEnquiries(e.data || []); setCampaigns(c.data || []); setPerformance(p.data || []); setLoading(false);
  }, [admin.notify]);
  useEffect(() => { void load(); }, [load]);

  async function transition(row: Row, status: string) {
    const approved = status === "approved" ? { approved_by: admin.session?.user.id, approved_at: new Date().toISOString() } : {};
    const result = await admin.act(`campaign_${status}`, "ad_campaign", row.id, () =>
      supabase.from("ad_campaigns").update({ status, ...approved, updated_at: new Date().toISOString() }).eq("id", row.id).eq("status", row.status),
    );
    if (result.ok) void load();
  }

  return <AdminShell title="Advertising campaigns"><Page title="Campaign operations" note="Qualify enquiries, approve creatives and schedules, pause delivery, and inspect measured performance.">
    {loading ? <Skeleton rows={8} /> : <>
      <section className="panel table"><h3>Campaign enquiries</h3>{enquiries.length ? <table><thead><tr><th>Provider</th><th>Objective</th><th>Dates</th><th>Budget</th><th>Status</th></tr></thead><tbody>{enquiries.map(row => <tr key={row.id}><td>{row.providers?.business_name}<small>{row.contact_email}</small></td><td>{row.objective}</td><td>{row.requested_start || "Flexible"} – {row.requested_end || "Flexible"}</td><td>{row.budget_pence ? `£${(row.budget_pence / 100).toFixed(2)}` : "—"}</td><td><Status value={row.status} /></td></tr>)}</tbody></table> : <EmptyState title="No campaign enquiries" />}</section>
      <section className="panel table"><h3>Scheduled inventory</h3>{campaigns.length ? <table><thead><tr><th>Campaign</th><th>Provider</th><th>Window</th><th>Status</th><th>Controls</th></tr></thead><tbody>{campaigns.map(row => <tr key={row.id}><td>{row.headline}</td><td>{row.providers?.business_name}</td><td>{new Date(row.starts_at).toLocaleDateString("en-GB")} – {new Date(row.ends_at).toLocaleDateString("en-GB")}</td><td><Status value={row.status} /></td><td>{row.status === "in_review" && <button onClick={() => transition(row, "approved")}>Approve</button>}{["approved","scheduled","active"].includes(row.status) && <button className="danger" onClick={() => transition(row, "paused")}>Pause</button>}</td></tr>)}</tbody></table> : <EmptyState title="No campaign inventory" detail="Approved campaigns will appear here." />}</section>
      <section className="panel table"><h3>Performance reporting</h3>{performance.length ? <table><thead><tr><th>Campaign</th><th>Impressions</th><th>Clicks</th><th>CTR</th></tr></thead><tbody>{performance.map(row => <tr key={row.id}><td>{row.name}</td><td>{row.impressions}</td><td>{row.clicks}</td><td>{row.click_through_rate}%</td></tr>)}</tbody></table> : <EmptyState title="No delivery data" />}</section>
    </>}
  </Page></AdminShell>;
}
