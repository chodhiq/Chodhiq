# Supabase Security Advisor review — 2026-10-21

Project: ChodhiQ Production (`gfjhvsajwjrrlylgrkhf`)

## Reviewed findings

### `public.spatial_ref_sys` — RLS disabled (ERROR)

This is the PostGIS extension's coordinate-system lookup table, not ChodhiQ customer or provider data. Supabase's current PostGIS guidance says this finding occurs because PostGIS was installed in the API-exposed `public` schema. The table is extension-owned, and the project's `postgres` role may not own it, so a migration using `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` or `REVOKE` may fail. Do not run that proposed direct-table fix.

The durable fix is to relocate PostGIS into a dedicated non-exposed schema, preferably `extensions`, but Supabase documents that its usual process requires a full backup and dropping/recreating PostGIS with `CASCADE`, followed by restoring dependent objects. That can affect ChodhiQ's `geography(Point,4326)` column and GiST index in `public.providers`, as well as other PostGIS objects. Before production work, capture a restorable backup, inventory dependencies and extension versions, rehearse on a production clone/staging project, and verify geographic types, indexes, provider reads, and all spatial queries. If a destructive rebuild is unacceptable, contact Supabase Support about their documented extension relocation procedure. Do not execute an unreviewed `DROP EXTENSION ... CASCADE` in production.

Local migrations currently create PostGIS with `CREATE EXTENSION IF NOT EXISTS postgis;` in `20260805192639_create_chodhiq_marketplace_schema.sql`; they do not explicitly select a schema. The production extension's actual version/schema and dependencies still need to be inspected in the Dashboard or by a read-only database query.

### Public Storage bucket listing (WARN)

`provider-media` and `ad-creatives` are intentionally public buckets. The app and provider dashboard consume generated public URLs; they do not list objects. The admin dashboard uploads creatives and removes failed uploads; it does not list objects. Public buckets serve known public object URLs without a broad `SELECT` policy. Migration `20261021120000_harden_supabase_linter_findings.sql` drops only the two broad listing policies while retaining public bucket settings and existing insert/update/delete policies.

Before applying, verify in Storage that both buckets are still public and that policy names match. After applying, verify known provider-media and ad-creative public URLs load, listing objects as `anon` is denied, owner/admin uploads and admin cleanup still work, and the Security Advisor no longer reports `public_bucket_allows_listing`.

## Not changed by this migration

- The 73 `SECURITY DEFINER` function warnings require an exact live grant and caller review, and may include extension functions and trigger functions. Revoke only grants proven unnecessary; do not blanket-revoke.
- `postgis` and `pg_trgm` extension placement warnings remain. Moving either requires a dependency/upgrade plan; PostGIS specifically needs the backup/rehearsal described above.
- Leaked-password protection is a Supabase Auth dashboard setting and needs a separate operational change and sign-in flow check.
- The three RLS-enabled tables with no policies are consistent with server-only access controls in local migrations and are left unchanged.

## Production execution record

No production database or Auth setting was changed as part of this review. The reviewed Storage-policy migration is local only until applied through the approved production change process. Capture the apply time, operator, result, post-change checks, and updated Advisor output here after rollout.

## References

- [Supabase PostGIS guide and `spatial_ref_sys` troubleshooting](https://supabase.com/docs/guides/database/extensions/postgis)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
