export function mapAnalytics(rows = []) {
  return rows.reduce(
    (summary, row) => {
      const key = row.event_type;
      summary.total += 1;
      summary[key] = (summary[key] || 0) + 1;
      return summary;
    },
    { total: 0, view: 0, call: 0, whatsapp: 0, website: 0, direction: 0, save: 0, share: 0 },
  );
}

export function mapVerificationRequest(row) {
  return {
    id: row.id,
    providerId: row.provider_id,
    name: row.providers?.business_name || 'Provider',
    category: row.providers?.categories?.name || 'Uncategorised',
    city: row.providers?.base_city || 'United Kingdom',
    status: row.status,
    submittedAt: row.submitted_at,
    notes: row.notes || '',
    documents: (row.verification_documents || []).map((document) => ({
      id: document.id,
      type: document.document_type,
      path: document.storage_path,
      createdAt: document.created_at,
    })),
  };
}

export function mapModerationReport(row) {
  return {
    id: row.id,
    postId: row.post_id,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    postBody: row.community_posts?.body || '',
    postStatus: row.community_posts?.status || 'unknown',
  };
}
