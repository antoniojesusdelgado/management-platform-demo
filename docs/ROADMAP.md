# Hoja de ruta

## Base

- [x] Repositorio independiente y rama de desarrollo protegida
- [x] Sistema visual claro y estructura adaptable
- [x] Nueve módulos navegables
- [x] Repositorio invitado con persistencia limitada a la sesión
- [x] Google OAuth público con espacios ficticios aislados
- [x] Esquema multiorganización y base de RLS

## Primer recorrido completo: Vacaciones

- [x] Creación y validación de solicitudes
- [x] Estados pendiente, aprobada, rechazada y cancelada
- [x] Acciones de aprobación y rechazo
- [x] Histórico y resumen de calendario
- [x] Server Actions y función de transición en base de datos
- [x] Confirmaciones con notas obligatorias
- [x] Calendario mensual de cobertura y solapamientos
- [x] Persistencia validada en sesión con alternativa en memoria
- [x] Validación pgTAP contra Supabase local
- [ ] Completar la aceptación manual de Google OAuth con dos cuentas de prueba

## Validación local de seguridad

- [x] Casos pgTAP multiorganización
- [x] Envío de borradores alineado entre dominio, Server Actions y SQL
- [x] Entorno compatible con Docker
- [x] Restauración local y ejecución de pgTAP
- [x] Tipos TypeScript generados desde el esquema local validado
- [x] Trabajo de validación de base de datos incorporado a CI

## Profundidad de módulos

1. [x] Tareas: responsables, fechas, dependencias e historial.
2. [x] Incidencias: prioridad, asignación, SLA ficticio y resolución.
3. [x] Personal: directorio seguro y ciclo de vida en la organización.
4. [x] Novedades y Configuración: borrador, revisión, publicación y auditoría.
5. [x] Tesorería: movimientos agregados ficticios, permisos y trazabilidad.
6. [x] Nóminas: ciclos agregados ficticios con permisos más restrictivos.

## Recorrido de Tareas

- [x] Dominios independientes de estado y prioridad
- [x] Bandeja personal, filtros, creación, asignación y edición
- [x] Flujo de bloqueo, revisión y finalización
- [x] Dependencias dirigidas sin ciclos
- [x] Comentarios y eventos de actividad inmutables
- [x] Migración del estado invitado V1 a V2
- [x] Lecturas autenticadas, Server Actions y clientes Supabase tipados
- [x] RLS multiorganización y cobertura pgTAP

## Recorrido de Incidencias y Personal

- [x] Ciclo de incidencias, prioridades, categorías y SLA ficticio
- [x] Bandeja filtrable, creación, asignación e historial de transiciones
- [x] Directorio sin contacto, identidad ni retribución
- [x] Estados de pertenencia y códigos estables de rol
- [x] Disponibilidad derivada de vacaciones aprobadas
- [x] Migración del estado invitado V2 a V3
- [x] Lecturas autenticadas y Server Actions normalizadas
- [x] Eventos inmutables de incidencias y personal
- [x] RLS, transición con privilegios y cobertura pgTAP

## Recorrido de Novedades y Configuración

- [x] Flujo de borrador, revisión y publicación con historial inmutable
- [x] Vista pública interna limitada a entradas publicadas
- [x] Identidad de organización y activación u orden de módulos
- [x] Metadatos editables de rol separados de los permisos estables
- [x] Ciclo de pertenencias e invitaciones sin envío externo
- [x] Auditoría administrativa de roles, permisos, módulos y accesos
- [x] Migración del estado invitado V3 a V4
- [x] Lecturas autenticadas, Server Actions y funciones con privilegios
- [x] RLS multiorganización y cobertura pgTAP

## Recorrido de Tesorería

- [x] Conceptos, fechas, importes y monedas agregados y ficticios
- [x] Flujo monótono de borrador, registro, conciliación, validación y cierre
- [x] Eventos inmutables de creación, edición y transición
- [x] Permisos separados de lectura y gestión sin escritura directa
- [x] Migración del estado invitado V4 a V5
- [x] Lecturas autenticadas y Server Actions mediante RPC con privilegios
- [x] RLS multiorganización y cobertura pgTAP
- [x] Filtros adaptables, aviso de datos ficticios y diálogos accesibles

## Recorrido de Nóminas

- [x] Periodos agregados, recuentos y totales de bruto, deducciones y neto
- [x] Flujo monótono de recopilación, validación, cálculo, revisión y cierre
- [x] Eventos inmutables de creación, edición y transición
- [x] Permisos separados de lectura y gestión sin escritura directa
- [x] Migración del estado invitado V5 a V6
- [x] Lecturas autenticadas y Server Actions mediante RPC con privilegios
- [x] Casos RLS multiorganización y pgTAP
- [x] Restauración, lint y pgTAP en CI y regeneración de tipos
- [x] Filtros adaptables, aviso de datos agregados y diálogos accesibles

## Dependencias externas

