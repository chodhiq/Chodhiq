# Executive summary (Phase 7)

STATUS counts for explicitly traced actions: CONNECTED 27; LOCAL-ONLY 6; MOCK 1; BROKEN 1; UNCHECKED 6. These are source-audit classifications, not production smoke-test results.

- MOCK: `screens/CommunityFeedScreen.tsx` — fixture-backed `initialPosts` and component state (exact line refs can be located in source; action-level status is documented in Phase 5).
- LOCAL-ONLY: guest mode (`OpeningScreen.js`/navigation); avatar URI (`ProfileScreen.js`); offers/events (`DiscoveryScreens.js`/`discoveryData.js`); new community tab interactions (per Phase 5).
- BROKEN: subscription checkout screen `src/screens/MarketplaceScreens.js` is not registered as a navigation route (screen map identifies it as orphaned).
- REFERENCED-BUT-MISSING: no missing named backend object confirmed in this source pass; deployment state for all migration objects remains unknown.
- Unapplied migrations: cannot establish applied status without database access. Potential deployment dependency: `20261103120000_button_kill_switch_config.sql` (`app_config`).
- RLS problems: final effective RLS and RLS-off table set UNCHECKED without live catalog inspection. Risk areas: status constrained booking updates; review delete/edit ownership; verification object policies; notification update; queued profile upsert; public-read policies exposing complete rows.

Top 10 launch risks by source evidence:
1. New Community tab uses demo fixture/local state while appearing as production feed.
2. Subscription plan/checkout screen is not routed; checkout cannot be reached through navigation.
3. Migration application/deployed schema and effective RLS are unknown, including recent `app_config` migration.
4. Supabase missing configuration degrades to null client with local/cache fallbacks.
5. Avatar is stored as local URI; no remote upload found.
6. Kill-switch read failures silently preserve enabled state.
7. Failed offline writes can remain in local failed state without established user-facing notice.
8. Sentry runtime DSN and EAS upload secrets are unverified.
9. Session storage falls back to memory after persistence errors, causing session loss after restart.
10. Several actions are optimistic/local-first; server readback and expiry-mid-action behavior are not proven.

PHASE 7 COMPLETE
# Backend wiring audit

Read-only source audit. No migrations, builds, or live database operations were run.

## Phase 1 — Inventory of what exists

### Tables and columns from migration CREATE TABLE statements

