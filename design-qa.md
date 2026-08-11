# QA de diseño v1.8.1

## Resultado y alcance

- Fuente visual: capturas de producción facilitadas el 11 de agosto de 2026, en especial `C:\Users\anton\AppData\Local\Temp\codex-clipboard-bed635ef-ae67-4d63-b18e-fc8366f6da58.png` (acceso, 1918 × 1078 px) y `C:\Users\anton\AppData\Local\Temp\codex-clipboard-d4aa3d8f-5a9b-4d7c-88e5-0d9bf00a41f8.png` (Inicio autenticado, 1918 × 1078 px).
- Evidencia móvil de origen: capturas adjuntas por el usuario y los viewports indicados en el plan.
- Evidencia de implementación automatizada: pruebas de geometría y accesibilidad sobre Chromium a 320 × 568, 360 × 800, 390 × 844, 768, 1024, 1366 × 768 y 1440 px.
- Captura de implementación comparable en Chrome: pendiente. El conector de Chrome no expone una pestaña controlable en esta sesión, por lo que no fue posible generar una comparación combinada válida.
- Estado: acceso invitado, tema claro y oscuro, navegación, menús, bandeja, módulos y diálogos. La sesión autenticada real queda pendiente de evidencia visual en Chrome.

## Superficies revisadas

- **Tipografía:** se redujo el titular del acceso, se limitaron sus líneas y se ajustaron interlineado, densidad y textos auxiliares para evitar el aspecto comprimido de la versión anterior.
- **Espaciado y retícula:** cabecera y módulos comparten ahora un máximo de 1.600 px y márgenes adaptativos de 12–32 px. Los menús utilizan una retícula `icono + etiqueta + auxiliar` y objetivos táctiles de 44 px.
- **Color y tokens:** se conservan los tokens semánticos y los temas claro predeterminado y oscuro manual. Los estados deshabilitados y los errores de proveedores se muestran con explicación contextual.
- **Imágenes e iconos:** se mantienen el logotipo y la librería de iconos existente; no se introdujeron sustitutos dibujados con CSS o texto.
- **Contenido:** “Centro operativo” se sustituyó por “Operaciones”; la campana y Bandeja comparten un único destino; Google Workspace, Microsoft 365 y el directorio corporativo presentan estados diferenciados.

## Comparación e iteraciones

1. **P0 — acceso fuera del viewport.** La captura de origen muestra un titular sobredimensionado y una tarjeta que obliga a desplazarse. Se reemplazó por una composición compacta de `100dvh`. La prueba automática confirma ausencia de scroll en 320 × 568, 390 × 844 y 1366 × 768.
2. **P1 — acciones sin respuesta.** “Crear otra empresa” apuntaba al flujo inicial y la campana no abría contenido. Se añadió `/app/empresas/nueva`, modo de creación con cancelación y una bandeja unificada con lectura, descarte y enlaces profundos.
3. **P1 — integraciones con estados mezclados.** Se separaron inicio de sesión, productividad y consentimiento administrativo de directorio. Las cuentas no autorizadas ya no ofrecen una sincronización que termina en error genérico.
4. **P2 — menús y vacíos desalineados.** Se normalizaron la retícula de menús, estados vacíos de automatizaciones y recurrencias, anchos de tablas y espacios de cuadrículas sin contenido.
5. **P2 — respuesta percibida.** Se añadieron precarga de navegación, esqueletos por módulo, resolución compartida de permisos y consultas paralelas. La actualización de escenario ya no se repite en cada módulo.

Las pruebas focalizadas posteriores a las correcciones completaron 62 casos y omitieron 2 no aplicables, sin fallos, en escritorio y móvil. Incluyen navegación completa, bandeja, formularios, diálogos y WCAG A/AA. Esta evidencia verifica comportamiento y geometría, pero no sustituye la comparación visual combinada exigida para aprobar Product Design.

## Pendiente para aprobación

- Abrir una pestaña controlable en Chrome con la sesión autenticada.
- Capturar acceso e Inicio corregidos en los mismos viewports y estados de las fuentes.
- Combinar fuente e implementación en una única comparación y revisar tipografía, retícula, color, iconos, estados y tema oscuro.
- Repetir la captura si aparece cualquier incidencia P0–P2.

final result: blocked
