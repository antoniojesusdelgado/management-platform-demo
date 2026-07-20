# ADR 0002: Invite-only authentication and RLS

- Status: Accepted
- Date: 2026-07-20

## Decision

Use Google OAuth through Supabase Auth with PKCE and SSR cookies. Require an
active membership after login. Enforce organization isolation and permission
checks in both server code and PostgreSQL RLS.

## Security controls

- No public sign-up UI.
- No authorization based on `user_metadata`.
- Stable permission codes independent from editable role names and colors.
- Server Actions revalidate identity, membership and permission.
- Privileged SQL functions use `security definer`, explicit object names, an
  empty `search_path` and restricted `EXECUTE`.
- RLS is enabled for every application table.

## Residual risks

Serverless rate limits, invitation delivery and OAuth-provider configuration
must be validated after provisioning. RLS tests require local Docker or an
isolated database.
