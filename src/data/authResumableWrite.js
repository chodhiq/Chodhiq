import { isAuthSessionError } from './syncPolicy';
import { loadAuthWriteDrafts, removeAuthWriteDraft, storeAuthWriteDraft } from './localDatabase';

/** Execute a write, preserving its payload when the current access token expires. */
export async function runAuthResumableWrite({
  operation,
  payload,
  ownerId,
  write,
  onAuthRequired,
  persist = storeAuthWriteDraft,
}) {
  try {
    return await write();
  } catch (error) {
    if (!isAuthSessionError(error)) throw error;
    if (!ownerId) {
      throw new Error('Cannot save an authentication draft without an owning user.');
    }
    const draftId = await persist(operation, payload, ownerId);
    onAuthRequired?.({ operation, payload, draftId });
    throw Object.assign(new Error('Please sign in again'), {
      authRequired: true,
      draftId,
      cause: error,
    });
  }
}

export async function resumeAuthWriteDrafts(ownerId, writeForOperation) {
  if (!ownerId) return [];
  const drafts = await loadAuthWriteDrafts();
  const results = [];
  for (const draft of drafts) {
    if (!draft.owner_id) {
      await removeAuthWriteDraft(draft.id);
      continue;
    }
    if (draft.owner_id !== ownerId) continue;
    const write = writeForOperation(draft.operation, draft.payload);
    if (!write) continue;
    const result = await write();
    await removeAuthWriteDraft(draft.id);
    results.push({ draft, result });
  }
  return results;
}
