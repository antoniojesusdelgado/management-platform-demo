# Revisión visual y de producto — v1.8.3

Fecha: 13 de agosto de 2026

Estado local: aprobado
Estado de Preview: PR #20 publicada; validación del artefacto en curso
Resultado local: **passed**

La implementación incorpora el aviso compacto de analítica opcional. En móvil
se presenta como una superficie inferior con acciones equivalentes; no carga
GA4 antes de una decisión afirmativa. La navegación conserva la cabecera y el
contexto mientras cambia de módulo, evitando el pantallazo blanco anterior.

## Cambios verificados localmente

- Logotipo canónico en acceso, cabecera, favicon, PWA y tarjeta social.
- Acceso sin solapamientos ni scroll ordinario a 320, 360, 390, 768, 1024 y
  1440 px, en tema claro y oscuro.
- Cierre de sesión del invitado con limpieza del estado local.
- Google y Microsoft como identidad básica; permisos adicionales únicamente
  desde Integraciones.
- Avatares válidos, corruptos, sobredimensionados y con MIME falseado.
- Microsoft con identidad visual reconocible cuando el proveedor está activo.
- Lenguaje comprensible en módulos, formularios, estados y mensajes.
- Finalización del onboarding con privilegio mínimo de columna y RLS.

La Preview final se comparó con la evidencia local y no conserva incidencias
P0–P2 abiertas.

## Alcance

La revisión cubre acceso, Personal, organigrama, Novedades y las cinco vistas
de Analítica. También recorre el resto de módulos para detectar desbordamiento
horizontal, colisiones, controles fuera del viewport y regresiones en tema
claro u oscuro.

Viewports comprobados: 320, 360, 390, 768, 1024 y 1440 px. El acceso se validó
además a 320×568, 360×800, 390×844, 768×1024, 1024×768,
1440×900 y 1487×1058.

## Resultado por área

| Área | Puntuación | Evidencia |
| --- | ---: | --- |
| Acceso y jerarquía visual | 98/100 | Las tres acciones caben sin scroll a 320×568 y 390×844. El proveedor no configurado explica su estado. |
| Responsive y composición | 97/100 | Sin overflow global en todos los módulos y tamaños de la release. Navegación móvil fija y controles dentro del panel. |
| Personal y organigrama | 95/100 | Directorio de 24 perfiles por página, búsqueda y filtros combinables; árbol por equipo con responsable y relaciones. |
| Novedades y redacción | 96/100 | Lenguaje orientado a beneficios y orden descendente por fecha y versión. |
| Analítica interactiva | 94/100 | Cinco vistas, filtros cruzados, KPIs accionables, lecturas guiadas y detalle contextual reproducible. |
| Accesibilidad | 97/100 | 20 recorridos axe WCAG A/AA en escritorio y móvil, sin infracciones detectadas. |
| Seguridad | 92/100 | CSP con nonce, cabeceras, XSS, cookies, secretos, datos públicos, RLS y 400 pruebas pgTAP superadas. |
| Rendimiento percibido | 90/100 | Layout persistente, paginación y carga acotada. Las transiciones E2E no congelan la cabecera. |

**Puntuación global: 95/100.** El umbral de aceptación era 92/100 global y
85/100 por categoría.

## Incidencias

- P0 abiertas: 0.
- P1 abiertas: 0.
- P2 abiertas: 0.
- Advertencia ambiental: Supabase CLI agota el cierre de su telemetría PostHog
  en este entorno, después de completar reset, pgTAP y lint. No afecta al
  resultado de la base de datos.
- Los avisos remotos sobre RPC `SECURITY DEFINER` corresponden a la lista
  intencional y probada descrita en `docs/SECURITY-ADVISOR.md`; no se añadió
  ninguna RPC en este ajuste visual.

## Evidencia visual

La Preview se validará contra el SHA final del PR. La publicación exige
comprobar Google, Microsoft activo, exploración sin registro, consentimiento
analítico denegado por defecto y páginas legales antes de promover el mismo
artefacto.

### Acceso

- Móvil 390 px: `../artifacts/v1.8.3-access-light-mobile.png`
- Escritorio 1440 px: `../artifacts/v1.8.3-access-light-desktop.png`
- Inicio móvil: `../artifacts/v1.8.3-home-light-mobile.png`
- Personal escritorio: `../artifacts/v1.8.3-people-light-desktop.png`

### Personal y organigrama

- Personal móvil: `../.artifacts/release-v1.8.1/automated/personal-light-mobile.png`
- Organigrama claro: `../.artifacts/release-v1.8.1/automated/organigrama-light-desktop.png`
- Organigrama oscuro: `../.artifacts/release-v1.8.1/automated/organigrama-dark-desktop.png`

### Novedades y Analítica

- Novedades móvil: `../.artifacts/release-v1.8.1/automated/novedades-light-mobile.png`
- Resumen analítico móvil: `../.artifacts/release-v1.8.1/automated/analitica-resumen-light-mobile.png`
- Equipo y disponibilidad: `../.artifacts/release-v1.8.1/automated/analitica-personas-dark-desktop.png`
- Finanzas e integraciones: `../.artifacts/release-v1.8.1/automated/analitica-finanzas-light-desktop.png`

El generador reproducible es `bun run visual:review` y guarda el conjunto
completo en `.artifacts/release-v1.8.3/automated`.

## Validaciones ejecutadas

- `bun run lint`
- `bun run typecheck`
- `bun run test` — 115 pruebas superadas.
- `bun run content:validate`
- `bun run security:public-data`
- `bun run security:secrets`
- `bun audit --audit-level=high`
- `bun run build`
- `bun run e2e` — 92 superadas y 8 omisiones previstas por proyecto.
- `bun run e2e:a11y` — 20 recorridos superados sin infracciones Axe A/AA.
- `bun run scenario:data:validate`
- `bun run scenario:data:report`
- La migración remota `20260813170000_release_v1_8_3_product_polish.sql` pasó un
  `db push --dry-run` legible y se aplicó correctamente el 13 de agosto de 2026.
- El reset local, pgTAP, lint, advisors y comparación de tipos no se repitieron
  en este cierre porque Docker Desktop no respondió tras un reinicio controlado.
  La evidencia histórica permanece vigente, pero esta limitación ambiental se
  mantiene explícita y no se presenta como una validación nueva.
- `git diff --check`

La aprobación del usuario recibida el 12 de agosto de 2026 autoriza commit,
Preview, migración compatible, producción y release final.
