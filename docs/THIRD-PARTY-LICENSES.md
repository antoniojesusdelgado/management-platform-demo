# Licencias de terceros

El código original de la aplicación, la documentación y la identidad visual son
propietarios y están cubiertos por `LICENSE`. Las dependencias conservan sus
propias licencias.

| Componente | Finalidad | Licencia |
| --- | --- | --- |
| Next.js, React, TypeScript | Ejecución y lenguaje de la aplicación | MIT / Apache-2.0 |
| Tailwind CSS | Herramientas de estilos | MIT |
| Bun | Gestor de paquetes y entorno de pruebas | MIT |
| Clientes y CLI de Supabase | Autenticación, base de datos y desarrollo local | MIT / Apache-2.0 |
| PostgreSQL y pgTAP | Base de datos y pruebas de base de datos | PostgreSQL |
| Playwright y Axe | Pruebas de navegador y accesibilidad | Apache-2.0 / MPL-2.0 |
| Radix UI | Primitivas accesibles | MIT |
| Tabler Icons | Iconos de interfaz | MIT |
| Recharts | Gráficos | MIT |
| dnd-kit | Arrastrar y soltar accesible | MIT |
| Zod | Esquemas de validación en ejecución | MIT |
| date-fns, Sonner, clsx | Utilidades de interfaz | MIT |
| ExcelJS | Generación local de libros XLSX | MIT |

Las versiones exactas de las dependencias transitivas quedan fijadas en
`bun.lock`. Antes de redistribuir el proyecto debe generarse un aviso legible
por máquina a partir de ese archivo y revisarse cada licencia transitiva.
AdventureWorks (MIT) y las estadísticas agregadas del INE (CC BY 4.0) son
referencias documentadas en `DATA-PROVENANCE.md`; el conjunto de datos del
producto no incorpora filas de esas fuentes.
