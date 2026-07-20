# Process maps

All maps describe the neutral demonstration, not internal employer workflows.

## Leave

```mermaid
flowchart LR
  Draft["Draft request"] --> Submit["Submit"]
  Submit --> Review["Permission and coverage review"]
  Review -->|Approve| Approved["Approved"]
  Review -->|Reject| Rejected["Rejected"]
  Submit -->|Cancel| Cancelled["Cancelled"]
  Approved -->|Exceptional cancellation| Cancelled
  Review --> History["Immutable event history"]
```

## Tasks

```mermaid
flowchart LR
  Backlog --> Assign --> Active --> Validate --> Completed
  Active --> Blocked --> Active
```

## Incidents

```mermaid
flowchart LR
  Register --> Prioritize --> Assign --> Investigate --> Resolve --> Close
```

## Treasury

```mermaid
flowchart LR
  Forecast --> Register --> Reconcile --> Validate --> Close
```

## Payroll

```mermaid
flowchart LR
  Collect["Collect changes"] --> Validate --> Calculate --> Review --> Close
```

## People

```mermaid
flowchart LR
  Invite --> Activate --> AssignRole["Assign role"] --> Maintain --> Deactivate
```

## Changelog

```mermaid
flowchart LR
  Draft --> Review --> Publish --> Notify
```

## Settings

```mermaid
flowchart LR
  Define --> ValidatePermissions["Validate permissions"] --> Apply --> Audit
```
