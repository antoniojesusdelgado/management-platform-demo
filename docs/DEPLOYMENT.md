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
bunx supabase start
bunx supabase db reset
bunx supabase test db
bunx supabase db lint --level warning --fail-on error
bunx supabase inspect db index-stats --local
bunx supabase gen types --lang typescript --local
bun run lint
bun run typecheck
bun run test
bun run security:public-data
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

Authenticated `SECURITY DEFINER` RPCs are reviewed exceptions, not ignored
advisor findings. Their required invariants and pgTAP coverage are documented
in [SECURITY-ADVISOR.md](./SECURITY-ADVISOR.md).

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

## Current release

- Production and canonical origin: <https://plataformagestion.app>
- Vercel fallback: <https://management-platform-demo.vercel.app>
- Stable branch Preview:
  <https://management-platform-de-git-acc0ac-antonio-jesus-delgado-briones.vercel.app>
- Release candidate: `v1.3.2`
- Supabase region and plan: `eu-central-1`, Free
- Production and Preview use environment-specific application and portfolio
  origins.
- The final local build and Preview passed the Playwright suite:
  43 tests passed and one desktop-only duplicate scenario was intentionally
  skipped.
- The deployed remote database contains 18 ordered migrations. The latest is
  `20260726142334_harden_rls_and_query_performance.sql`.
- The remote schema includes RLS policies, deterministic scenario provisioning
  and the neutral nightly integration schedule at 02:15 UTC.
- Release hardening removed all missing foreign-key indexes, unoptimized
  authentication policies and duplicate permissive read policies reported by
  the database advisors.
- Live isolation with a second Google identity remains a manual acceptance
  check. Multi-organization access isolation is covered by pgTAP.

## Release v1.3.2

Release `v1.3.2` is delivered from
`codex/management-platform-v1-3-2` as an additive content and directory patch:

1. Record people totals, placeholder names, distinct names and duplicate-name
   groups for every authenticated organization.
2. Run `bunx supabase db push --dry-run` and review only the pending v1.3.2
   migration.
3. Reset the local database, run pgTAP and confirm the SQL name mapping matches
   the TypeScript guest generator.
4. Apply the migration and verify that people totals and IDs are unchanged,
   while placeholder and duplicate-name counts are zero.
5. Push the release branch, validate its Vercel Preview and then promote that
   exact deployment to production.
6. Smoke-test guest and Google access, Personal and Novedades. Confirm v1.3.2
   is dated 30 July 2026 and canonical entries use non-technical language.

The migration does not insert or delete people. It renames only deterministic
V7 IDs that still carry the generated placeholder, and installs the same
mapping for later incremental inserts.

## Release v1.3.1

Release `v1.3.1` is delivered from
`codex/management-platform-v1-3-1` as an immutable patch over v1.3.0:

1. Run the complete application and local Supabase validation matrix.
2. Review `supabase db push --dry-run` and record organization counts before
   applying the additive migration.
3. Push the single release commit, open the PR and validate its Preview at
   320/360/390 and desktop widths.
4. Stage Vercel Firewall rules in log mode only. The user reviews traffic and
   publishes the draft from the dashboard; automation does not enable it.
5. Apply the migration, verify `scenario_v7_backfilled_at`, one `backfilled`
   event, preserved edited rows and 245–255 active people.
6. Run guest and existing-Google-user smoke tests, passive ZAP and security
   advisor review.
7. Promote the validated Preview, merge the authorized PR and tag the included
   main commit as `v1.3.1`.

The detailed database procedure is in
[SCENARIO-V7-BACKFILL.md](./SCENARIO-V7-BACKFILL.md). The PostgREST limiter is
enforced in the compatible migration; the outer IP-based WAF remains in
observation until the user publishes the reviewed rules. The staged state and
current plan limitation are recorded in
[VERCEL-FIREWALL-V1.3.1.md](./VERCEL-FIREWALL-V1.3.1.md).

## Release v1.3.0

Release `v1.3.0` is finalized on `codex/management-platform-v1-3-1`. Before
publication, run the complete local application suite, Scenario V7 generation,
database reset/pgTAP/lint/advisors and type comparison. Then:

1. Push one reviewed implementation commit and open a draft pull request.
2. Validate the Vercel Preview in the default light mode and manual dark mode.
3. Run the host-restricted passive ZAP Baseline and retain its artifact.
4. Review `supabase db push --dry-run`, then apply the additive migration.
5. Verify PKCE callback, renewal, logout and isolation with two Google
   identities.
6. Promote exactly the validated Preview artifact.
7. After authorized merge, confirm tree equality, tag `v1.3.0` and publish the
   GitHub Release.

The migration never deletes operational rows. `ensure_demo_scenario_current`
holds a per-organization transaction lock and appends only the missing interval
through yesterday in `Europe/Madrid`.

The runtime follow-up publishes the manual v1.3.0 changelog entry with the
approved editorial date `2026-06-23` and repairs only the known synthetic
mojibake signatures. The People form derives its team selector from persisted
organization data; authenticated writes revalidate the selected team and store
professional employment dates. A final additive migration also aligns existing
and newly provisioned organizations with `scenario_version = 7` when no daily
interval remains to be generated.

## Release v1.2.0

Release `v1.2.0` is developed on `codex/management-platform-v1-2`. It adds one
idempotent migration for Scenario V3, restores existing V2 demo organizations
once, and preserves the private avatar bucket and OAuth configuration.

The release sequence is: local database reset and pgTAP, application checks,
Preview deployment, V3 restoration in a test organization, OAuth and responsive
smoke tests, production promotion of the same artifact, idempotent workspace
restoration, production smoke test, tag and GitHub Release.

## Release v1.2.1

Release `v1.2.1` is developed on
`codex/management-platform-v1-2-1`. Its Scenario V4 migration preserves the
existing schema, replaces the six-month fictional operating scenario once for
organizations on V3, and records `demo.scenario.v4_restored` in the audit log.

The delivery sequence is unchanged: local reset and pgTAP, application checks,
Preview QA, remote migration dry run, compatible migration, promotion of the
validated Preview artifact, production smoke test, tag and GitHub Release.

## Release v1.2.2

Release `v1.2.2` is developed on
`codex/management-platform-v1-2-2`. Scenario V5 extends the fictional
operating interval from 1 January 2025 through 17 June 2026, adds
non-monetary payroll participants and the people hierarchy, and restores V4
organizations once with an audit event.

The post-release maintenance keeps the `v1.2.2` tag immutable while introducing
Scenario V6 and `GuestDemoState V14`. It adds employment contract modalities,
rebalances task completion, enforces project progress/state consistency and
improves user-facing analytical definitions and formatting. Delivery still
uses a reviewed Preview before applying the compatible migration and promoting
the same artifact.
