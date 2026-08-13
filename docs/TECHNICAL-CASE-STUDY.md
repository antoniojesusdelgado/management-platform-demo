# Caso de estudio técnico

## Resumen

El proyecto original respondió a una necesidad operativa de Fundación
Cibervoluntarios: centralizar procesos, seguimiento y datos que estaban
repartidos entre hojas de cálculo y herramientas externas. Antonio Delgado
realizó el análisis de procesos, la toma de requisitos, la definición
funcional, el desarrollo, las pruebas, la implantación y el despliegue de la
solución utilizada por la organización.

Este repositorio es una implementación full-stack posterior y técnicamente aislada.
Combina una experiencia sin registro, limitada a la sesión, con un espacio
OAuth aislado respaldado por PostgreSQL y Row Level Security. Todos los
registros operativos son deterministas y ficticios; no contiene código, datos,
documentos, credenciales, reglas internas, pantallas ni conexiones del sistema
de Fundación Cibervoluntarios.

## 1. Objetivo, alcance y restricciones

La plataforma permite organizar proyectos, tareas, vacaciones,
incidencias, tesorería, nóminas agregadas, personas, novedades, configuración
y analítica en una única interfaz. Su independencia se refiere al aislamiento
de infraestructura, identidad y datos de la implementación pública, no al origen
funcional del proyecto.

Requisitos funcionales:

- acceso público mediante Google OAuth y modo invitado sin cuenta;
- espacio aislado por identidad, autorización por roles y RLS;
- trazabilidad inmutable de las transiciones operativas;
- simulación de integraciones neutrales e idempotentes;
- analítica filtrable con comparación entre periodos;
- restauración reproducible del escenario de demostración;
- interfaz responsive, accesible por teclado y compatible con movimiento
  reducido.

Requisitos no funcionales:

- contratos TypeScript validados con Zod;
- ausencia de identidades, cuentas bancarias, salarios individuales y
  documentos reales;
- base de datos reproducible mediante migraciones y pruebas pgTAP;
- validación continua de contenido, privacidad, accesibilidad y build;
- despliegues trazables mediante GitHub Actions y Vercel;
- uso exclusivo de servicios gratuitos previamente autorizados.

## 2. Stack y responsabilidades

| Capa | Tecnología | Responsabilidad |
| --- | --- | --- |
| Aplicación web | Next.js 16, React 19, TypeScript | Rutas, Server Components, Server Actions e interfaz |
| Presentación | Tailwind CSS, CSS, Radix UI, Tabler Icons | Diseño, accesibilidad, foco y componentes |
| Interacción | dnd-kit, Recharts | Kanban accesible y gráficos |
| Validación | Zod, Bun test | Contratos, dominio y pruebas unitarias |
| Datos | PostgreSQL, SQL, Supabase | Persistencia, Auth, Storage, RPC y RLS |
| Navegador | Playwright, Axe | Recorridos E2E, responsive y accesibilidad |
| Entrega | Bun, GitHub Actions, Vercel | Dependencias, CI, Preview y producción |

El desarrollo de esta plataforma se ha realizado mediante programación asistida
con ChatGPT Codex, bajo dirección y revisión humana. Esta herramienta forma
parte del proceso de ingeniería, no del producto en ejecución: no recibe datos
del sistema, no interviene en las decisiones visibles y no requiere claves de
OpenAI en producción.

## 3. Contexto del sistema

```mermaid
flowchart LR
  visitor["Persona visitante"] --> web["Aplicación Next.js"]
  google["Google OAuth"] --> auth["Supabase Auth"]
  web --> auth
  web --> db["PostgreSQL con RLS"]
  web --> storage["Storage privado de avatar"]
  web --> session["sessionStorage invitado"]
  github["GitHub"] --> ci["GitHub Actions"]
  ci --> vercel["Vercel"]
  vercel --> web
```

## 4. Contenedores y componentes

