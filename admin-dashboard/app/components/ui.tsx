"use client";

import type { ReactNode } from "react";
import { PAGE_SIZE } from "../../lib/admin";
import { csvSafeValue } from "../../lib/operations";

export function Page({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT_LABEL?.trim();
  return <div className="page"><div className="head"><div><h2>{title}</h2><p>{note}</p></div>{environment && <span className="environment-badge" aria-label={`${environment} environment`}>{environment}</span>}</div>{children}</div>;
}

export function Status({ value }: { value: string }) {
  return <span className={`status ${value.replaceAll("_", "-")}`}><span aria-hidden="true">●</span> {value.replaceAll("_", " ")}</span>;
}

export function Pager({ page, total, setPage, disabled = false }: { page: number; total: number; setPage: (page: number) => void; disabled?: boolean }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <nav className="pagination" aria-label="Pagination"><span>{total ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}` : "0 results"}</span><div><button disabled={disabled || page === 0} onClick={() => setPage(page - 1)}>Previous</button><b>Page {page + 1} of {pages}</b><button disabled={disabled || (page + 1) * PAGE_SIZE >= total} onClick={() => setPage(page + 1)}>Next</button></div></nav>;
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
  return <section className="panel empty-state" role="status"><h3>{title}</h3>{detail && <p>{detail}</p>}{actionLabel && onAction && <button onClick={onAction}>{actionLabel}</button>}</section>;
}

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