- [x] Aprovisionamiento, Preview y producción autorizados
- [x] Organización de Supabase y coste confirmados (plan Free, 0 USD)
- [x] Proyecto independiente de Supabase en `eu-central-1`
- [x] Google OAuth y redirecciones configurados
- [x] Primera Vercel Preview creada y validada
- [x] `PORTFOLIO_ORIGIN` y `NEXT_PUBLIC_APP_URL` exactos
- [x] CSP, RLS, accesibilidad y QA visual repetidos en la Preview final
- [x] Artefacto validado promovido a producción

## Estado de publicación

- Origen canónico: <https://plataformagestion.app>
- Alternativa de Vercel: <https://management-platform-demo.vercel.app>
- Preview estable:
  <https://management-platform-de-git-acc0ac-antonio-jesus-delgado-briones.vercel.app>
- Versión actual: `v1.3.2`
- Historial de base de datos: 32 migraciones ordenadas, hasta
  `20260730083225_release_v1_3_2_directory_editorial.sql`.
- Acceso, cierre de sesión y redirecciones protegidas de Google OAuth validados
  en Preview y producción.
- Flujos públicos validados en escritorio y móvil con Playwright y Axe.
- Aprovisionamiento real validado con una identidad de Google. La prueba con dos
  identidades sigue siendo manual; pgTAP cubre el aislamiento en base de datos.

## Evolución avanzada

- [x] Separación de `profiles`, `people`, `memberships` y `auth.users`
- [x] Simulación de roles sin posibilidad de elevar permisos reales
- [x] Cartera de proyectos con salud, responsables, participantes y actividad
- [x] Referencias de proyecto en Tareas e Incidencias
- [x] Scenario V5 determinista con 32 personas, 10 proyectos, 120 tareas,
  104 solicitudes, 60 incidencias y 360 movimientos de Tesorería
- [x] Adaptadores agregados sin conexión y procedencia documentada
- [x] Pantalla OAuth SaaS, recursos originales y perfil autogestionado
- [x] Kanban accesible, alternativa de lista, carriles, WIP y paginación
- [x] Simulaciones neutrales de integraciones financieras, nómina y personal
- [x] Ejecución nocturna idempotente de integraciones
- [x] Analítica centralizada con cinco perspectivas y vistas guardadas
- [x] Novedades editoriales y políticas configurables
- [x] Migraciones del estado invitado hasta V15
- [x] Crecimiento proporcional Scenario V7 y RPC incremental autenticada
- [x] Códigos estables de servicio y migración de filtros guardados
- [x] Tema claro predeterminado y oscuro manual con preferencias de experiencia
- [x] CodeQL, revisión de dependencias, auditoría y ZAP Baseline controlado
- [x] Migraciones remotas de Supabase y Vercel Preview validada
- [x] Promoción a producción del artefacto validado
- [x] Optimización de RLS y políticas explícitas de mutación
- [x] Índices para todas las claves foráneas públicas
- [x] Lista autorizada de RPC y cobertura pgTAP estructural
- [x] Detector CI de identificadores, contactos, proveedores y secretos reales

## Historial

`v1.2.0` añadió el área estable de aplicación, comparaciones analíticas
dinámicas, formatos españoles compartidos y Scenario V3 equilibrado. Su
publicación siguió el flujo de Preview validada de `docs/DEPLOYMENT.md`.

`v1.2.1` alineó el acceso con la composición aprobada, eligió gráficos de línea
o barras horizontales según los datos, normalizó los diálogos e introdujo
Scenario V4 con una cronología pública fija entre enero y el 23 de junio de
2026.

`v1.2.2` amplió el histórico desde enero de 2025 hasta el 17 de junio de 2026,
añadió participantes de nómina sin importes individuales y el organigrama, y
mejoró Analítica, Tareas e Incidencias en móvil.

El mantenimiento posterior de `v1.2.2` introdujo Scenario V6 sin mover la
etiqueta publicada. Añadió modalidades contractuales, aumentó las tareas
completadas, aseguró la coherencia entre progreso y estado de proyecto y
sustituyó definiciones técnicas por explicaciones orientadas a usuario.

`v1.3.0` incorporó el sistema completo de temas, el crecimiento de Scenario V7
hasta el día anterior en Madrid, contratos estables para servicios analíticos,
consultas acotadas y flujos de seguridad independientes.

`v1.3.1` mantuvo inmutable v1.3.0 y corrigió Tareas en móvil, completó de forma
aditiva organizaciones autenticadas antiguas, añadió límites de peticiones y
escaneo de secretos, centralizó la validación de texto en servidor y aplicó CSP
con nonce en superficies dinámicas.

`v1.3.2` alineó los nombres del directorio autenticado y la demo sin registro
sin añadir ni eliminar personas, mejoró la redacción de Novedades y publicó la
corrección el 30 de julio de 2026. La migración es idempotente y solo modifica
marcadores V7 deterministas.