```mermaid
flowchart TB
  browser["Navegador"]
  subgraph next["Aplicación Next.js"]
    routes["App Router y Server Components"]
    actions["Server Actions"]
    guest["Reducer invitado y GuestWorkspaceState V21"]
    analytics["Motor analítico puro"]
    ui["Módulos React responsive"]
  end
  subgraph supabase["Supabase"]
    auth["OAuth PKCE"]
    postgres["PostgreSQL y RLS"]
    rpc["Funciones privadas y RPC"]
    storage["Bucket profile-avatars"]
  end
  browser --> routes
  browser --> guest
  routes --> ui
  ui --> analytics
  routes --> postgres
  actions --> rpc
  rpc --> postgres
  routes --> auth
  routes --> storage
```

## 5. Flujos invitado y OAuth

```mermaid
flowchart LR
  start["Acceso"] --> choice{"Modalidad"}
  choice -->|Invitado| generate["Generar escenario V7"]
  generate --> validate["Validar V16 con Zod"]
  validate --> session["Persistir solo en sessionStorage"]
  choice -->|Google| pkce["OAuth PKCE"]
  pkce --> provision["Crear o cargar organización aislada"]
  provision --> anchor["Persistir fecha de anclaje"]
  anchor --> rls["Leer y mutar con RLS"]
```

```mermaid
sequenceDiagram
  participant B as Navegador
  participant N as Next.js
  participant S as Supabase Auth
  participant G as Google
  B->>N: Continuar con Google
  N->>S: signInWithOAuth y verificador PKCE
  S->>G: Solicitud de autorización
  G-->>B: Consentimiento
  B->>N: Callback con código
  N->>S: Intercambio por sesión
  S-->>N: Cookies seguras
  N->>S: Aprovisionar o cargar organización
  N-->>B: /app/inicio
```

La modalidad invitada nunca consulta Supabase. Su estado se valida al
hidratarse y se conserva únicamente durante la sesión de la pestaña. La
modalidad OAuth mantiene una organización persistente por identidad.

## 6. Lecturas y mutaciones autenticadas

```mermaid
sequenceDiagram
  participant U as Usuario
  participant SC as Server Component
  participant SA as Server Action
  participant DB as PostgreSQL
  U->>SC: Abrir módulo
  SC->>DB: Lectura con JWT autenticado
  DB-->>SC: Filas de la organización mediante RLS
  SC-->>U: Renderizado
  U->>SA: Enviar mutación
  SA->>SA: Zod y comprobación de permiso
  SA->>DB: RPC o escritura acotada
  DB->>DB: Constraint, RLS y auditoría
  DB-->>SA: Resultado tipado
  SA-->>U: ActionResult
```

`ActionResult` es una unión discriminada: éxito tipado o error controlado con
código seguro y mensaje público. Las Server Actions no devuelven detalles de
base de datos, secretos ni trazas internas.

## 7. Autorización y RLS

```mermaid
flowchart LR
  identity["auth.uid"] --> membership["Membresía activa"]
  membership --> real["Permisos del rol real"]
  simulator["Rol simulado opcional"] --> effective["Permiso efectivo"]
  real --> effective
  effective --> intersection["Intersección: nunca eleva privilegios"]
  intersection --> action["Comprobación en Server Action"]
  intersection --> rls["RLS o RPC privada"]
```

Todas las tablas expuestas aplican RLS. Las funciones `SECURITY DEFINER`
revocan permisos por defecto, fijan un `search_path` seguro y verifican
explícitamente identidad, organización y permiso. La simulación de rol solo
puede reducir el acceso real.

## 8. Modelo de datos

