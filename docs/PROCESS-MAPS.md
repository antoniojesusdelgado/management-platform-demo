# Mapas de procesos

## Exportación conectada v1.7.0

```mermaid
flowchart LR
  user["Persona autorizada"] --> request["Solicita una exportación"]
  request --> validate["Servidor reconstruye permisos y filtros"]
  validate --> local["CSV o XLSX local"]
  validate --> pending["Trabajo externo pendiente"]
  pending --> confirm["Confirmación explícita"]
  confirm --> provider["Google Sheets o Microsoft Excel"]
  provider --> notify["Resultado en el centro operativo"]
```

## Conexión de productividad

```mermaid
sequenceDiagram
  participant U as Persona
  participant A as Aplicación
  participant P as Google o Microsoft
  participant V as Supabase Vault
  U->>A: Conectar proveedor
  A->>P: Authorization Code + PKCE + state cifrado y autenticado
  P-->>A: Código autorizado
  A->>A: Validar state, identidad y organización
  A->>P: Intercambiar código en servidor
  A->>V: Cifrar tokens
  A-->>U: Mostrar capacidades y estado
```

Todos los diagramas describen la demostración neutral, no procesos internos de
una organización real.

## Consentimiento analítico

```mermaid
flowchart LR
  Visitante["Persona visitante"] --> Estado{"¿Existe una preferencia?"}
  Estado -->|No| Aviso["Aviso con aceptar y rechazar al mismo nivel"]
  Aviso -->|Rechazar| SinGA["No cargar Google Analytics"]
  Aviso -->|Aceptar| GA["Cargar GA4 y medir páginas de forma agregada"]
  Estado -->|Rechazado| SinGA
  Estado -->|Aceptado| GA
  Pie["Preferencias en el pie legal"] --> Aviso
```

## Supresión de cuenta

```mermaid
flowchart LR
  Perfil["Mi perfil"] --> Confirmar["Confirmación textual explícita"]
  Confirmar --> Revocar["Eliminar conexiones y credenciales guardadas"]
  Revocar --> Anonimizar["Anonimizar perfil y desvincular directorio"]
  Anonimizar --> Suspender["Suspender membresías"]
  Suspender --> Auth["Desactivar identidad en Supabase Auth"]
  Auth --> Salir["Cerrar sesión y volver al acceso"]
```

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