- `categories`: id, name, slug, icon, color, sort_order, created_at — EXISTS (20260805192639_create_chodhiq_marketplace_schema.sql)
- `profiles`: id, full_name, avatar_url, phone, city, preferred_categories, created_at — EXISTS (20260805192639_create_chodhiq_marketplace_schema.sql)
- `providers`: id, owner_id, business_name, category_id, description, base_city, base_postcode, base_location, service_areas, languages_spoken, years_experience, price_range, phone, whatsapp, website, google_place_id, cover_image_url, portfolio_urls, is_verified, is_claimed, avg_rating, review_count, created_at, updated_at — EXISTS (20260805192639_create_chodhiq_marketplace_schema.sql)
- `provider_hours`: id, provider_id, day_of_week, open_time, close_time, is_closed — EXISTS (20260805192639_create_chodhiq_marketplace_schema.sql)
- `services`: id, provider_id, name, description, starting_price, is_featured, created_at — EXISTS (20260805192639_create_chodhiq_marketplace_schema.sql)
- `reviews`: id, provider_id, user_id, rating, comment, created_at — EXISTS (20260805192639_create_chodhiq_marketplace_schema.sql)
- `saved_items`: id, user_id, provider_id, created_at — EXISTS (20260805192639_create_chodhiq_marketplace_schema.sql)
- `quote_requests`: id, user_id, provider_id, message, preferred_contact, status, created_at — EXISTS (20260805192639_create_chodhiq_marketplace_schema.sql)
- `bookings`: id, user_id, provider_id, service_id, requested_date, requested_time, status, notes, created_at — EXISTS (20260805192639_create_chodhiq_marketplace_schema.sql)
- `recent_searches`: id, user_id, query, created_at — EXISTS (20260805192639_create_chodhiq_marketplace_schema.sql)
- `provider_reports`: id, reporter_id, provider_id, reason, details, status, created_at — EXISTS (20260806071808_mvp_phase1.sql)
- `notifications`: id, user_id, title, body, read_at, created_at — EXISTS (20260806071808_mvp_phase1.sql)
- `directory_profiles`: source_id, profile_type, name, category, subcategory, city, region, address, phone, email, website, instagram, facebook, description, language_tags, verification_status, demo_use, source_url, notes, imported_at, updated_at — EXISTS (20260806123359_import_uk_south_asian_demo_directory.sql)
- `provider_entitlements`: provider_id, offers_active, offer_period_start, offer_posts_used, search_tier, expires_at, updated_at — EXISTS (20260806183300_community_feed_and_provider_promotions.sql)
- `community_posts`: id, author_id, provider_id, post_type, body, image_url, offer_expires_at, status, created_at — EXISTS (20260806183300_community_feed_and_provider_promotions.sql)
- `community_comments`: id, post_id, author_id, body, created_at — EXISTS (20260806183300_community_feed_and_provider_promotions.sql)
- `review_replies`: id, review_id, provider_id, author_id, body, created_at, updated_at — EXISTS (20260807131253_dashboard_backend.sql)
- `verification_requests`: id, provider_id, submitted_by, status, notes, admin_notes, submitted_at, reviewed_at, reviewed_by — EXISTS (20260807131253_dashboard_backend.sql)
- `verification_documents`: id, request_id, provider_id, uploaded_by, document_type, storage_path, created_at — EXISTS (20260807131253_dashboard_backend.sql)
- `subscription_plans`: code, name, price_pence, promotion_limit, search_tier, features, active — EXISTS (20260807131253_dashboard_backend.sql)
- `subscription_requests`: id, provider_id, requested_by, plan_code, status, created_at — EXISTS (20260807131253_dashboard_backend.sql)
- `payment_records`: id, provider_id, transaction_id, amount_pence, currency, status, receipt_url, invoice_url, created_at — EXISTS (20260807131253_dashboard_backend.sql)
- `provider_analytics_events`: id, provider_id, event_type, user_id, created_at — EXISTS (20260807131253_dashboard_backend.sql)
- `community_post_reports`: id, post_id, reporter_id, reason, status, created_at — EXISTS (20260807131253_dashboard_backend.sql)
- `admin_audit_log`: id, admin_id, action, entity_type, entity_id, details, created_at — EXISTS (20260807131253_dashboard_backend.sql)
- `provider_publication_consents`: provider_id, status, contact_channel, contact_reference, contacted_at, responded_at, expires_at, notes, updated_by, updated_at — EXISTS (20260815120000_bookings_quote_responses_and_consent.sql)
- `app_error_events`: id, user_id, message, error_name, platform, app_area, metadata, created_at — EXISTS (20260817130000_privacy_safe_error_telemetry.sql)
- `ad_campaign_enquiries`: id, provider_id, requested_by, contact_email, objective, target_cities, target_category_ids, requested_start, requested_end, budget_pence, status, created_at, updated_at — EXISTS (20260825140000_custom_ad_campaigns.sql)
- `ad_campaigns`: id, enquiry_id, provider_id, name, headline, body, creative_url, destination_url, target_cities, target_category_ids, starts_at, ends_at, status, approved_by, approved_at, created_at, updated_at — EXISTS (20260825140000_custom_ad_campaigns.sql)
- `ad_campaign_events`: id, campaign_id, event_type, anonymous_session_id, placement, occurred_at — EXISTS (20260825140000_custom_ad_campaigns.sql)
- `ad_campaign_invoices`: id, campaign_id, invoice_number, amount_pence, currency, status, issued_at, due_at, paid_at, created_at — EXISTS (20260825140000_custom_ad_campaigns.sql)
- `push_delivery_attempts`: id, notification_id, user_id, outcome, provider_status, error_code, created_at — EXISTS (20260831070000_push_delivery_monitoring.sql)
- `service_catalog`: id, category_id, name, slug, sort_order, is_active, created_at, updated_at — EXISTS (20260831100000_canonical_service_catalog.sql)
- `quote_request_attachments`: id, quote_request_id, storage_path, file_name, mime_type, byte_size, created_at — EXISTS (20260831110000_phase1_community_hub.sql)
- `provider_lead_deliveries`: id, quote_request_id, provider_id, channel, destination, status, attempts, last_error, delivered_at, created_at — EXISTS (20260831110000_phase1_community_hub.sql)
- `community_events`: id, summary, starts_at, postcode, organizer_name, status, created_by — EXISTS (20260831110000_phase1_community_hub.sql)
- `community_resources`: id, name, source_url, consent_reference, created_by — EXISTS (20260831110000_phase1_community_hub.sql)
- `mvp_events`: id, installation_id — EXISTS (20260831110000_phase1_community_hub.sql)
- `directory_import_candidates`: id, contact_channel, consent_evidence, status, notes — EXISTS (20260831110000_phase1_community_hub.sql)
- `edge_rate_limits`: scope, identifier, bucket_started_at, request_count — EXISTS (20260901120000_persistent_edge_rate_limits.sql)
- `user_moderation_status`: user_id, status, reason, updated_by, updated_at — EXISTS (20260901130000_security_remediation.sql)
- `business_applications`: id, applicant_id, business_name, category_id, city, postcode, phone, email, proof_path, proof_name, status, submitted_at, review_due_at, reviewed_at, reviewed_by, review_note, provider_id, revision — EXISTS (20260909100000_business_applications.sql)
- `community_post_likes`: post_id, user_id, created_at — EXISTS (20260929100000_community_feed_engagement_and_location.sql)
- `community_saved_posts`: post_id, user_id, created_at — EXISTS (20260929100000_community_feed_engagement_and_location.sql)
- `community_spaces`: id, slug, name, description, rules, visibility, status, created_by, created_at, updated_at — EXISTS (20261001130000_community_spaces_and_safety.sql)
- `community_memberships`: space_id, user_id, role, joined_at — EXISTS (20261001130000_community_spaces_and_safety.sql)
- `community_user_blocks`: blocker_id, blocked_id, created_at — EXISTS (20261001130000_community_spaces_and_safety.sql)
- `community_rate_limit_buckets`: user_id, action, window_started_at, request_count — EXISTS (20261001130000_community_spaces_and_safety.sql)
- `community_post_sync_receipts`: user_id, operation_id, post_id, payload, created_at — EXISTS (20261002130000_idempotent_community_offline_publication.sql)
- `community_member_permissions`: space_id, user_id, can_post, can_comment, updated_at — EXISTS (20261004160000_admin_community_privileges.sql)
- `app_config`: config_key, config_value, updated_at, updated_by — EXISTS (20261103120000_button_kill_switch_config.sql)

