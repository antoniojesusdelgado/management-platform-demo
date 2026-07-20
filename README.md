# Management Platform Demo

Private, full-stack SaaS demonstration for documenting modular operations,
permissions and process automation with synthetic data.

The repository is an independent technical reconstruction. Fundación
Cibervoluntarios is professional context for the portfolio case study only:
this codebase does not reproduce its internal source code, data, screens,
workflows or infrastructure.

## Scope

- Nine modules: Home, Leave, Tasks, Incidents, Treasury, Payroll, People,
  Changelog and Settings.
- A complete first vertical slice for Leave requests.
- A public guest demo at `/demo/embed`, isolated from Supabase and persisted
  only in `sessionStorage`.
- An invite-only authenticated application under `/app`.
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
- `http://localhost:3000/login` for the inactive OAuth entry point.

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
```

Docker is not required for the guest demo.

## Environment

Copy `.env.example` to `.env.local` only after the independent Supabase project
is approved and provisioned. Never commit `.env.local`.

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Browser | Exact application origin |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser | Independent project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser | Publishable project key |
| `SUPABASE_SECRET_KEY` | Server only | Provisioning or controlled admin tasks |
| `PORTFOLIO_ORIGIN` | Server/build | Only allowed iframe ancestor |
| `NEXT_PUBLIC_DEMO_MODE` | Browser | Explicit guest-demo flag |
| `GOOGLE_CLIENT_ID` | Provider config | Google OAuth client |
| `GOOGLE_CLIENT_SECRET` | Provider/server | Google OAuth secret |

No OpenAI key is required at runtime. AI tools are part of the documented
development workflow, not a product dependency.

## External services

No Supabase or Vercel resource is created by this repository. Provisioning and
the first Preview require explicit approval after reviewing cost and
configuration.

See:

- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Permissions](docs/PERMISSIONS.md)
- [Process maps](docs/PROCESS-MAPS.md)
- [Security policy](SECURITY.md)
