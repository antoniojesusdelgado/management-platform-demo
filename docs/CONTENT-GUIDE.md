# Content guide

The interface uses direct, natural Spanish. Product copy should explain what a
person can see or do without promotional labels, internal design directions or
unnecessary technical terminology.

## Voice

- Use short headings: `Resumen`, `Asuntos pendientes`, `Personas activas`.
- Prefer actions in the infinitive or imperative: `Guardar cambios`,
  `Revisar solicitudes`, `Entrar sin cuenta`.
- Explain errors with a cause when known and a concrete next step.
- Keep `OAuth`, `SLA`, `CSV` and `Kanban` when they are the established term.
- Refer to `organización`, `aplicación` or `espacio personal` according to the
  actual scope.

## Terms to avoid

- Promotional or internal labels such as `Operaciones premium`.
- `Business Intelligence`, `Reporting ejecutivo` and `Resumen ejecutivo`.
- `portfolio`, `workspace`, `throughput`, `headcount` and `backlog` in visible
  Spanish copy.
- Repeated reminders that operational records are synthetic. The access screen
  and the global `Datos ficticios` indicator provide that context.

## Preferred alternatives

| Avoid | Use |
| --- | --- |
| Resumen ejecutivo | Resumen |
| Proyectos y trabajo | Proyectos y tareas |
| Personas y capacidad | Equipo y disponibilidad |
| Servicio y SLA | Incidencias y tiempos |
| Finanzas y automatizaciones | Finanzas e integraciones |
| Throughput | Tareas completadas |
| Headcount | Personas activas |
| Backlog | Incidencias pendientes |
| vs. anterior | respecto al periodo anterior |

Run `bun run content:validate` before reviewing a release.