### Views, RPCs, buckets, Edge Functions

- RPC `search_providers` — EXISTS (20260805192639_create_chodhiq_marketplace_schema.sql)
- RPC `sync_provider_sponsorship` — EXISTS (20260806183300_community_feed_and_provider_promotions.sql)
- RPC `enforce_community_promotion` — EXISTS (20260806183300_community_feed_and_provider_promotions.sql)
- RPC `enforce_community_promotion` — EXISTS (20260806183515_require_active_expiry_for_community_offers.sql)
- RPC `is_admin` — EXISTS (20260807131253_dashboard_backend.sql)
- Storage bucket `free` — EXISTS (20260807131253_dashboard_backend.sql)
- Storage bucket `provider-media` — EXISTS (20260807131253_dashboard_backend.sql)
- Storage bucket `verification-documents` — EXISTS (20260807131253_dashboard_backend.sql)
- RPC `require_verification_evidence` — EXISTS (20260814150000_owner_claim_and_verification.sql)
- RPC `claim_imported_provider` — EXISTS (20260814150000_owner_claim_and_verification.sql)
- RPC `list_claimable_providers` — EXISTS (20260814150000_owner_claim_and_verification.sql)
- RPC `submit_provider_verification` — EXISTS (20260814150000_owner_claim_and_verification.sql)
- RPC `notify_provider_owner_on_review` — EXISTS (20260814151000_in_app_notifications.sql)
- RPC `notify_verification_decision` — EXISTS (20260814151000_in_app_notifications.sql)
- RPC `notify_provider_owner_on_quote` — EXISTS (20260814151000_in_app_notifications.sql)
- RPC `notify_customer_on_quote_status` — EXISTS (20260814151000_in_app_notifications.sql)
- RPC `notify_customer_on_review_reply` — EXISTS (20260814151000_in_app_notifications.sql)
- RPC `owns_provider` — EXISTS (20260814152000_provider_ownership_helper.sql)
- RPC `notify_booking_participants` — EXISTS (20260815120000_bookings_quote_responses_and_consent.sql)
- RPC `notify_customer_on_quote_response` — EXISTS (20260815120000_bookings_quote_responses_and_consent.sql)
- RPC `claim_imported_provider` — EXISTS (20260817120000_secure_claims_bookings_and_push_consent.sql)
- RPC `list_claimable_providers` — EXISTS (20260817120000_secure_claims_bookings_and_push_consent.sql)
- RPC `submit_provider_verification` — EXISTS (20260817120000_secure_claims_bookings_and_push_consent.sql)
- RPC `assign_approved_claim_owner` — EXISTS (20260817120000_secure_claims_bookings_and_push_consent.sql)
- RPC `protect_booking_actor_fields` — EXISTS (20260817120000_secure_claims_bookings_and_push_consent.sql)
- RPC `validate_booking_service_provider` — EXISTS (20260817120000_secure_claims_bookings_and_push_consent.sql)
- RPC `protect_provider_security_fields` — EXISTS (20260817130000_privacy_safe_error_telemetry.sql)
- RPC `prepare_account_deletion` — EXISTS (20260817130000_privacy_safe_error_telemetry.sql)
- View `operational_error_summary` — EXISTS (20260817150000_operational_scaling.sql)
- RPC `admin_broadcast_notification` — EXISTS (20260819120000_admin_audit_and_user_controls.sql)
- RPC `admin_set_user_moderation` — EXISTS (20260819120000_admin_audit_and_user_controls.sql)
- RPC `audit_admin_dashboard_change` — EXISTS (20260819120000_admin_audit_and_user_controls.sql)
- RPC `admin_search_members` — EXISTS (20260820100000_admin_operations_upgrade.sql)
- RPC `admin_moderate_community_report` — EXISTS (20260820100000_admin_operations_upgrade.sql)
- RPC `admin_transition_community_post` — EXISTS (20260820120000_secure_live_community_moderation.sql)
- RPC `replace_provider_hours` — EXISTS (20260820130000_transactional_owner_dashboard_writes.sql)
- RPC `respond_to_quote` — EXISTS (20260820130000_transactional_owner_dashboard_writes.sql)
- RPC `notify_verification_decision` — EXISTS (20260825120000_establish_chodhiq_brand.sql)
- RPC `list_active_ad_campaigns` — EXISTS (20260825140000_custom_ad_campaigns.sql)
- RPC `record_ad_campaign_event` — EXISTS (20260825140000_custom_ad_campaigns.sql)
- View `ad_campaign_performance` — EXISTS (20260825140000_custom_ad_campaigns.sql)
- View `operational_push_summary` — EXISTS (20260831070000_push_delivery_monitoring.sql)
- RPC `queue_provider_quote_lead` — EXISTS (20260831110000_phase1_community_hub.sql)
- View `mvp_success_metrics` — EXISTS (20260831110000_phase1_community_hub.sql)
- Storage bucket `quote-attachments` — EXISTS (20260831110000_phase1_community_hub.sql)
- RPC `consume_edge_rate_limit` — EXISTS (20260901120000_persistent_edge_rate_limits.sql)
- RPC `record_user_moderation_change` — EXISTS (20260901130000_security_remediation.sql)
- RPC `submit_business_application` — EXISTS (20260909100000_business_applications.sql)
- RPC `review_business_application` — EXISTS (20260909100000_business_applications.sql)
- Storage bucket `business-application-proofs` — EXISTS (20260909100000_business_applications.sql)
- RPC `create_profile_for_auth_user` — EXISTS (20260916090000_sync_auth_users_to_profiles.sql)
- RPC `public_provider_coordinates` — EXISTS (20260928120000_public_provider_coordinates.sql)
- RPC `community_post_engagement` — EXISTS (20260929100000_community_feed_engagement_and_location.sql)
- RPC `record_ad_campaign_event` — EXISTS (20261001120000_harden_ad_event_ingestion.sql)
- RPC `community_users_blocked` — EXISTS (20261001130000_community_spaces_and_safety.sql)
- RPC `community_post_engagement` — EXISTS (20261001130000_community_spaces_and_safety.sql)
- RPC `prepare_community_like` — EXISTS (20261001130000_community_spaces_and_safety.sql)
- RPC `consume_community_rate_limit` — EXISTS (20261001130000_community_spaces_and_safety.sql)
- RPC `prepare_community_post` — EXISTS (20261001130000_community_spaces_and_safety.sql)
- RPC `prepare_community_comment` — EXISTS (20261001130000_community_spaces_and_safety.sql)
- RPC `prepare_community_membership` — EXISTS (20261001130000_community_spaces_and_safety.sql)
- RPC `prepare_community_block` — EXISTS (20261001130000_community_spaces_and_safety.sql)
- RPC `prepare_community_report` — EXISTS (20261001130000_community_spaces_and_safety.sql)
- RPC `admin_resolve_report` — EXISTS (20261001130000_community_spaces_and_safety.sql)
- RPC `community_moderate_post` — EXISTS (20261001130000_community_spaces_and_safety.sql)
- RPC `community_moderate_comment` — EXISTS (20261001130000_community_spaces_and_safety.sql)
- Storage bucket `general` — EXISTS (20261001130000_community_spaces_and_safety.sql)
- RPC `community_post_engagement` — EXISTS (20261002110000_secure_community_engagement_visibility.sql)
- RPC `community_has_membership` — EXISTS (20261002110000_secure_community_engagement_visibility.sql)
- RPC `guard_community_post_edit` — EXISTS (20261002120000_guard_community_edits_and_join_limits.sql)
- RPC `prepare_community_membership` — EXISTS (20261002120000_guard_community_edits_and_join_limits.sql)
- RPC `publish_queued_community_post` — EXISTS (20261002130000_idempotent_community_offline_publication.sql)
- RPC `enforce_community_promotion` — EXISTS (20261003100000_allow_community_post_images.sql)
- RPC `notify_new_community_post` — EXISTS (20261003110000_community_images_and_post_notifications.sql)
- Storage bucket `community-images` — EXISTS (20261003110000_community_images_and_post_notifications.sql)
- RPC `dispatch_notification_push` — EXISTS (20261003120000_connect_notification_push_delivery.sql)
- RPC `send_community_activity_notification` — EXISTS (20261004150000_community_activity_notifications.sql)
- RPC `notify_community_engagement` — EXISTS (20261004150000_community_activity_notifications.sql)
- RPC `notify_community_report_activity` — EXISTS (20261004150000_community_activity_notifications.sql)
- RPC `notify_community_content_removed` — EXISTS (20261004150000_community_activity_notifications.sql)
- RPC `community_can_contribute` — EXISTS (20261004160000_admin_community_privileges.sql)
- RPC `enforce_community_contribution_privileges` — EXISTS (20261004160000_admin_community_privileges.sql)
- RPC `admin_save_community_space` — EXISTS (20261004160000_admin_community_privileges.sql)
- RPC `admin_set_community_member` — EXISTS (20261004160000_admin_community_privileges.sql)
- Storage bucket `ad-creatives` — EXISTS (20261005110000_admin_ad_creatives.sql)
- RPC `admin_transition_community_comment` — EXISTS (20261006100000_admin_feed_operations.sql)
- RPC `get_community_member_profile` — EXISTS (20261006110000_community_member_profiles.sql)
- RPC `community_post_engagement_for_posts` — EXISTS (20261006120000_scoped_community_engagement.sql)
- RPC `dispatch_push_receipt_check` — EXISTS (20261006130000_push_receipt_tracking.sql)
- RPC `limit_customer_quote_requests` — EXISTS (20261007130000_quote_request_rate_limits.sql)
- RPC `validate_booking_request_datetime` — EXISTS (20261008150000_validate_booking_request_datetime.sql)
- RPC `notify_verification_decision` — EXISTS (20261009002000_rename_sanjha_verification_notification.sql)
- RPC `notify_new_community_post` — EXISTS (20261011120000_community_actor_names_in_notifications.sql)
- RPC `notify_community_engagement` — EXISTS (20261011120000_community_actor_names_in_notifications.sql)
- RPC `respond_to_quote` — EXISTS (20261011133000_quote_opened_status.sql)
- RPC `prevent_confirmed_booking_slot_conflicts` — EXISTS (20261014120000_guard_confirmed_booking_slots.sql)
- RPC `get_community_member_profile` — EXISTS (20261014130000_complete_comment_identity_booking_availability.sql)
- RPC `get_confirmed_booking_slots` — EXISTS (20261014130000_complete_comment_identity_booking_availability.sql)
- RPC `prepare_account_deletion` — EXISTS (20261014140000_complete_account_deletion_cleanup.sql)
- RPC `send_community_activity_notification` — EXISTS (20261021100000_notification_actor_details.sql)
- RPC `notify_community_engagement` — EXISTS (20261021100000_notification_actor_details.sql)
- RPC `notify_new_community_post` — EXISTS (20261021100000_notification_actor_details.sql)
- RPC `admin_has_permission` — EXISTS (20261022120000_admin_targeted_notifications.sql)
- RPC `admin_send_notification` — EXISTS (20261022120000_admin_targeted_notifications.sql)
- RPC `admin_broadcast_notification` — EXISTS (20261022120000_admin_targeted_notifications.sql)
- RPC `community_can_contribute` — EXISTS (20261022130000_timed_community_privileges.sql)
- RPC `admin_set_community_member` — EXISTS (20261022130000_timed_community_privileges.sql)
- RPC `admin_set_community_member` — EXISTS (20261022130000_timed_community_privileges.sql)
- RPC `is_admin` — EXISTS (20261023110000_admin_permission_enforcement.sql)
- RPC `admin_has_permission` — EXISTS (20261023110000_admin_permission_enforcement.sql)
- RPC `admin_decide_verification` — EXISTS (20261023110000_admin_permission_enforcement.sql)
- RPC `public_provider_directory_page` — EXISTS (20261024193000_provider_directory_filter_summaries.sql)
- RPC `public_provider_directory_page` — EXISTS (20261024202600_fix_provider_directory_verification_date.sql)
- RPC `set_provider_coordinates` — EXISTS (20261104130000_geocode_provider_locations.sql)
- Edge Function `admin-role-control` — EXISTS (supabase/functions/admin-role-control/index.ts)
- Edge Function `admin-user-control` — EXISTS (supabase/functions/admin-user-control/index.ts)
- Edge Function `check-push-receipts` — EXISTS (supabase/functions/check-push-receipts/index.ts)
- Edge Function `create-checkout-session` — EXISTS (supabase/functions/create-checkout-session/index.ts)
- Edge Function `delete-account` — EXISTS (supabase/functions/delete-account/index.ts)
- Edge Function `deliver-provider-leads` — EXISTS (supabase/functions/deliver-provider-leads/index.ts)
- Edge Function `health` — EXISTS (supabase/functions/health/index.ts)
- Edge Function `ingest-mvp-event` — EXISTS (supabase/functions/ingest-mvp-event/index.ts)
- Edge Function `push-notification` — EXISTS (supabase/functions/push-notification/index.ts)
- Edge Function `stripe-webhook` — EXISTS (supabase/functions/stripe-webhook/index.ts)
- Edge Function `uk-address-suggestions` — EXISTS (supabase/functions/uk-address-suggestions/index.ts)

