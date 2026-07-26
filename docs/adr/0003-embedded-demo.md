# ADR 0003: Embedded guest demo

- Status: Accepted
- Date: 2026-07-20

## Decision

Expose a guest application at `/demo/embed`. It uses synthetic seed data,
persists mutations only in `sessionStorage` and provides a reset action.

Only this path may be framed. Its `frame-ancestors` CSP accepts the exact
`PORTFOLIO_ORIGIN`; every other route uses `frame-ancestors 'none'` and
`X-Frame-Options: DENY`.

## Rationale

Recruiters can explore a working flow without authentication, while the
authenticated product remains protected and isolated.

## Limitations

The exact portfolio and SaaS origins are unknown until the first reviewed
Preview. Framing must be verified again when those origins become stable.
