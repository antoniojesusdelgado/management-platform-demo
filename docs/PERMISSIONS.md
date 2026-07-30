# Modelo de permisos

Los códigos de permiso siguen el contrato `module.resource.action`.

| Código | Finalidad |
| --- | --- |
| `vacations.requests.view` | Consultar solicitudes de vacaciones de la organización |
| `vacations.requests.create` | Crear solicitudes de vacaciones propias |
| `vacations.requests.approve` | Aprobar, rechazar o cancelar solicitudes |
| `tasks.items.view` | Consultar tareas |
| `tasks.items.manage` | Crear y actualizar tareas |
| `projects.items.view` | Consultar proyectos, participantes y actividad |
| `projects.items.manage` | Gestionar proyectos y participantes |
| `incidents.tickets.view` | Consultar incidencias |
| `incidents.tickets.manage` | Gestionar incidencias |
| `treasury.entries.view` | Consultar movimientos de tesorería |
| `treasury.entries.manage` | Crear y tramitar movimientos agregados ficticios |
| `payroll.runs.view` | Consultar ciclos de nómina |
| `payroll.runs.manage` | Crear, editar y tramitar ciclos agregados ficticios |
| `people.profiles.view` | Consultar el directorio de personal |
| `people.profiles.manage` | Gestionar perfiles ficticios y su ciclo de vida |
| `changelog.entries.view` | Consultar entradas de Novedades |
| `changelog.entries.manage` | Crear, revisar y publicar entradas de Novedades |
| `profile.self.update` | Actualizar las preferencias del perfil autenticado |
| `analytics.dashboards.view` | Consultar paneles y guardar vistas analíticas |
| `analytics.dashboards.export` | Exportar analítica agregada permitida |
| `integrations.runs.view` | Consultar el estado de conectores y su historial ficticio |
| `integrations.runs.manage` | Simular y configurar integraciones neutrales |
| `settings.workspace.manage` | Gestionar ajustes, roles e invitaciones |

Las etiquetas, los colores y las descripciones de los roles pueden cambiar. Los
códigos de permiso no pueden reutilizarse con otra finalidad; cualquier cambio
requiere una migración y una revisión de la aplicación.