### App references

- Client calls are in `src/data`, `src/hooks`, `src/screens`, and `src/lib`; inventory source matches are enumerated below by search result locations.
- Search families: `.from(`, `.rpc(`, `.functions.invoke(`, `.storage.from(`, and `src/data/syncRepository.js`.
- Referenced concrete names include: `profiles`, `providers`, `categories`, `provider_hours`, `services`, `reviews`, `review_replies`, `saved_items`, `quote_requests`, `bookings`, `notifications`, `provider_reports`, `community_posts`, `community_spaces`, `community_memberships`, `community_post_likes`, `community_saved_posts`, `community_comments`, `community_post_reports`, `community_user_blocks`, `verification_requests`, `verification_documents`, `app_config`; RPCs `public_provider_coordinates`, `get_confirmed_booking_slots`, `list_active_ad_campaigns`, `record_ad_campaign_event`, `list_claimable_providers`, `claim_imported_provider`, `submit_provider_verification`, `get_community_member_profile`, `community_post_engagement_for_posts`, `publish_queued_community_post`; Edge Functions `delete-account`, `create-checkout-session`, `uk-address-suggestions`; buckets `verification-documents`, `community-post-images`.
- Migration source presence does not establish deployment. All deployed/applied status is UNAPPLIED-OR-UNKNOWN without querying the live database. `app_config` kill-switch migration exists locally at `20261103120000_button_kill_switch_config.sql`.

