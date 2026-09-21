# RLS Policy Matrix - ChodhiQ Database Security

**Last Updated:** 2026-09-01  
**Status:** Current as of security-hardening migrations (2026-08-12/13)  
**Owner:** Security Team

## Overview

This document provides a complete audit trail of Row-Level Security (RLS) policies across all ChodhiQ tables. Each policy is documented with:
- **Table**: Which table the policy protects
- **Policy Name**: Internal policy identifier
- **Operation**: SELECT, INSERT, UPDATE, or DELETE
- **Principal**: Who can perform the operation (authenticated, admin, owner, etc.)
- **Condition**: USING clause (access check) and WITH CHECK clause (mutation check)
- **Rationale**: Why this policy exists and what it protects

---

## Critical Policies (Data Isolation)

### 1. `profiles` Table

| Policy | Operation | Principal | USING Clause | WITH CHECK | Rationale |
|--------|-----------|-----------|--------------|------------|-----------|
| `profiles_select_own` | SELECT | authenticated | `auth.uid() = id` | N/A | Users read only their own profile |
| `profiles_update_own` | UPDATE | authenticated | `auth.uid() = id` | `auth.uid() = id` | Users update only their own profile |
| `profiles_insert_own` | INSERT | authenticated | N/A | `auth.uid() = id` | Users create only their own profile |
| `profiles_delete_own` | DELETE | authenticated | `auth.uid() = id` | N/A | Users delete only their own profile |

**Audit Status:** ✅ VERIFIED (RLS_AUDIT.sql passes)  
**Recent Changes:** AGGRESSIVE_RLS_FIX.sql (2026-08-12) dropped and recreated all policies

---

### 2. `providers` Table

| Policy | Operation | Principal | USING Clause | WITH CHECK | Rationale |
|--------|-----------|-----------|--------------|------------|-----------|
| `providers_select_public` | SELECT | anon, authenticated | `TRUE` (all can read) | N/A | Public marketplace data |
| `providers_select_own` | SELECT | authenticated | `public.owns_provider(auth.uid(), id)` | N/A | Providers see own details |
| `providers_update_own` | UPDATE | authenticated | `public.owns_provider(auth.uid(), id)` | `public.owns_provider(auth.uid(), id)` | Providers update own data |
| `providers_insert_bootstrap` | INSERT | authenticated | N/A | `auth.uid() = created_by` | Bootstrap only own provider |
| `providers_admin_override` | SELECT, UPDATE | admin | `TRUE` | `TRUE` | Admins audit and remediate |

**Helper Function:**
```sql
CREATE FUNCTION public.owns_provider(user_id uuid, provider_id uuid) RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.providers 
                WHERE id = provider_id AND created_by = user_id)
$$;
```

**Audit Status:** ✅ VERIFIED  
**Note:** Uses `SECURITY DEFINER` to prevent privilege escalation

---

### 3. `saved_items` Table (Customer Bookmarks)

| Policy | Operation | Principal | USING Clause | WITH CHECK | Rationale |
|--------|-----------|-----------|--------------|------------|-----------|
| `saved_items_select_own` | SELECT | authenticated | `auth.uid() = user_id` | N/A | Users read own saved items |
| `saved_items_insert_own` | INSERT | authenticated | N/A | `auth.uid() = user_id` | Users save items for themselves only |
| `saved_items_delete_own` | DELETE | authenticated | `auth.uid() = user_id` | N/A | Users remove own saved items |

**Audit Status:** ✅ VERIFIED  
**Protection:** Prevents users from seeing/modifying others' wishlists

---

### 4. `reviews` Table

| Policy | Operation | Principal | USING Clause | WITH CHECK | Rationale |
|--------|-----------|-----------|--------------|------------|-----------|
| `reviews_select_public` | SELECT | anon, authenticated | `TRUE` (published only) | N/A | Public reviews visible |
| `reviews_insert_own` | INSERT | authenticated | N/A | `auth.uid() = reviewer_id` | Users post reviews as themselves |
| `reviews_update_own` | UPDATE | authenticated | `public.owns_review(auth.uid(), id)` | `public.owns_review(auth.uid(), id)` | Users edit own reviews only |
| `reviews_admin_moderate` | UPDATE, DELETE | admin | `TRUE` | `TRUE` | Admins moderate inappropriate content |

**Audit Status:** ✅ VERIFIED  
**Risk:** Review data is semi-public; moderation critical

---

## Admin-Only Policies (Governance)

### 5. `admin_audit_log` Table

| Policy | Operation | Principal | USING Clause | WITH CHECK | Rationale |
|--------|-----------|-----------|--------------|------------|-----------|
| `audit_log_select_admin` | SELECT | admin | `TRUE` | N/A | Only admins read audit logs |
| `audit_log_insert_via_trigger` | INSERT | security_definer | N/A | `TRUE` | Trigger-based, automatic insertion |
| `audit_log_readonly` | UPDATE, DELETE | N/A | POLICY_FAIL | N/A | Audit logs immutable |

**Audit Status:** ✅ VERIFIED  
**Critical:** Ensures audit trail cannot be tampered with

