# QA de diseño v1.8.0

## Alcance

- Referencia: `C:\Users\anton\.codex\generated_images\019fae5c-597d-7612-9946-bfbf8cf23fc0\exec-ce6f9017-41e9-4f3b-af61-4ea7d3382010.png`.
- Superficie validada: acceso invitado directo y aplicación completa en Chrome.
- Dirección evaluada: navegación superior flotante, fondo azul grisáceo, superficies translúcidas controladas, jerarquía operativa y navegación inferior móvil.
- Evidencia principal: `artifacts/design-qa-v1.8-comparison-final.png`.
- Evidencia móvil: `artifacts/design-qa-v1.8-mobile-390.png` y `artifacts/design-qa-v1.8-tasks-mobile-390.png`.

## Comparación visual

La implementación conserva la jerarquía de la referencia sin copiar contenido ficticio específico: empresa y navegación ocupan una única cabecera flotante; la agenda es el foco principal; capacidad, colaboración y métricas quedan en un segundo nivel; la profundidad se limita a bordes, desenfoque y sombras suaves.

La densidad responde a los datos reales del escenario y a los componentes compartidos de la aplicación. Se mantuvieron los tokens de tema, foco, contraste y densidad existentes.

## Responsive e interacción

| Ancho | Navegación | Overflow horizontal | Resultado |
| --- | --- | --- | --- |
| 320 px | Inferior móvil | No | Aprobado |
| 360 px | Inferior móvil | No | Aprobado |
| 390 px | Inferior móvil | No | Aprobado |
| 768 px | Inferior compacta | No | Aprobado |
| 1024 px | Inferior compacta | No | Aprobado |
| 1440 px | Superior | No | Aprobado |

Se comprobó la apertura del menú `Más`, la navegación a Tareas y Configuración, la vista Kanban móvil de una sola columna y la ausencia de elementos ocultos fuera del viewport. La última carga en una pestaña limpia no produjo errores ni avisos de consola.

## Incidencias y correcciones

1. **P0 — cabecera comprimida por la cuadrícula lateral heredada.** La nueva estructura seguía heredando las dos columnas de `.app-frame`. Se aisló `.app-frame-v18` como layout de bloque y se restauró el ancho completo de cabecera y contenido.
2. **P1 — navegación ausente entre 761 y 1100 px.** Se alineó el cambio entre navegación superior e inferior en 1100 px para evitar solapes en tablet horizontal.
3. **P2 — aviso de hidratación del bootstrap de tema.** Se mantuvo el script estático confiable en el `<head>` y se eliminó la discrepancia de `nonce` provocada por `next/script` en desarrollo.

Tras las correcciones no quedan incidencias P0, P1 ni P2 abiertas.

final result: passed