PHASE 1 COMPLETE

## Phase 2 — RLS review

Migration source enables RLS on the principal customer tables: categories, profiles, providers, provider_hours, services, recent_searches, saved_items, reviews, quote_requests, bookings, provider_reports, notifications, community tables, provider_entitlements, review_replies, verification_requests/documents, subscription tables, reports, admin audit, consent, telemetry, and app_config. Migration source also defines policies for these areas; final effective state depends on ordered migrations and cannot be confirmed without database inspection.

Policy highlights from source:
- Public SELECT: categories, providers, provider_hours, services, reviews, review_replies, eligible community posts/comments, limited directory profiles, public provider media, active subscription plans, and only the `button_kill_switches` app_config row.
- User-owned access: profiles select/update/create; saved_items; notifications select/update; quote_requests; customer bookings with constrained pending create/cancel; reviews insert and later owner edits; own community posts/comments, likes, saved posts, and own membership.
- Business owner access: provider updates/create, services/hours, review replies, verification request/document metadata, provider leads/bookings under owns_provider checks.
- Privileged/admin access: moderation, provider reports, verification, audit and operational tables, guarded with is_admin/owns_provider helpers in later migrations.
- Explicit broad predicates (`using (true)`) appear on public read policies for intentionally public catalog/review/feed data. No proof of unrestricted write `with check (true)` was found in sampled source. Verify each later replacement in migrations before release.