---

### 6. `admin_roles` Table

| Policy | Operation | Principal | USING Clause | WITH CHECK | Rationale |
|--------|-----------|-----------|--------------|------------|-----------|
| `admin_roles_select_self` | SELECT | authenticated | `auth.uid() = user_id` | N/A | Users see own role status |
| `admin_roles_select_admin` | SELECT | admin | `TRUE` | N/A | Admins see all roles |
| `admin_roles_update_bootstrap` | UPDATE | security_definer | `TRUE` | `TRUE` | Only server can assign roles |

**Audit Status:** ✅ VERIFIED  
**Protection:** Prevents privilege escalation

---

## Shared/Community Policies

### 7. `community_posts` Table

| Policy | Operation | Principal | USING Clause | WITH CHECK | Rationale |
|--------|-----------|-----------|--------------|------------|-----------|
| `posts_select_published` | SELECT | anon, authenticated | `status = 'published'` | N/A | Public posts only |
| `posts_select_own_draft` | SELECT | authenticated | `auth.uid() = author_id` | N/A | Authors see own drafts |
| `posts_insert_own` | INSERT | authenticated | N/A | `auth.uid() = author_id` | Users post as themselves |
| `posts_update_own` | UPDATE | authenticated | `public.owns_post(auth.uid(), id)` | `public.owns_post(auth.uid(), id)` | Users edit own posts |
| `posts_admin_moderate` | SELECT, UPDATE, DELETE | admin | `TRUE` | `TRUE` | Admins moderate/remove |

**Audit Status:** ✅ VERIFIED  
**Note:** Accounts for draft/published states

---

## Transaction-Level Policies (Functions)

### 8. Quote Requests (Via RPC)

**Function:** `public.submit_quote_request(provider_id, message)`

```sql
CREATE FUNCTION public.submit_quote_request(
  p_provider_id uuid,
  p_message text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_quote_id uuid;
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  -- Create quote request
  INSERT INTO public.quote_requests (
    id, user_id, provider_id, message, created_at, status
  ) VALUES (
    gen_random_uuid(), auth.uid(), p_provider_id, p_message, now(), 'pending'
  ) RETURNING id INTO v_quote_id;

  -- Audit log
  INSERT INTO public.admin_audit_log (
    admin_id, action, entity_type, entity_id, details
  ) VALUES (
    auth.uid(), 'quote_request_submitted', 'quote_request', v_quote_id,
    jsonb_build_object('provider_id', p_provider_id)
  );

  RETURN json_build_object('id', v_quote_id, 'status', 'pending');
END $$;
```

**Security:** ✅ Uses SECURITY DEFINER with restricted search_path

---

## Emergency Fixes Applied

### Recent Changes (2026-08-12 to 2026-08-13)

| Migration File | Type | Reason | Policies Affected |
|---|---|---|---|
| `20260812_security_hardening.sql` | HARDENING | Added SECURITY DEFINER on helper functions | `owns_provider()`, `owns_review()`, etc. |
| `20260812_emergency_enable_rls.sql` | EMERGENCY | Ensure RLS enabled on all tables | All tables |
| `AGGRESSIVE_RLS_FIX.sql` | RESET | Dropped/recreated all policies from scratch | profiles, providers, saved_items, reviews |
| `COMPLETE_RLS_RESET.sql` | TRANSACTIONAL | Atomic policy reset with rollback support | All tables |
| `20260813_production_readiness.sql` | VERIFICATION | Post-fix validation and audit | N/A |

**Action:** Run [RLS_AUDIT.sql](../db/RLS_AUDIT.sql) to verify all policies work correctly

---

## Testing & Validation

### RLS Audit Results

Run this command to validate all policies:
```bash
# Staging environment only (destructive test)
psql $DATABASE_URL -f db/RLS_AUDIT.sql
```

**Expected Output:**
```
All RLS policies passed: ✅
- Customer isolation: PASS
- Provider ownership: PASS
- Admin override: PASS
- Audit log immutability: PASS
```

### Verification Checklist

- [ ] RLS enabled on all 8 critical tables
- [ ] All SELECT policies tested and passing
- [ ] All INSERT/UPDATE policies tested (ownership checks)
- [ ] DELETE policies prevent unauthorized removal
- [ ] Admin override policies confirmed
- [ ] SECURITY DEFINER functions use `SET search_path = public`
- [ ] Audit logging triggers present on sensitive tables
- [ ] No policies reference app_metadata (JWT scope)

---

## Policy Change Request Process

1. **Identify Need**: Document why current policy is insufficient
2. **Create Migration**: Name as `20260901_<description>.sql` (date format)
3. **Test in Staging**: Run RLS_AUDIT.sql to verify no breakage
4. **Security Review**: Get approval from security team
5. **Deploy to Production**: Use Supabase migrations dashboard
6. **Update This Matrix**: Add new policy to appropriate section

---

## Contacts & Escalation

- **Security Team Lead**: [To be filled in]
- **Database Administrator**: [To be filled in]
- **On-Call Escalation**: [To be filled in]

**Emergency Policy Issue?** Contact security team immediately.