```mermaid
erDiagram
  ORGANIZATIONS ||--o{ MEMBERSHIPS : contiene
  PROFILES ||--o{ MEMBERSHIPS : autentica
  ORGANIZATIONS ||--o{ PEOPLE : agrupa
  PEOPLE ||--o{ PEOPLE : coordina
  ORGANIZATIONS ||--o{ PROJECTS : posee
  PROJECTS ||--o{ PROJECT_MEMBERS : incluye
  PEOPLE ||--o{ PROJECT_MEMBERS : participa
  PROJECTS ||--o{ TASKS : agrupa
  PEOPLE ||--o{ TASKS : recibe
  TASKS ||--o{ TASK_DEPENDENCIES : depende
  TASKS ||--o{ TASK_COMMENTS : comenta
  TASKS ||--o{ TASK_EVENTS : audita
  PROJECTS ||--o{ INCIDENTS : relaciona
  PEOPLE ||--o{ INCIDENTS : solicita
  PEOPLE ||--o{ LEAVE_REQUESTS : solicita
  ORGANIZATIONS ||--o{ TREASURY_ENTRIES : registra
  ORGANIZATIONS ||--o{ PAYROLL_RUNS : agrega
  PAYROLL_RUNS ||--o{ PAYROLL_PARTICIPANTS : incluye
  PEOPLE ||--o{ PAYROLL_PARTICIPANTS : participa
  ORGANIZATIONS ||--o{ INTEGRATION_CONNECTORS : configura
  ORGANIZATIONS ||--o{ ANALYTICS_SERVICE_DIMENSIONS : define
  ANALYTICS_SERVICE_DIMENSIONS ||--o{ INCIDENTS : clasifica
  INTEGRATION_CONNECTORS ||--o{ INTEGRATION_RUNS : ejecuta
  INTEGRATION_RUNS ||--o{ DATA_QUALITY_ISSUES : detecta
  ORGANIZATIONS ||--|| WORKSPACE_CONFIGURATION : configura
  ORGANIZATIONS ||--o{ AUDIT_EVENTS : registra
  ORGANIZATIONS ||--o{ SCENARIO_EVOLUTION_EVENTS : evoluciona
```

`profiles` contiene preferencias de la identidad autenticada; `people`
contiene fichas profesionales ficticias; `memberships` une identidad,
organización y rol. `people.employment_contract_type` usa códigos estables y
denominaciones laborales públicas. Los participantes de nómina solo indican
inclusión y validación: nunca almacenan importes individuales.

## 9. Integraciones, idempotencia y recuperación

```mermaid
sequenceDiagram
  participant C as Programador o usuario
  participant R as Ejecutor
  participant DB as PostgreSQL
  C->>R: Ejecutar conector
  R->>DB: Crear ejecución con fecha y secuencia
  DB-->>R: Clave idempotente existente o nueva
  R->>DB: Importar elementos agregados ficticios
  R->>DB: Registrar duplicados y controles
  R->>DB: Finalizar con éxito, parcial o error
```

La clave formada por conector, fecha efectiva y secuencia de origen evita
duplicados. Los conectores son neutrales y no contactan bancos, asesorías ni
sistemas de personal reales. Los reintentos y errores se registran sin
credenciales ni payloads sensibles.

## 10. Escenario V7 y contratos

El escenario V7 comienza el `2025-01-01` y crece hasta ayer en
`Europe/Madrid`. La misma semilla y ancla producen el mismo checksum.
`GuestWorkspaceState V21` conserva las entidades y preferencias de versiones
anteriores y añade únicamente las novedades ausentes hasta v1.7.0, sin
regenerar el escenario ni sobrescribir cambios operativos. La migración V14 a
V15 continúa anexando únicamente IDs deterministas ausentes.

La corrección operativa final eleva de forma aditiva `scenario_version` a 7
cuando una organización ya estaba generada hasta ayer. Así se evita que la RPC
salga sin trabajo pendiente y conserve por error la marca histórica V6.

Distribución:

- 266 entidades de persona, 6 equipos y cuatro modalidades contractuales;
- 10 proyectos y 1.057 tareas con 85–90 % de histórico completado;
- 156 solicitudes de vacaciones y 70 incidencias;
- 421 movimientos de tesorería y 20 ciclos de nómina agregada;
- 80 ejecuciones de integraciones y 20 novedades publicadas.

Reglas de dominio:

- un proyecto con todas sus tareas completadas pasa a `Completado`;
- un proyecto no completado mantiene trabajo abierto y un progreso máximo del
  99 %;
- las transiciones de tareas recalculan estado y progreso;
- dependencias de tareas sin autorreferencias ni ciclos;
- transiciones inválidas rechazadas en dominio, Server Action y SQL.

## 11. Analítica

`AnalyticsFilter` modela periodo, proyecto, equipo, responsable, estado y
servicio. `AnalyticsWindow` genera ventanas actual y anterior de igual
duración. `AnalyticsSnapshot` contiene KPIs, series, alertas estructuradas,
filtros y fecha de actualización.

El invitado calcula en memoria. OAuth usa consultas agregadas acotadas por
organización con el mismo contrato. Las definiciones públicas explican qué
representa cada métrica, cómo interpretarla, su fuente funcional y su
frecuencia, sin exponer tablas ni códigos internos. Los formatos compartidos
distinguen recuentos, porcentajes, duraciones y moneda.

