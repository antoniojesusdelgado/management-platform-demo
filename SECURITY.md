# Security

## Public demonstration

The guest route uses synthetic data and does not connect to Supabase. Its state
is stored in `sessionStorage` and can be reset from the interface.

## Authenticated application

- Authentication uses Supabase Auth with Google OAuth, PKCE and secure cookies.
- Google sign-in is public. The first sign-in provisions one isolated,
  synthetic organization and a full-access demo role for that identity.
- The application profile stores a generated alias. Google name, email and
  avatar are not copied into public application tables.
- Users never share a workspace by default, which limits cross-user vandalism
  while retaining multi-organization RLS as the final authorization boundary.
- Proxy session refresh is not an authorization boundary.
- Server Actions and data access functions revalidate the user, membership,
  organization and stable permission code.
- PostgreSQL RLS is enabled on every application table.
- Authorization does not rely on editable user metadata.
- Privileged database helpers use an empty `search_path` and minimum execution
  grants.

## Secrets

Only variables prefixed with `NEXT_PUBLIC_` may reach the browser. Do not expose
the Google client secret, Supabase secret keys or database credentials. Google
credentials belong in the provider configuration, not in the application
environment.

Before a release:

1. Run secret scanning against the complete Git history and build output.
2. Verify Preview and Production have separate variables.
3. Rotate any secret that may have appeared in logs or local screenshots.
4. Review dependency advisories and Supabase Security Advisor results.
5. Run `bun run security:public-data` against runtime files and fixtures.
6. Run `bun run security:secrets`; CI checks tracked files and full Git history
   and rejects server-secret names under `NEXT_PUBLIC_*`.

## Request and input protection

- Vercel Firewall rules are prepared in log mode for OAuth callback, Server
  Actions and expensive operations; enforcement is enabled manually only after
  reviewing Preview and production traffic.
- PostgREST mutations pass through a database pre-request rate limiter. Normal
  mutations allow 120 requests per minute and expensive scenario/integration
  RPCs allow 10; the next request returns HTTP `429` with `Retry-After`.
- Reusable Zod schemas normalize Unicode, bound lengths and reject control
  characters or executable markup on the server. SQL punctuation remains plain
  data and Supabase queries remain parameterized.
- Authenticated dynamic surfaces use a per-request script nonce. The only
  `dangerouslySetInnerHTML` payload is the repository-owned static theme
  bootstrap; user input never reaches that API.

The rationale and testable invariants for intentionally exposed privileged
RPCs are maintained in [docs/SECURITY-ADVISOR.md](docs/SECURITY-ADVISOR.md).

## Reporting

Do not include personal data, credentials or exploit details in public issues.
Report findings privately to the repository owner.
