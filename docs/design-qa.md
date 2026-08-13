# Revisión visual y de producto — v1.8.2

Fecha: 13 de agosto de 2026

Estado: pendiente de capturas de la Preview final
Resultado final: **pending**

La implementación local incorpora además el aviso compacto de analítica
opcional. En móvil se presenta como una superficie inferior con acciones de
rechazo y aceptación equivalentes; no carga GA4 antes de una decisión
afirmativa. La captura definitiva se regenerará desde la Preview para no
confundir evidencia local con producción.

## Cambios que deben verificarse

- Logotipo canónico en acceso, cabecera, favicon, PWA y tarjeta social.
- Acceso sin solapamientos ni scroll ordinario a 320, 360, 390, 768, 1024 y
  1440 px, en tema claro y oscuro.
- Cierre de sesión del invitado con limpieza del estado local.
- Google y Microsoft como identidad básica; permisos adicionales únicamente
  desde Integraciones.
- Avatares válidos, corruptos, sobredimensionados y con MIME falseado.

La puntuación y el estado `passed` se actualizarán únicamente después de
comparar las capturas locales y de Preview y cerrar incidencias P0–P2.

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

### Acceso

- Móvil 320 px: `../artifacts/v1.8.1-auth-option-1-mobile.png`
- Móvil 360 px: `../artifacts/v1.8.1-auth-option-1-mobile-360.png`
- Móvil 390 px: `../artifacts/v1.8.1-auth-option-1-mobile-390.png`
- Tableta 768 px: `../artifacts/v1.8.1-auth-option-1-tablet-768.png`
- Escritorio 1024 px: `../artifacts/v1.8.1-auth-option-1-desktop-1024.png`
- Escritorio 1440 px: `../artifacts/v1.8.1-auth-option-1-desktop.png`
- Referencia 1487 px: `../artifacts/v1.8.1-auth-option-1-fidelity.png`

### Personal y organigrama

- Personal móvil: `../.artifacts/release-v1.8.1/automated/personal-light-mobile.png`
- Organigrama claro: `../.artifacts/release-v1.8.1/automated/organigrama-light-desktop.png`
- Organigrama oscuro: `../.artifacts/release-v1.8.1/automated/organigrama-dark-desktop.png`

### Novedades y Analítica

- Novedades móvil: `../.artifacts/release-v1.8.1/automated/novedades-light-mobile.png`
- Resumen analítico móvil: `../.artifacts/release-v1.8.1/automated/analitica-resumen-light-mobile.png`
- Equipo y disponibilidad: `../.artifacts/release-v1.8.1/automated/analitica-personas-dark-desktop.png`
- Finanzas e integraciones: `../.artifacts/release-v1.8.1/automated/analitica-finanzas-light-desktop.png`

El generador reproducible es `bun run visual:review` y guarda las capturas en
`.artifacts/release-v1.8.1/automated`.

## Validaciones ejecutadas

- `bun run lint`
- `bun run typecheck`
- `bun run test` — 110 pruebas superadas.
- `bun run content:validate`
- `bun run security:public-data`
- `bun run security:secrets`
- `bun audit --audit-level=high`
- `bun run build`
- `bun run e2e` — 92 superadas y 8 omisiones previstas por proyecto.
- `bun run e2e:a11y` — 20 recorridos superados sin infracciones Axe A/AA.
- `bun run scenario:data:validate`
- `bun run scenario:data:report`
- `bunx supabase db reset`
- `bunx supabase test db` — 400 pruebas pgTAP superadas.
- `bunx supabase db lint --level warning --fail-on error`
- comparación de tipos Supabase — sin diferencias.
- `git diff --check`

La aprobación del usuario recibida el 12 de agosto de 2026 autoriza commit,
Preview, migración compatible, producción y release final.
