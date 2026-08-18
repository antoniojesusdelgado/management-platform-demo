# ADR 0001: Tecnologías y límites del producto

- Estado: Aceptada
- Fecha: 2026-07-20

## Decisión

Utilizar Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix, Tabler Icons,
Bun, Vercel y un proyecto independiente de Supabase.

## Motivo

Estas tecnologías permiten autenticación SSR, controladores de rutas, Server
Actions, una ruta pública integrable y una aplicación autenticada sin mezclar
el código del portfolio con el del producto. Bun se mantiene como único gestor
de paquetes.

## Consecuencias

- El portfolio enlaza una aplicación desplegada por separado.
- Supabase y Vercel necesitan aprovisionamiento y aprobación de costes
  independientes.
- La exploración sin registro sigue siendo útil cuando los servicios externos no están
  disponibles.
- La aplicación en ejecución no depende de la API de OpenAI.
