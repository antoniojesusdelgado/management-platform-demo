# Vercel Firewall v1.3.1 draft

## Current state

The linked Vercel project has one unpublished rule staged:

- `Observe OAuth callback bursts`
- exact path `/auth/callback`
- 20 requests per 300 seconds by IP
- exceed action `log`

Do not run `vercel firewall publish` until traffic has been reviewed. The
project plan returned `Rate limiting is not available for this plan (401)` when
staging the remaining rules, so this draft may also require a plan upgrade
before publication.

## Remaining reviewed rules

When the plan supports rate limiting, stage these in log mode:

1. Header `next-action` exists: 120 requests per 60 seconds by IP.
2. `POST` requests to `/app/configuracion` or `/app/integraciones`: 10 requests
   per 60 seconds by IP.

After staging, run:

```powershell
npx --yes vercel@latest firewall diff --no-color
npx --yes vercel@latest firewall rules list --expand --no-color
```

Review Preview and production logs for legitimate bursts. Only the user
publishes the reviewed draft from Vercel. Until then, the PostgREST pre-request
hook enforces 120 mutations per minute and 10 expensive RPC calls per minute,
returning HTTP `429` with `Retry-After`.
