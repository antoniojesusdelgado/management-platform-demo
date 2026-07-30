# Scenario V7 backfill runbook

## Objective

Complete missing V7 history in legacy authenticated organizations without
deleting or overwriting user records. `scenario_generated_through_date` tracks
the daily horizon; `scenario_v7_backfilled_at` independently proves that the
historical backfill completed.

## Local validation

```powershell
bunx supabase db reset --local
bunx supabase test db
bunx supabase db lint --local --level warning --fail-on error
bunx supabase gen types --lang typescript --local
```

The required acceptance cases are a legacy organization, a new organization,
a second idempotent call, preservation of an edited row and 245–255 active
people at the current horizon.

## Remote procedure

1. Record counts for `people`, `tasks`, `leave_requests`, `incidents`,
   `treasury_entries`, `payroll_runs`, `integration_runs` and
   `scenario_evolution_events`.
2. Run `supabase db push --dry-run` and review the pending migration sequence.
3. Apply the migration. It locks one organization at a time and automatically
   backfills organizations with an active membership.
4. Re-read the counts, the `scenario_v7_backfilled_at` marker, the single
   `backfilled` event and the audit event.
5. Sign in with the existing Google identity and call the guarded
   `ensure_demo_scenario_current` path through normal application entry.
6. Confirm edited user rows remain unchanged and a second call generates no
   duplicate event.

Do not invoke obsolete restoration RPCs and do not force the organization to
an exact row count. Existing manual rows legitimately make total history larger
than the canonical synthetic scenario.

## v1.3.2 directory normalization

Release v1.3.2 does not rerun the historical backfill. It maps the existing
deterministic `person-v7` IDs to the same 266 unique fictional names used by
the guest generator and updates only rows whose display name still starts with
`Persona sint`. A private insert trigger applies the same mapping to later
incremental V7 inserts.

Before and after applying the migration, record total people, placeholder
count, distinct names and duplicate names per organization. Totals and IDs must
remain unchanged; placeholders and duplicate-name groups must both be zero.

## Rollback

The migration is additive and its generated IDs are deterministic. Do not
delete generated rows as an automatic rollback because they may already have
been edited. If an application rollback is required, restore the prior
deployment while leaving the compatible schema in place and investigate by
organization using audit and evolution events.
