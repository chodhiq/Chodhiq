"use client";

import { memo, useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { usePathname } from "next/navigation";
import { PAGE_SIZE } from "../../lib/admin";
import { csvSafeValue } from "../../lib/operations";
import Link from "./admin-link";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="head"><div><span className="page-kicker">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>{action}</div>;
}

export type PageStat = { label: string; value: ReactNode; icon?: ReactNode; href?: string; tone?: 'teal' | 'green' | 'purple' | 'amber' };

export function Page({ title, note, children, className = '', stats }: { title: string; note: string; children: ReactNode; className?: string; stats?: PageStat[] }) {
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT_LABEL?.trim();
  const pathname = usePathname() || '/';
  const routeClass = pathname === '/' ? 'dashboard' : pathname.slice(1).replace(/\//g, '-').replace(/[^a-z0-9-]/gi, '');
  const sections: Record<string, string> = {
    dashboard: 'Admin control center',
    applications: 'Marketplace · Provider onboarding',
    providers: 'Marketplace · Provider directory',
    users: 'Marketplace · Customer accounts',
    categories: 'Marketplace · Service catalogue',
    activity: 'Marketplace · Bookings & quotes',
    demand: 'Marketplace · Demand signals',
    reviews: 'Trust & safety · Review moderation',
    verification: 'Trust & safety · Provider checks',
    community: 'Trust & safety · Community',
    'community-privileges': 'Trust & safety · Access controls',
    'moderation-community': 'Trust & safety · Community reports',
    'moderation-providers': 'Trust & safety · Provider reports',
    'reports-community': 'Trust & safety · Community reports',
    'reports-providers': 'Trust & safety · Provider reports',
    campaigns: 'Growth · Advertising',
    notifications: 'Growth · Communications',
    analytics: 'Growth · Marketplace insights',
    payments: 'Finance · Payment ledger',
    subscriptions: 'Finance · Entitlements',
    admins: 'Governance · Administrator access',
    audit: 'Governance · Audit history',
  };
  const section = pathname.startsWith('/providers/') ? 'Marketplace · Provider dossier' : sections[routeClass] || 'Marketplace operations';
  return <div className={`page page-route-${routeClass} ${className}`} data-route={routeClass}><PageHeader eyebrow={section} title={title} description={note} action={environment && <span className="environment-badge" aria-label={`${environment} environment`}>{environment}</span>} />{stats?.length ? <div className="metrics dashboard-metrics">{stats.map((stat, index) => <StatCard key={stat.label} icon={stat.icon ?? ['A', '✓', 'B', '!'][index % 4]} label={stat.label} value={stat.value} href={stat.href ?? pathname} tone={stat.tone ?? (['teal', 'green', 'purple', 'amber'] as const)[index % 4]} />)}</div> : null}{children}</div>;
}

export function HeroBanner({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <section className="dashboard-welcome" aria-label={eyebrow}><div className="dashboard-welcome-copy"><span className="dashboard-eyebrow"><i aria-hidden="true" />{eyebrow}</span><h3>{title}</h3><p>{description}</p></div>{action && <div className="dashboard-welcome-tools">{action}</div>}<span className="dashboard-orbit dashboard-orbit-one" aria-hidden="true" /><span className="dashboard-orbit dashboard-orbit-two" aria-hidden="true" /></section>;
}

export function Panel({ eyebrow, title, description, action, children, className = '' }: { eyebrow?: string; title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`.trim()}>{(eyebrow || title || description || action) && <header className="section-heading"><div>{eyebrow && <span className="dashboard-section-label">{eyebrow}</span>}{title && <h3>{title}</h3>}{description && <p>{description}</p>}</div>{action}</header>}{children}</section>;
}

export const StatCard = memo(function StatCard({ icon, label, value, href, tone = 'teal' }: { icon: ReactNode; label: string; value: ReactNode; href: string; tone?: 'teal' | 'green' | 'purple' | 'amber' }) {
  return <Link className={`metric metric-link dashboard-stat stat-${tone}`} href={href}><span className="dashboard-stat-top"><i aria-hidden="true">{icon}</i><span>{label}</span><b aria-hidden="true">↗</b></span><strong><CountUp value={value} /></strong><small>Open records <span aria-hidden="true">→</span></small></Link>;
});

function CountUp({ value }: { value: ReactNode }) {
  const numeric = typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value));
  if (!numeric) return value;
  return <><span className="count-up" aria-hidden="true" style={{ '--admin-count-target': Number(value) } as React.CSSProperties} /><span className="sr-only">{value}</span></>;
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'danger' }) {
  const variantClass = variant === 'primary' ? 'primary' : variant;
  return <button className={`${variantClass} ${className}`.trim()} {...props} />;
}

export function Badge({ tone = 'teal', children, className = '' }: { tone?: 'teal' | 'green' | 'amber' | 'red' | 'purple'; children: ReactNode; className?: string }) {
  return <span className={`badge badge-${tone} ${className}`.trim()}>{children}</span>;
}

export function Input({ label, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  return <label className="field" htmlFor={id}><span>{label}</span><input id={id} {...props} /></label>;
}

export function Select({ label, id, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; id: string; children: ReactNode }) {
  return <label className="field" htmlFor={id}><span>{label}</span><select id={id} {...props}>{children}</select></label>;
}

export function Textarea({ label, id, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; id: string }) {
  return <label className="field" htmlFor={id}><span>{label}</span><textarea id={id} {...props} /></label>;
}

export type DataColumn<T> = { key: string; header: string; render: (row: T) => ReactNode; align?: 'start' | 'end' };
export function DataTable<T>({ rows, columns, rowKey, loading = false, empty = 'No records found.' }: { rows: readonly T[]; columns: readonly DataColumn<T>[]; rowKey: (row: T) => string; loading?: boolean; empty?: string }) {
  const firstRowsShown = useRef(false);
  const firstRowsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [animateFirstRows, setAnimateFirstRows] = useState(false);
  useEffect(() => {
    if (!loading && rows.length && !firstRowsShown.current) {
      firstRowsShown.current = true;
      setAnimateFirstRows(true);
      firstRowsTimer.current = window.setTimeout(() => setAnimateFirstRows(false), 420);
    }
  }, [loading, rows.length]);
  useEffect(() => () => { if (firstRowsTimer.current) clearTimeout(firstRowsTimer.current); }, []);
  if (loading) return <Skeleton rows={5} />;
  if (!rows.length) return <EmptyState title={empty} />;
  return <div className="panel table"><table><thead><tr>{columns.map(column => <th key={column.key} className={column.align === 'end' ? 'text-right' : undefined}>{column.header}</th>)}</tr></thead><tbody className={animateFirstRows ? 'first-load-rows' : undefined}>{rows.map(row => <tr key={rowKey(row)}>{columns.map(column => <td key={column.key}>{column.render(row)}</td>)}</tr>)}</tbody></table></div>;
}

export function Modal({ title, description, children, onClose }: { title: string; description?: string; children: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="confirm-modal" role="dialog" aria-modal="true" aria-label={title}><h2>{title}</h2>{description && <p>{description}</p>}{children}</section></div>;
}

export function Toast({ message, tone = 'success' }: { message: string; tone?: 'success' | 'error' }) {
  return <div className={`toast ${tone}`} role={tone === 'error' ? 'alert' : 'status'}><b aria-hidden="true">{tone === 'error' ? '!' : '✓'}</b>{message}</div>;
}

export function Status({ value }: { value: string }) {
  const normalized = value.replaceAll('_', '-');
  const tone = ['verified', 'active', 'published', 'approved', 'paid'].includes(normalized)
    ? 'green'
    : ['pending', 'review', 'ready', 'held', 'unverified', 'reviewing'].includes(normalized)
      ? 'amber'
      : ['failed', 'suspended', 'removed', 'rejected', 'dismissed'].includes(normalized)
        ? 'red'
        : 'purple';
  return <Badge tone={tone} className={`status ${normalized}`}><span aria-hidden="true">●</span> {value.replaceAll('_', ' ')}</Badge>;
}
export function Pager({ page, total, setPage, disabled = false, pageSize = PAGE_SIZE }: { page: number; total: number; setPage: (page: number) => void; disabled?: boolean; pageSize?: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = total ? page * pageSize + 1 : 0;
  const end = Math.min((page + 1) * pageSize, total);
  return (
    <nav className="pagination" aria-label="Pagination">
      <span aria-live="polite" aria-atomic="true">{total ? `${start}–${end} of ${total} results` : '0 results'}</span>
      {total > 0 && (
        <div>
          <button aria-label="Go to previous page" disabled={disabled || page === 0} onClick={() => setPage(page - 1)}>Previous</button>
          <span aria-current="page">Page {page + 1} of {pages}</span>
          <button aria-label="Go to next page" disabled={disabled || (page + 1) * pageSize >= total} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </nav>
  );
}
export function Search({ id = "route-search", label = "Search records", value, onChange, placeholder = "Search" }: { id?: string; label?: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="field route-search-field" htmlFor={id}><span>{label}</span><div><input className="route-search" id={id} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} type="search" autoComplete="off" />{value && <button type="button" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => onChange("")}>Clear</button>}</div></label>;
}

export function Skeleton({ rows = 5 }: { rows?: number }) {
  return <div className="skeleton" aria-live="polite" aria-busy="true"><span className="sr-only">Loading data</span>{Array.from({ length: rows }, (_, index) => <i key={index} />)}</div>;
}

export function LoadError({ message, retry }: { message: string; retry: () => void | Promise<void> }) {
  return <section className="load-error" role="alert"><b>Could not load this section</b><p>{message}</p><button onClick={() => void retry()}>Retry</button></section>;
}

export function EmptyState({ title, detail, actionLabel, onAction }: { title: string; detail?: string; actionLabel?: string; onAction?: () => void }) {
  return <section className="panel empty-state" role="status"><span className="empty-state-icon" aria-hidden="true">✓</span><div><h3>{title}</h3>{detail && <p>{detail}</p>}{actionLabel && onAction && <button onClick={onAction}>{actionLabel}</button>}</div></section>;
}

export const ErrorState = LoadError;

export function exportCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return false;
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const csv = [columns.map(csvSafeValue).join(","), ...rows.map(row => columns.map(column => csvSafeValue(row[column])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.rel = "noopener"; link.click();
  URL.revokeObjectURL(url);
  return true;
}
