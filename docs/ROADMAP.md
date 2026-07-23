# Roadmap

## Foundation

- [x] Independent repository and protected development branch
- [x] Selected light visual system and responsive shell
- [x] Nine navigable modules
- [x] Guest repository with session-only persistence
- [x] Public Google OAuth boundary with isolated synthetic workspaces
- [x] Multi-organization schema and RLS baseline

## First vertical slice: Leave

- [x] Request creation and validation
- [x] Pending, approved, rejected and cancelled states
- [x] Approval and rejection actions
- [x] History and calendar summary
- [x] Server Actions and database transition function
- [x] Decision confirmations with required notes
- [x] Monthly coverage calendar and overlap indicators
- [x] Validated session persistence with in-memory fallback
- [x] Validate pgTAP against local Supabase
- [ ] Validate Google OAuth and isolated provisioning with two test accounts

## Local security validation

- [x] Multi-organization pgTAP scenarios prepared
- [x] Draft submission aligned across domain, Server Actions and SQL
- [x] Install or enable a Docker-compatible runtime
- [x] Reset the local database and execute pgTAP
- [x] Generate TypeScript database types from the validated local schema
- [x] Add the database validation job to CI after local reproducibility is proven

## Next module depth

1. [x] Tasks: ownership, due dates, dependencies and activity history.
2. [x] Incidents: priority, assignment, synthetic SLA and resolution trail.
3. [x] People: safe profile directory and organization lifecycle.
4. [x] Changelog and Settings: draft, review, publication and auditable administration.
5. [x] Treasury: aggregated synthetic movements with strict permissions and traceability.
6. [x] Payroll: synthetic-only aggregated cycles with stricter permissions.

## Tasks vertical

- [x] Independent task status and priority domains
- [x] Personal inbox, filters, creation, assignment and editing
- [x] Blocking, review and completion workflow
- [x] Directed dependencies with cycle prevention
- [x] Comments and immutable activity events
- [x] Version 1 to version 2 guest session migration
- [x] Authenticated reads, Server Actions and typed Supabase clients
- [x] Multi-organization RLS and pgTAP coverage

## Incidents and People vertical

- [x] Independent incident lifecycle, priorities, categories and synthetic SLA
- [x] Filterable guest inbox, creation, assignment and transition history
- [x] Safe People directory without contact, identity or compensation data
- [x] Membership state and stable role-code management
- [x] Availability derived from approved Leave records
- [x] Version 2 to version 3 guest session migration
- [x] Authenticated reads and normalized Server Actions
- [x] Immutable incident and People events
- [x] Multi-organization RLS, privileged transition and pgTAP coverage

## Changelog and Settings vertical

- [x] Draft, review and publication workflow with immutable history
- [x] Published-only internal public view
- [x] Organization identity and module activation/order
- [x] Editable role metadata separated from stable permission assignments
- [x] Membership lifecycle and invitation preparation without external delivery
- [x] Administrative audit trail for roles, permissions, modules and access
- [x] Version 3 to version 4 guest session migration
- [x] Authenticated reads, Server Actions and privileged database functions
- [x] Multi-organization RLS and pgTAP coverage

## Treasury vertical

- [x] Aggregated synthetic concepts, dates, amounts and currencies
- [x] Monotonic draft, registration, reconciliation, validation and closure workflow
- [x] Immutable activity events for creation, draft edits and status controls
- [x] Separate read and manage permissions with no direct table writes
- [x] Version 4 to version 5 guest session migration
- [x] Authenticated reads and normalized Server Actions through privileged RPCs
- [x] Multi-organization RLS and pgTAP coverage
- [x] Responsive filters, explicit synthetic-data notice and accessible dialogs

## Payroll vertical

- [x] Aggregated synthetic periods, people counts and gross, deduction and net totals
- [x] Monotonic collection, validation, calculation, review and closure workflow
- [x] Immutable activity events for creation, collection edits and status controls
- [x] Separate read and manage permissions with no direct table writes
- [x] Version 5 to version 6 guest session migration
- [x] Authenticated reads and normalized Server Actions through privileged RPCs
- [x] Multi-organization RLS and pgTAP scenarios authored
- [x] Re-run database reset, lint and pgTAP in CI, then regenerate local schema types
- [x] Responsive filters, explicit aggregate-data notice and accessible dialogs

## External gates

- [x] Authorize external provisioning, Preview and production deployment
- [x] Confirm the target Supabase organization and exact cost (Free plan, $0)
- [x] Create an independent Supabase project in
  `eu-central-1`
- [x] Configure Google OAuth and redirect URLs
- [x] Create and validate the first Vercel Preview
- [x] Set exact `PORTFOLIO_ORIGIN` and `NEXT_PUBLIC_APP_URL`
- [x] Re-run CSP, RLS, accessibility and visual QA on the final Preview
- [x] Promote the validated Vercel artifact to production

## Release status

- Production: <https://management-platform-demo.vercel.app>
- Stable Preview:
  <https://management-platform-de-git-acc0ac-antonio-jesus-delgado-briones.vercel.app>
- Released revision: `f0a0712`
- Google OAuth login, logout and protected-route redirects validated in
  Preview and Production.
- Public guest flows validated in desktop and mobile with Playwright and Axe.
- Live provisioning was validated with one Google identity. Isolation between
  two identities remains a manual acceptance check; database isolation is
  covered by multi-organization pgTAP scenarios.