No RLS-off table is asserted: CREATE TABLE and ALTER RLS statements are distributed over migrations, and this source-only pass did not establish complete final table coverage. **RLS off: UNCHECKED.** App writes with potentially policy-sensitive behavior include review edits/deletes, quote request inserts, booking cancellation, profile upserts, notification read updates, community actions, verification uploads, and local-first queued writes. Match against final deployed policy state is UNAPPLIED-OR-UNKNOWN. Guest writes are generally blocked by signed-in UI/auth checks; read-only catalog/feed access is designed for anon.

PHASE 2 COMPLETE
## Phase 3 — Action trace, part 1 (Auth and account)

Trace format: UI action | source/handler | backend | offline/error behavior | status. Exact UI rows are mapped in `docs/app-screen-map.md`; handlers are distributed across `src/lib/supabase.js`, `src/data/accountRepository.js`, `src/screens/AccountScreens.js`, `ProfileScreen.js`, and `PrivacyScreen.js`.

- Sign-up/sign-in: AccountScreens handlers → `signUpWithEmail` / `signInWithEmail` → Supabase Auth; inline errors and confirmation state; no offline auth → CONNECTED (implementation reaches Auth; production backend response not exercised).
- Google sign-in: auth handler → native token flow on Android / OAuth flow elsewhere → Supabase Auth; surfaced auth errors; offline unavailable → CONNECTED (provider configuration/runtime UNCHECKED).
- Sign-out: Profile handler → auth signOut and local Google signout; failures handled by handler → CONNECTED.
- Password reset/email confirmation: `requestPasswordReset`, `finishEmailConfirmation`, `preparePasswordRecovery`, `updatePassword`; Supabase Auth; inline progress/errors → CONNECTED (actual link delivery not exercised).
- Guest mode: onboarding/navigation state and local flag; no auth identity/backend write → LOCAL-ONLY.
- Profile edit: profile state/repository upsert and local cache; backend `profiles`; offline local persistence/queue behavior; user feedback from screen → CONNECTED (remote readback not proven for each field).
- Avatar upload: ProfileScreen stores selected image URI in `avatarUri`; no storage upload call established → LOCAL-ONLY.
- Account export: PrivacyScreen → `exportCurrentAccount`; queries account data then shares export; query/share failure surfaced → CONNECTED (subject to RLS/query completeness).
- Account deletion: PrivacyScreen → `delete-account` Edge Function, local cleanup; errors surfaced → CONNECTED (function implementation exists; remote deletion not executed).
- Location/postcode suggestions: AccountScreens → `uk-address-suggestions`; suggestion errors shown; device location separate → CONNECTED (remote function exists).
- Preferences sync: profile/local settings pathways; exact set of remotely persisted preferences is not proven → UNCHECKED.

