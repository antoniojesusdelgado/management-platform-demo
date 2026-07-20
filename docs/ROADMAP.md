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
- [ ] Validate pgTAP against local Supabase
- [ ] Validate Google OAuth with two invited test accounts

## Next module depth

1. Tasks: ownership, due dates, dependencies and activity history.
2. Incidents: priority, assignment, SLA states and resolution trail.
3. People: safe profile directory and organization lifecycle.
4. Changelog: draft, approval and publication.
5. Treasury and Payroll: synthetic-only structures with stricter permissions.

## External gates

- [ ] Approve exact Supabase cost and create an independent project in
  `eu-central-1`
- [ ] Configure Google OAuth and redirect URLs
- [ ] Approve the first Vercel Preview
- [ ] Set exact `PORTFOLIO_ORIGIN` and `NEXT_PUBLIC_APP_URL`
- [ ] Re-run CSP, RLS, accessibility and visual QA on the final Preview
