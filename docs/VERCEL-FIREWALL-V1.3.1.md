# Vercel Firewall v1.3.1

## Current state

The OAuth callback rule was reviewed and published from the Vercel dashboard:

- `Observe OAuth callback bursts`
- exact path `/auth/callback`
- 20 requests per 300 seconds by IP
- action `log`

The project plan returned `Rate limiting is not available for this plan (401)`
when the remaining rules were staged. Those rules therefore remain documented
recommendations rather than active controls.

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

Review Preview and production logs before changing an observation rule to an
enforcing action. Independently of the outer Firewall, the PostgREST
pre-request hook enforces 120 mutations per minute and 10 expensive RPC calls
per minute, returning HTTP `429` with `Retry-After`.
