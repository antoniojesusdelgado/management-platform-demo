# Vercel firewall review for v1.5.0

## Purpose

This review complements Vercel's automatic DDoS protection. It does not claim
to prevent all scraping or automated traffic. The application protects private
data and authenticated operations instead of blocking legitimate indexing.

## Staged rules

Any custom rule must start in log mode. Suggested candidates are:

1. Record unusually high request volume against `/auth/google` and
   `/auth/callback` without blocking the OAuth flow.
2. Record repeated requests to authenticated application routes that do not
   carry the expected session context.
3. Record automated bursts against expensive scenario reset operations while
   retaining the database pre-request limiter as the enforcement boundary.

Do not publish a blocking rule until its traffic sample has been reviewed and
the repository owner has explicitly confirmed activation.

## False-positive checks

Before changing a log rule to block or challenge, confirm that it does not
affect:

- Google OAuth redirects and callbacks;
- the portfolio iframe from `https://antoniodelgado.tech`;
- Googlebot and social preview crawlers on public pages;
- Preview deployments used by CI and browser validation;
- authenticated users restoring their isolated demonstration workspace.

Keep a rollback path and review Vercel logs after every rule change. Firewall
configuration is operational state and is not activated by this document.