La interfaz añade lecturas guiadas deterministas, indicadores accionables y
selecciones sobre series que reutilizan los filtros públicos. Cada selección
abre un detalle contextual con la vista y el periodo activos; no ejecuta SQL
generado, no descarga tablas completas y no presenta conclusiones que no
puedan reconstruirse desde el mismo `AnalyticsSnapshot`.

## 12. Migraciones, índices y constraints

Las migraciones exclusivamente aditivas cubren:

1. organizaciones, roles, membresías, auditoría y vacaciones;
2. tareas, incidencias, personas, novedades, configuración, tesorería y
   nóminas;
3. aprovisionamiento y ciclo de vida del escenario público;
4. proyectos, perfil, integraciones y analítica;
5. endurecimiento de RLS, consultas y Storage privado;
6. compatibilidad de escenarios V2 a V7 y GuestDemoState hasta V16;
7. dimensiones estables de servicio y auditoría de evolución incremental.

Los índices priorizan `organization_id` en lecturas acotadas y añaden índices
parciales para registros activos. Los constraints verifican estados,
relaciones organizativas, participantes únicos, claves idempotentes, modalidad
contractual y coherencia proyecto–tareas. pgTAP cubre esquema, privilegios,
RLS, aislamiento y funciones de restauración.

## 13. Seguridad, privacidad y propiedad

- OAuth authorization code con PKCE y cookies SSR.
- RLS como barrera final de datos.
- Bucket privado de avatar con rutas por propietario y URLs firmadas.
- Ninguna service-role key llega al navegador.
- Invitado sin llamadas a Supabase.
- Detector CI de correos, identificadores financieros, documentos, teléfonos
  y términos de proveedores reales.
- CSP, framing, referrer policy y cabeceras de seguridad.
- Licencia propietaria del repositorio e inventario separado de dependencias.

Las páginas de Privacidad, Procedencia y Aviso legal describen el tratamiento
técnico, el origen ficticio de los datos y la titularidad del software.

## 14. Accesibilidad, responsive y rendimiento

Radix aporta gestión de foco y semántica de teclado. Los diálogos mantienen
cabecera y acciones fijas, cuerpo desplazable y límites basados en `100dvh`.
Cada gráfico tiene tabla equivalente. El movimiento respeta
`prefers-reduced-motion`.

La validación cubre 320, 360, 390, 768, 1024 y 1440 px. Las listas usan
paginación, el Kanban limita su desplazamiento a su propio panel y las
consultas autenticadas de Analítica evitan descargar conjuntos completos.

## 15. Estrategia de pruebas

- dominio: schemas, transiciones, determinismo, fechas, proyectos y métricas;
- navegador: acceso, invitado, persistencia, diálogos, filtros y CSV;
- accesibilidad: Axe, teclado, foco, contraste y movimiento reducido;
- base de datos: RLS, roles, funciones, idempotencia y aislamiento;
- entrega: lint, typecheck, tests, validadores, build, E2E, reset, pgTAP,
  linter, advisors y `git diff --check`.

## 16. CI/CD

```mermaid
flowchart LR
  branch["Rama de mantenimiento"] --> checks["Lint, tipos, tests y build"]
  checks --> pr["Pull request"]
  pr --> preview["Vercel Preview"]
  preview --> qa["QA OAuth, RLS, responsive y accesibilidad"]
  qa --> merge["Merge del commit revisado"]
  merge --> production["Promoción del artefacto validado"]
  production --> smoke["Smoke test de producción"]
```

Las migraciones remotas se revisan y validan localmente antes de aplicarse. El
repositorio no contiene credenciales.

## 17. Instalación y operación local

```powershell
bun install --frozen-lockfile
Copy-Item .env.example .env.local
bunx supabase start
bunx supabase db reset
bun run dev
```

Las variables públicas se documentan en `.env.example`. Las credenciales del
proveedor Google se configuran en Supabase Auth. Restaurar datos desde
Configuración actualiza de forma explícita el ancla y registra la operación.

## 18. Trazabilidad por hitos

