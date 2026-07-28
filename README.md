# Management Platform Demo

Public, full-stack SaaS demonstration for documenting modular operations,
permissions and process automation with synthetic data.

The repository is an independent technical reconstruction. It does not
reproduce third-party source code, data, screens, workflows, brands or
infrastructure.

## Scope

- Eleven modules: Home, Leave, Analytics, Projects, Tasks, Incidents, Treasury,
  Payroll, People, Changelog and Settings.
- Complete verticals for Leave, Tasks, Incidents, People, Changelog, Settings,
  Treasury and Payroll.
- A public guest demo at `/demo/embed`, isolated from Supabase and persisted
  only in `sessionStorage`.
- A public Google OAuth entry point under `/app`. Each authenticated user gets
  an isolated synthetic workspace with full demo permissions.
- PostgreSQL schema, RLS policies, permission checks and pgTAP tests prepared
  for an independent Supabase project.
- Route-specific framing policy: only `/demo/embed` can be embedded, and only
  from the exact `PORTFOLIO_ORIGIN`.

All public product copy is in Spanish. Code, routes, identifiers and repository
documentation are in English.

## Local setup

```powershell
bun install --frozen-lockfile
bun run dev
```

Open:

- `http://localhost:3000/demo/embed` for the guest demo.
- `http://localhost:3000/login` for Google OAuth when Supabase is configured.

## Validation

```powershell
bun test
bun run lint
bun run typecheck
bun run build
bun run e2e
git diff --check
```

Local Supabase validation additionally requires Docker:

```powershell
bunx supabase start
bunx supabase db reset
bunx supabase test db
bunx supabase db lint --local --level warning --fail-on error
```

Docker is not required for the guest demo.

## Environment

Copy `.env.example` to `.env.local` after provisioning the independent
Supabase project. Never commit `.env.local`.

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Browser | Exact application origin |
| `NEXT_PUBLIC_VERCEL_URL` | Browser | Preview origin supplied by Vercel |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser | Independent project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser | Publishable project key |
| `PORTFOLIO_ORIGIN` | Server/build | Only allowed iframe ancestor |
| `NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL` | Browser | Public privacy contact |

No OpenAI key is required at runtime. AI tools are part of the documented
development workflow, not a product dependency.

## External services

Google OAuth credentials are configured directly in Supabase Auth and never as
Vercel application variables. Supabase Auth necessarily retains the provider
account identifier; the application does not copy the Google name, email or
avatar into its operational profile.

See [Deployment](docs/DEPLOYMENT.md) for the exact Preview, OAuth and production
checklist.

See:

- [Architecture](docs/ARCHITECTURE.md)
- [Technical case study](docs/TECHNICAL-CASE-STUDY.md)
- [Third-party licenses](docs/THIRD-PARTY-LICENSES.md)
- [Roadmap](docs/ROADMAP.md)
- [Permissions](docs/PERMISSIONS.md)
- [Process maps](docs/PROCESS-MAPS.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Security policy](SECURITY.md)
