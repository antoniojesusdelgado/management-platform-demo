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
  Pending --> InProgress["In progress"] --> InReview["In review"] --> Completed
  Pending --> Blocked --> InProgress
  InProgress --> Blocked
```

## Incidents

```mermaid
flowchart LR
  Registered --> Triaged --> Assigned --> Investigating --> Resolved --> Closed
  Resolved -->|Reopen| Investigating
```

## Treasury

```mermaid
flowchart LR
  Draft --> Registered --> Reconciled --> Validated --> Closed
  Draft --> History["Immutable synthetic event history"]
  Registered --> History
  Reconciled --> History
  Validated --> History
  Closed --> History
```

## Payroll

```mermaid
flowchart LR
  Collect["Collect changes"] --> Validate --> Calculate --> Review --> Close
```

Only collection-stage cycles can be edited. Every transition requires a
decision note and appends an immutable event. Values are synthetic aggregates;
individual payroll records remain outside the demo boundary.

## People

```mermaid
flowchart LR
  Invited --> Active --> AssignRole["Assign role"] --> Maintain
  Active --> Suspended --> Active
  Active --> Inactive
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

## Incremental demo scenario

```mermaid
flowchart LR
  Enter["Enter organization"] --> Authenticate
  Authenticate --> Authorize["Verify active membership"]
  Authorize --> Lock["Lock organization"]
  Lock --> Pending{"Missing dates through yesterday?"}
  Pending -->|No| Load["Load module"]
  Pending -->|Yes| Generate["Append deterministic interval"]
  Generate --> Audit["Record counts and audit"]
  Audit --> Advance["Advance horizon atomically"]
  Advance --> Load
```
