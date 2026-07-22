# Roadmap

## Foundation

- [x] Independent repository and protected development branch
- [x] Selected light visual system and responsive shell
- [x] Nine navigable modules
- [x] Guest repository with session-only persistence
- [x] Invite-only OAuth boundary prepared
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
- [ ] Validate Google OAuth with two invited test accounts

## Local security validation

- [x] Multi-organization pgTAP scenarios prepared
- [x] Draft submission aligned across domain, Server Actions and SQL
- [x] Install or enable a Docker-compatible runtime
- [x] Reset the local database and execute pgTAP
- [x] Generate TypeScript database types from the validated local schema
- [x] Add the database validation job to CI after local reproducibility is proven

## Next module depth

1. [x] Tasks: ownership, due dates, dependencies and activity history.
2. Incidents: priority, assignment, SLA states and resolution trail.
3. People: safe profile directory and organization lifecycle.
4. Changelog: draft, approval and publication.
5. Treasury and Payroll: synthetic-only structures with stricter permissions.

## Tasks vertical

- [x] Independent task status and priority domains
- [x] Personal inbox, filters, creation, assignment and editing
- [x] Blocking, review and completion workflow
- [x] Directed dependencies with cycle prevention
- [x] Comments and immutable activity events
- [x] Version 1 to version 2 guest session migration
- [x] Authenticated reads, Server Actions and typed Supabase clients
- [x] Multi-organization RLS and pgTAP coverage

## External gates

- [ ] Approve exact Supabase cost and create an independent project in
  `eu-central-1`
- [ ] Configure Google OAuth and redirect URLs
- [ ] Approve the first Vercel Preview
- [ ] Set exact `PORTFOLIO_ORIGIN` and `NEXT_PUBLIC_APP_URL`
- [ ] Re-run CSP, RLS, accessibility and visual QA on the final Preview
