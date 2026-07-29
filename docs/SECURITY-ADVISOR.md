# Security advisor review

## Release posture

The guest demo does not connect to Supabase. Authenticated Google identities
receive separate synthetic workspaces, and every exposed application table has
row-level security enabled.

The release hardening migration:

- adds a supporting left-prefix index for every public foreign key;
- evaluates `auth.uid()` once per statement in RLS policies;
- separates read policies from insert, update and delete policies;
- preserves organization and stable-permission predicates.

## Privileged RPC allowlist

The application intentionally exposes a reviewed allowlist of authenticated
`SECURITY DEFINER`
functions through PostgREST. They provide the transactional boundary for
validated state transitions, aggregate financial demo workflows, self-service
preferences, workspace lifecycle and synthetic integration runs.

These functions are an explicit Security Advisor exception. Every allowlisted
RPC must satisfy all of the following invariants:

1. `anon` and `PUBLIC` cannot execute it.
2. Only `authenticated` receives the required execution grant.
3. The function has an empty `search_path`.
4. The body explicitly checks `auth.uid()`.
5. Organization mutations also check membership or a stable permission code.
6. Direct table writes remain narrower than the RPC contract where the module
   requires immutable events or transition validation.

`supabase/tests/011_release_hardening.sql` verifies the structural invariants.
Module and multi-organization pgTAP suites verify the authorization outcomes.
`supabase/tests/014_release_v1_3.sql` additionally covers the guarded Scenario
V7 RPC, private generator, RLS on both new tables and mojibake detection.
`supabase/tests/015_release_v1_3_1.sql` covers the backfill marker,
TypeScript/SQL workforce milestones, idempotency, legacy RPC revocation and
rate-limit behavior below and above the expensive-operation threshold.

The advisor warning must not be dismissed globally. Any new privileged RPC
requires an individual review, a minimum grant, an identity check and pgTAP
coverage before it can join this allowlist.

CI runs `bun audit --audit-level=high`, CodeQL and Dependency Review. The ZAP
Baseline workflow is manual and accepts only a validated root HTTPS
`*.vercel.app` Preview; its passive report is retained as an artifact.

`check_management_request_rate_limit` is the only privileged function granted
to `authenticator` rather than application roles. It is registered as the
PostgREST pre-request hook, stores only a one-way subject hash and bounded path,
and is not executable by `anon` or `authenticated`. Historical V3–V6 restore
RPCs and the V2 restoration marker are explicitly revoked.

## Authentication advisor

Google OAuth is the only public authentication provider. Password sign-in and
anonymous sign-up are not application entry points, so leaked-password
protection does not participate in the current login flow. If password sign-in
is enabled later, leaked-password protection becomes a release prerequisite.

## Manual acceptance

Database isolation is tested with multiple synthetic identities. Before a
formal portfolio release, complete one live browser acceptance run with two
separate Google accounts and confirm:

- each account provisions a different organization;
- neither account can open records from the other organization;
- logout removes access to protected routes;
- simulated roles only reduce effective permissions.
