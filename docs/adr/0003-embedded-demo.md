# ADR 0003: Demo sin registro integrada

- Estado: Aceptada
- Fecha: 2026-07-20

## Decisión

Publicar una aplicación sin registro en `/demo/embed`. Utiliza datos ficticios
iniciales, conserva los cambios únicamente en `sessionStorage` y permite
restaurarlos desde la interfaz.

Solo esta ruta puede mostrarse dentro de un iframe. Su CSP `frame-ancestors`
acepta el origen exacto `PORTFOLIO_ORIGIN`; el resto de rutas usa
`frame-ancestors 'none'` y `X-Frame-Options: DENY`.

## Motivo

Las personas que evalúan el proyecto pueden recorrer un flujo funcional sin
autenticarse, mientras la aplicación autenticada permanece protegida y aislada.

## Limitaciones

El origen exacto del portfolio y de la aplicación no se conoce hasta la primera
Preview revisada. La integración debe comprobarse de nuevo cuando los orígenes
sean estables.
