# ADR 0001: Stack and product boundaries

- Status: Accepted
- Date: 2026-07-20

## Decision

Use Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix, Tabler Icons, Bun,
Vercel and an independent Supabase project.

## Rationale

The stack supports SSR authentication, route handlers, server actions, an
embeddable public route and an authenticated application without combining the
portfolio and product codebases. Bun remains the single package manager.

## Consequences

- The portfolio links to a separately deployed runtime.
- Supabase and Vercel require independent provisioning and cost approval.
- The guest demo remains useful when external services are unavailable.
- No OpenAI API dependency exists in the runtime.