| Hito | Resultado |
| --- | --- |
| Necesidad y requisitos | Análisis de procesos, definición funcional y límites de datos |
| Vacaciones | Cálculo, revisión, calendario y auditoría |
| Tareas | Kanban, dependencias, comentarios y WIP |
| Incidencias y Personal | SLA, directorio, disponibilidad, equipos cerrados y organigrama |
| Tesorería y Nóminas | Flujos agregados, conciliación y controles |
| Proyectos e integraciones | Planificación transversal y automatización neutral |
| v1.0.0 | Primera demostración estable con OAuth y RLS |
| v1.1.0 | Perfil, sistema visual y Analítica |
| v1.2.0 | Escenario equilibrado y ventanas dinámicas |
| v1.2.1 | Gráficos, diálogos y consistencia temporal |
| v1.2.2 | OAuth final, V5, participantes y organigrama |
| Mantenimiento v1.2.2 | V6, contratos, tareas, proyectos y documentación |
| v1.3.0 | Tema completo, V7 incremental, contratos analíticos, equipos cerrados y seguridad |
| v1.3.1 | Tareas móviles, backfill V7 aditivo, rate limiting, CSP y escaneo de secretos |
| v1.3.2 | Nombres naturales compartidos, Novedades orientadas a usuarios y migración idempotente |
| v1.4.0 | Acceso inicial seguro para la demo y procedencia profesional documentada |
| v1.4.1 | Recuperación del acceso OAuth, móvil e iframe autorizado |
| v1.5.0 | Privilegios de base de datos y cadena de entrega reforzados |
| v1.5.1 | Catálogo de versiones alineado y desarrollo asistido documentado |
| v1.6.0 | Búsqueda global, bandeja unificada y enlaces directos a entidades |
| v1.7.0 | Automatizaciones, capacidad, notificaciones e integraciones de productividad |
| v1.8.0 | Onboarding, multiempresa, directorio corporativo y nuevo sistema visual |
| v1.8.1 | Acceso compacto, Personal y organigrama renovados, Novedades naturales y Analítica interactiva |

### Operaciones e integraciones

El diseño de v1.7.0 separa la identidad de la plataforma de la autorización de
Google Workspace o Microsoft 365. Los contratos de proveedor comparten las
capacidades de archivos, hojas de cálculo, correo y calendario, pero cada token
pertenece a una persona y una organización. PKCE y el estado firmado protegen el
retorno OAuth; Vault mantiene los tokens fuera de los esquemas expuestos.

Operaciones conecta reglas cerradas, plantillas, recurrencias,
asignaciones semanales y notificaciones. Las advertencias de capacidad orientan
la planificación sin bloquearla. Las exportaciones reconstruyen en servidor la
vista autorizada, imponen un límite de filas y requieren confirmación antes de
crear un archivo o evento externo.

Las fechas editoriales se muestran en Novedades; v1.3.0 utiliza el 23 de junio
de 2026, v1.3.1 el 29 de julio, v1.3.2 el 30 de julio, v1.4.0 y v1.4.1 el 3 de
agosto, v1.5.0 el 5 de agosto, v1.5.1 el 7 de agosto y v1.6.0 el 10 de agosto de 2026. Git, PostgreSQL
y Vercel conservan sus timestamps técnicos reales.

El tema claro es el valor inicial y el modo oscuro se activa manualmente desde
Perfil. La compatibilidad migra cualquier preferencia histórica `system` a
`light`, sin depender de cambios del sistema operativo.

## 19. Decisiones arquitectónicas

- Dos repositorios de datos explícitos evitan que el invitado contacte
  accidentalmente Supabase.
- La generación determinista sustituye SQL público en vivo para proteger
  privacidad, disponibilidad, licencias y reproducibilidad.
- La nómina agregada evita modelar compensaciones individuales innecesarias.
- Server Actions más RLS centralizan validación, autorización y auditoría.
- Las subidas privadas se procesan en WebP en cliente sin transformaciones de
  pago.

Documentos relacionados: [Arquitectura](./ARCHITECTURE.md),
[Permisos](./PERMISSIONS.md), [Procedencia](./DATA-PROVENANCE.md),
[Procesos](./PROCESS-MAPS.md), [Despliegue](./DEPLOYMENT.md),
[Seguridad](../SECURITY.md) y [decisiones ADR](./adr/).
