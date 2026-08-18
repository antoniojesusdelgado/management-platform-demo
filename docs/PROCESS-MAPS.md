# Mapas de procesos

## Exportación conectada

```mermaid
flowchart LR
  user["Persona autorizada"] --> request["Solicita una exportación"]
  request --> validate["Servidor reconstruye permisos y filtros"]
  validate --> local["CSV o XLSX local"]
  validate --> pending["Trabajo externo pendiente"]
  pending --> confirm["Confirmación explícita"]
  confirm --> provider["Google Sheets o Microsoft Excel"]
  provider --> notify["Resultado en Operaciones"]
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

Todos los diagramas describen el entorno público con datos ficticios, no
procesos internos de una organización real.

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
  Borrador["Solicitud en borrador"] --> Enviar["Enviar"]
  Enviar --> Revisar["Revisar permiso y cobertura"]
  Revisar -->|Aprobar| Aprobada["Aprobada"]
  Revisar -->|Rechazar| Rechazada["Rechazada"]
  Enviar -->|Cancelar| Cancelada["Cancelada"]
  Aprobada -->|Cancelación excepcional| Cancelada
  Revisar --> Historial["Historial de cambios"]
```

## Tareas

```mermaid
flowchart LR
  Pendiente --> EnCurso["En curso"] --> EnRevision["En revisión"] --> Completada
  Pendiente --> Bloqueada --> EnCurso
  EnCurso --> Bloqueada
```

## Incidencias

```mermaid
flowchart LR
  Registrada --> Clasificada --> Asignada --> EnInvestigacion["En investigación"] --> Resuelta --> Cerrada
  Resuelta -->|Reabrir| EnInvestigacion
```

## Tesorería

```mermaid
flowchart LR
  Borrador --> Registrado --> Conciliado --> Validado --> Cerrado
  Borrador --> Historial["Historial de cambios"]
  Registrado --> Historial
  Conciliado --> Historial
  Validado --> Historial
  Cerrado --> Historial
```

## Nóminas

```mermaid
flowchart LR
  Recopilar["Recopilar cambios"] --> Validar --> Calcular --> Revisar --> Cerrar
```

Solo pueden editarse los ciclos que están en fase de recopilación. Cada
transición exige una nota de decisión y añade un evento inmutable. Los valores
son agregados ficticios; los registros individuales de nómina quedan fuera de
los límites del entorno público.

## Personal

```mermaid
flowchart LR
  Invitada --> Activa --> AsignarRol["Asignar función"] --> Mantener
  Activa --> Suspendida --> Activa
  Activa --> Inactiva
```

## Novedades

```mermaid
flowchart LR
  Borrador --> Revisar --> Publicar --> Notificar
```

## Configuración

```mermaid
flowchart LR
  Definir --> ValidarPermisos["Validar permisos"] --> Aplicar --> Auditar
```

## Actualización incremental de datos ficticios

```mermaid
flowchart LR
  Entrar["Entrar en la empresa"] --> Autenticar
  Autenticar --> Autorizar["Comprobar pertenencia activa"]
  Autorizar --> Bloquear["Bloquear la actualización de la empresa"]
  Bloquear --> Pendiente{"¿Faltan fechas hasta ayer?"}
  Pendiente -->|No| Cargar["Cargar el módulo"]
  Pendiente -->|Sí| Generar["Añadir el intervalo pendiente"]
  Generar --> Auditar["Registrar recuentos y cambios"]
  Auditar --> Avanzar["Actualizar la fecha de forma atómica"]
  Avanzar --> Cargar
```
