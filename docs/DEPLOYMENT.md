# Deployment

## Release model

The public guest route works without authentication or Supabase. Google OAuth
unlocks the authenticated technical demonstration; each identity receives a
separate synthetic workspace with full permissions. No real operational,
financial or employment data belongs in either path.

Preview is the release candidate. Production is created only after the Preview
passes database, browser, accessibility and security checks.

## 1. Local quality gate

```powershell
bun install --frozen-lockfile
bunx supabase db start
bunx supabase db reset --local
bunx supabase test db --local
bunx supabase db lint --local --level warning --fail-on error
bunx supabase gen types --lang typescript --local
bun run lint
bun run typecheck
bun run test
bun run build
bun run e2e
git diff --check
```

The generated output must match
`src/lib/supabase/database.types.ts`.

To run the same browser suite against an already deployed Preview:

```powershell
$env:PLAYWRIGHT_BASE_URL = "https://<preview-host>"
bun run e2e
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

## 2. Supabase

1. Create a dedicated project in `eu-central-1`.
2. Review migration output with `supabase db push --dry-run`.
3. Apply the reviewed migrations.
4. Run Database Linter and Security Advisor.
5. Use the project URL and an enabled `sb_publishable_...` key in Vercel.
6. Keep secret/service-role keys out of the application.

Email and anonymous sign-ups remain disabled. Google is the only public
application provider.

## 3. Google OAuth

Create a Web application in Google Auth Platform. Add:

- Authorized JavaScript origins: the exact production origin and the stable
  Preview origin used for OAuth QA.
- Authorized redirect URI:
  `https://<project-ref>.supabase.co/auth/v1/callback`.

Configure the Google client ID and secret only in Supabase Auth. In Supabase URL
Configuration:

- Set Site URL to the production origin.
- Add `http://localhost:3000/**` for development.
- Add the exact production callback path.
- Add a Vercel Preview wildcard only for the project/account slug used by this
  repository.

Validate successful login, PKCE callback, cookie refresh, logout and workspace
isolation with two test identities. Confirm neither provider identity is copied
to `public.profiles`.

## 4. Vercel Preview

Configure Preview and Production variables:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
PORTFOLIO_ORIGIN
```

`NEXT_PUBLIC_APP_URL` must be the exact origin for its environment.
`PORTFOLIO_ORIGIN` must be the exact portfolio origin; only `/demo/embed` may
be framed by it.

Deploy Preview, then verify:

- `/`, `/demo/embed`, `/login` and all authenticated module routes.
- Desktop and 360 px mobile layouts.
- Keyboard navigation, visible focus, reduced motion and Axe results.
- OAuth provisioning and cross-workspace RLS.
- CSP, frame ancestors, referrer policy and MIME-sniffing headers.
- No runtime errors, secrets, personal data or unexpected outbound requests.

## 5. Production

Promote only the source revision that passed Preview QA, using the Production
environment values. After promotion:

1. Repeat smoke tests on public, embedded and authenticated routes.
2. Inspect runtime errors and deployment logs.
3. Confirm the portfolio embed origin.
4. Confirm Google OAuth uses the production origin.
5. Keep the previous deployment available for rollback.
