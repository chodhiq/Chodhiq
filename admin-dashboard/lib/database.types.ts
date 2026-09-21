export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ModerationStatus = "active" | "suspended";
export type VerificationStatus = "pending" | "changes_requested" | "approved" | "rejected" | "revoked";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type CommunityPostStatus = "draft" | "published" | "removed";

export interface ProviderListRow {
  id: string;
  business_name: string;
  base_city: string | null;
  verification_status: string;
  sponsored_rank: number | null;
  categories: { name: string } | null;
}

export interface UserListRow {
  id: string;
  full_name: string | null;
  city: string | null;
  created_at: string;
  user_moderation_status: Array<{ status: ModerationStatus; reason: string | null }> | null;
}

export interface PaymentListRow {
  id: string;
  provider_id: string;
  transaction_id: string | null;
  amount_pence: number;
  currency: string;
  status: string;
  receipt_url: string | null;
  invoice_url: string | null;
  created_at: string;
  providers: { business_name: string } | null;
}

export interface ReportRow {
  id: string;
  provider_id?: string;
  post_id?: string;
  reporter_id: string | null;
  reason: string;
  details?: string | null;
  status: ReportStatus;
  created_at: string;
  updated_at?: string;
  providers?: { business_name: string } | null;
  community_posts?: { body: string; status: CommunityPostStatus } | null;
}

export interface VerificationRequestRow {
  id: string;
  provider_id: string;
  status: VerificationStatus;
  notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  updated_at?: string;
  providers: { business_name: string; base_city: string | null } | null;
}

export interface VerificationDocumentRow {
  id: string;
  document_type: string;
  storage_path: string;
  original_filename?: string | null;
  created_at?: string;
  mime_type?: string | null;
}
