# Guía de contenidos

La interfaz utiliza un español directo y natural. Los textos deben explicar qué
puede ver o hacer una persona sin recurrir a mensajes promocionales,
indicaciones internas de diseño ni terminología técnica innecesaria.

## Voz

- Utilizar encabezados breves: `Resumen`, `Asuntos pendientes`,
  `Personas activas`.
- Preferir acciones en infinitivo o imperativo: `Guardar cambios`,
  `Revisar solicitudes`, `Entrar sin cuenta`.
- Explicar los errores con su causa, cuando se conozca, y un siguiente paso
  concreto.
- Mantener `OAuth`, `CSV` y `Kanban` solo cuando ayuden a identificar una
  función conocida. Explicar `OAuth` como acceso con Google o Microsoft en las
  superficies destinadas al público general.
- Hablar de `organización`, `aplicación` o `espacio personal` según el alcance
  real.

## Términos que deben evitarse

- Etiquetas promocionales o internas como `Operaciones premium`.
- `Business Intelligence`, `Reporting ejecutivo` y `Resumen ejecutivo`.
- `portfolio`, `workspace`, `throughput`, `headcount` y `backlog` en textos
  visibles en español.
- Recordatorios repetidos de que los registros son ficticios. La pantalla de
  acceso y el indicador global `Datos ficticios` ya ofrecen ese contexto.
- Términos internos de una versión, como `Scenario`, `backfill` o `responsive`,
  dentro de Novedades. Debe explicarse el beneficio visible.

## Alternativas recomendadas

| Evitar | Utilizar |
| --- | --- |
| Resumen ejecutivo | Resumen |
| Proyectos y trabajo | Proyectos y tareas |
| Personas y capacidad | Equipo y disponibilidad |
| Servicio y SLA | Incidencias y tiempos |
| SLA | Compromiso de atención |
| Finanzas y automatizaciones | Finanzas e integraciones |
| Throughput | Tareas completadas |
| Headcount | Personas activas |
| Backlog | Incidencias pendientes |
| vs. anterior | respecto al periodo anterior |
| Responsive | Cómoda desde distintos dispositivos |
| Backfill | Información histórica disponible |
| Scenario | Datos de exploración actualizados |

Las entradas canónicas de Novedades utilizan un título breve centrado en el
beneficio y una sola frase que explica qué cambia para quien usa la plataforma.
El detalle técnico pertenece a la documentación de la versión, no a la tarjeta
publicada.

Ejecutar `bun run content:validate` antes de revisar una versión.
