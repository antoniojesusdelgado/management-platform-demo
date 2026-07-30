# Mapas de procesos

Todos los diagramas describen la demostración neutral, no procesos internos de
una organización real.

## Vacaciones

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

## Tareas

```mermaid
flowchart LR
  Pending --> InProgress["In progress"] --> InReview["In review"] --> Completed
  Pending --> Blocked --> InProgress
  InProgress --> Blocked
```

## Incidencias

```mermaid
flowchart LR
  Registered --> Triaged --> Assigned --> Investigating --> Resolved --> Closed
  Resolved -->|Reopen| Investigating
```

## Tesorería

```mermaid
flowchart LR
  Draft --> Registered --> Reconciled --> Validated --> Closed
  Draft --> History["Immutable synthetic event history"]
  Registered --> History
  Reconciled --> History
  Validated --> History
  Closed --> History
```

## Nóminas

```mermaid
flowchart LR
  Collect["Collect changes"] --> Validate --> Calculate --> Review --> Close
```

Solo pueden editarse los ciclos que están en fase de recopilación. Cada
transición exige una nota de decisión y añade un evento inmutable. Los valores
son agregados ficticios; los registros individuales de nómina quedan fuera de
los límites de la demo.

## Personal

```mermaid
flowchart LR
  Invited --> Active --> AssignRole["Assign role"] --> Maintain
  Active --> Suspended --> Active
  Active --> Inactive
```

## Novedades

```mermaid
flowchart LR
  Draft --> Review --> Publish --> Notify
```

## Configuración

```mermaid
flowchart LR
  Define --> ValidatePermissions["Validate permissions"] --> Apply --> Audit
```

## Escenario incremental de demostración

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
