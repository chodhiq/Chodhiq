# Privileged operation matrix

Client role checks control presentation only. Every operation below requires server-side authorization.

| Operation                         | Entry point                             | Authoritative authorization                       | Audit path                             |
| --------------------------------- | --------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| Change administrator role         | `admin-role-control` Edge Function      | Validated caller JWT and server-side admin role   | Admin audit record                     |
| Suspend/reactivate user           | `admin-user-control` Edge Function      | Validated caller JWT and server-side admin role   | User moderation record and admin audit |
| Decide provider verification      | `admin_decide_verification` RPC         | `is_admin()` and transition preconditions         | Admin audit wrapper/server record      |
| Resolve provider/community report | `admin_resolve_report` RPC              | `is_admin()` and stale-state preconditions        | Server-audited resolution              |
| Moderate community post           | `admin_transition_community_post` RPC   | `is_admin()` and stale-state preconditions        | Server-audited transition              |
| Delete customer account           | `delete-account` Edge Function          | Caller may target only its authenticated account  | Account-deletion preparation/logging   |
| Create payment checkout           | `create-checkout-session` Edge Function | Authenticated provider ownership and enabled plan | Payment provider/session records       |
| Process payment webhook           | `stripe-webhook` Edge Function          | Stripe signature verification                     | Payment/subscription records           |

## Review gate

Any new privileged mutation must add a row here, verify authorization on the server, produce an audit record where appropriate, and include a negative authorization test. Direct table writes from an admin component are forbidden for privileged state transitions.
