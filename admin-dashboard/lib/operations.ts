export type MutationFailure = "session_expired" | "unauthorized" | "duplicate" | "mutation_failed" | "audit_failed" | "conflict" | "partial_failure";
export const PAGE_SIZE = 25;
export const pageRange = (page: number) => [page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1] as const;
export const cleanSearchValue = (value: string) => value.trim().replace(/[,%_()]/g, " ");

export type MutationResult<T = undefined> =
  | { ok: true; data: T; correlationId: string }
  | { ok: false; code: MutationFailure; userMessage: string; diagnostic?: string; correlationId: string };

export type BulkItemResult<T> = { id: string; result: MutationResult<T> };

export interface BulkSummary<T> {
  items: Array<BulkItemResult<T>>;
  succeeded: string[];
  failed: string[];
  message: string;
}

export async function runBoundedBulk<T>(ids: string[], worker: (id: string) => Promise<MutationResult<T>>, concurrency = 4): Promise<BulkSummary<T>> {
  const uniqueIds = [...new Set(ids)];
  const items: Array<BulkItemResult<T>> = [];
  let cursor = 0;
  async function consume() {
    while (cursor < uniqueIds.length) {
      const id = uniqueIds[cursor++];
      items.push({ id, result: await worker(id) });
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, uniqueIds.length) }, consume));
  const succeeded = items.filter(item => item.result.ok).map(item => item.id);
  const failed = items.filter(item => !item.result.ok).map(item => item.id);
  return { items, succeeded, failed, message: `${succeeded.length} succeeded, ${failed.length} failed.` };
}

const legalTransitions = {
  verification: {
    pending: ["approved", "rejected", "changes_requested"],
    changes_requested: ["pending"],
    approved: ["revoked"],
    rejected: ["pending"],
    revoked: ["pending"],
  },
  report: { open: ["reviewing", "resolved", "dismissed"], reviewing: ["resolved", "dismissed"], resolved: [], dismissed: [] },
  community: { draft: ["published", "removed"], published: ["removed"], removed: ["published"] },
  user: { active: ["suspended"], suspended: ["active"] },
} as const;

export type TransitionKind = keyof typeof legalTransitions;
export function isLegalTransition(kind: TransitionKind, current: string, next: string): boolean {
  const transitions = legalTransitions[kind] as Record<string, readonly string[]>;
  return transitions[current]?.includes(next) ?? false;
}

export function safeErrorDiagnostic(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String((error as { message: unknown }).message);
  return String(error);
}

export function csvSafeValue(value: unknown): string {
  const raw = String(value ?? "");
  const protectedValue = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${protectedValue.replaceAll('"', '""')}"`;
}