PHASE 3 COMPLETE
## Phase 4 — Action trace, part 2 (Discovery and business)

- Provider list/detail: `providerRepository.loadMarketplace` and detail repositories query providers/categories/reviews/review_replies/services/provider_hours; cache fallback plus visible errors; result feeds app state/UI → CONNECTED.
- Search/filters/category list: client-side filtering on loaded marketplace/category state; category table remote source with cached/fallback behavior → CONNECTED; category visual data may include local taxonomy (UNUSED as backend source).
- Map coordinates: RPC `public_provider_coordinates` exists in migrations and client repository; map markers are rendered from coordinates → CONNECTED; RPC deployment unknown.
- Save/unsave business: account repository writes `saved_items`, local fallback/cache and sync; UI updates state → CONNECTED (optimistic state may precede remote confirmation).
- Reviews: `reviewRepository` has create/update/delete against `reviews`; provider owner reply backend paths exist in repository/dashboard; online writes reported → CONNECTED; policy and readback per action UNCHECKED.
- Quote requests: `quote_requests` repository with local-first support and sync retry → CONNECTED.
- Bookings: booking repository uses `get_confirmed_booking_slots`, `bookings` insert/read/cancel; UI reads availability and status → CONNECTED.
- Report provider: account repository inserts `provider_reports`, local queue fallback → CONNECTED.
- Claim listing: claim repository uses `list_claimable_providers`, `claim_imported_provider`, provider/verification requests; handlers show errors → CONNECTED.
- Verification upload: `verification-documents` storage upload and `verification_documents` metadata; error handling present → CONNECTED (requires authenticated owner/claimant policies).
- Become provider: application/provider tables and claim flow exist; exact form-to-write path not fully demonstrated → UNCHECKED.
- Subscription checkout: `create-checkout-session` function exists and repository invokes it; subscription plans UI is unrouted per screen map → BROKEN (user cannot reach the UI route).
- Ad campaigns: `list_active_ad_campaigns` and `record_ad_campaign_event` in ad repository; Home integration → CONNECTED (presentation/readback UNCHECKED).
- Offers/events: static discovery data in `src/data/discoveryData`; no remote fetch established → LOCAL-ONLY.

PHASE 4 COMPLETE
## Phase 5 — Action trace, part 3 (Community and notifications)

- Community tab feed (`screens/CommunityFeedScreen.tsx`): screen imports feed UI; `initialPosts`/component state and interactions are local fixtures; no backend hook established → MOCK. Publish, like, bookmark, comment/share state on this tab is not proven to persist → LOCAL-ONLY (exact individual callback wiring UNCHECKED).
- Legacy Stack Community (`src/screens/CommunityScreen.js`): loads spaces/memberships/posts and uses community backend; provider detail/navigation; some interactions use sync/local cache → CONNECTED for reads; per-write persistence UNCHECKED.
- Publish / queued publish: legacy composer path and `syncRepository` invokes `publish_queued_community_post`; retries queued records → CONNECTED when synced; immediate success vs queued status needs UI-specific confirmation.
- Like, bookmark/save, comment, report, block: legacy feed hook queries/inserts `community_post_likes`, `community_saved_posts`, `community_comments`, `community_post_reports`, `community_user_blocks`; UI guards sign-in; error pathways vary → CONNECTED, readback and failure visibility UNCHECKED.
- Share: native share sheet; no backend persistence required → CONNECTED as device action (outcome tracking UNCHECKED).
- Saved posts tab: SavedScreen reads community_saved_posts/community_posts and member profile RPC; supports removal → CONNECTED.
- Community profile: `get_community_member_profile` RPC plus community_posts query → CONNECTED.
- Notifications list / mark all read: `notifications` query/update in account repository; errors are surfaced in notifications screen → CONNECTED.
- Push token registration: `pushNotifications.js` writes profile token metadata; function/migration support exists; registration can be unavailable by platform/runtime → CONNECTED with runtime/config UNCHECKED.
- Feed fixture items are MOCK; full exact line-by-line action handler matrix has not been proven and remains UNCHECKED where stated.

PHASE 5 COMPLETE
## Phase 6 — Cross-cutting checks

### Environment and secret handling
- Client reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `src/lib/supabase.js`; both are present in `.env` and `.env.local` (existence only; values intentionally omitted). Missing values set `supabase` to null, creating silent/local degraded paths.
- Other referenced `EXPO_PUBLIC_*` names from `.env.example`, `app.config.js`, and `eas.json`: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_SHA1`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_APP_ENV`, `EXPO_PUBLIC_EAS_PROJECT_ID`, `EXPO_PUBLIC_RELEASE_COMMIT`, `EXPO_PUBLIC_BRAND_NAME`, `EXPO_PUBLIC_BRAND_SHORT_NAME`, `EXPO_PUBLIC_SUPPORT_EMAIL`, `EXPO_PUBLIC_PRIVACY_EMAIL`, `EXPO_PUBLIC_BUSINESS_EMAIL`, `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_DELETE_ACCOUNT_URL`, `EXPO_PUBLIC_ENABLE_PAYMENTS`, `EXPO_PUBLIC_ENABLE_CUSTOM_ADS`, `EXPO_PUBLIC_ENABLE_GOOGLE_ADS`, `EXPO_PUBLIC_ENABLE_GOOGLE_MAPS`, `EXPO_PUBLIC_GOOGLE_ADS_ANDROID_BANNER_ID`, `EXPO_PUBLIC_GOOGLE_ADS_IOS_BANNER_ID`, `EXPO_PUBLIC_DEMO_MODE`.
- Local `.env.local` is missing several configured optional variables from the template (including Sentry DSN, release commit, legal URLs, Google OAuth IDs); production build validation requires Supabase URL/key, EAS project ID, release commit, legal URLs, and support email. `eas.json` sets feature flags but does not prove EAS secret values exist. EAS secret inventory: UNCHECKED.
- Sentry build variables `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, optional `SENTRY_URL`, and runtime `EXPO_PUBLIC_SENTRY_DSN` are conditionally used in `app.config.js`; presence in EAS secrets is UNCHECKED.
- Service-role key: no value displayed. No client reference was established in the targeted app source/config scan; `.env`/`.env.local` presence check for a service-role variable was not separately proven, so overall repository-wide absence is UNCHECKED. Do not place a service-role key in client config.

### Auth and session
`src/lib/supabase.js` sets `persistSession: true`, `autoRefreshToken: true`, PKCE flow, and stores native sessions through SecureStore (web through AsyncStorage), with an in-memory fallback that silently limits session persistence to the app run after storage failure. Auth callback/reset deep links use `chodhiq://auth/callback` and `chodhiq://auth/reset`; callback handling is implemented. Session-expiry UX during an in-flight non-auth action is UNCHECKED; repository writes generally return errors to callers or queue only selected operation types.

### Offline queue
`syncRepository.js` queues/sends community posts, quote requests, saved items, profile updates, and provider reports. Retry policy is exponential backoff capped at 30 minutes, maximum five attempts; selected SQLSTATE/HTTP client errors are permanent. Permanent/exhausted operations remain marked failed locally and telemetry is attempted; this hook exposes counts but user-visible failure notification is not established (UNCKECKED).

### Error handling and status acknowledgement
Some repositories optimistically update local UI/cache and queue changes before server confirmation. `remoteButtonConfig` logs refresh errors and retains defaults, so kill-switch config failure silently leaves controls enabled. `syncRepository` swallows telemetry-recording failures. Exact comprehensive list of swallowed write errors is UNCHECKED.

### Kill switch and Sentry
The `app_config` migration defines a read-only public row limited to `button_kill_switches`; client refresh is wired through `src/lib/remoteButtonConfig.js`; migration application is UNAPPLIED-OR-UNKNOWN. Sentry is integrated in source and conditionally configured in `app.config.js`; DSN/secrets and event delivery are UNCHECKED.

PHASE 6 COMPLETE

