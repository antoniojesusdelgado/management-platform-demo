# Vercel Firewall en v1.3.1

## Estado actual

La regla del callback OAuth se revisó y publicó desde el panel de Vercel:

- `Observe OAuth callback bursts`;
- ruta exacta `/auth/callback`;
- 20 solicitudes cada 300 segundos por IP;
- acción `log`.

El plan del proyecto devolvió
`Rate limiting is not available for this plan (401)` al preparar las reglas
restantes. Por tanto, se mantienen como recomendaciones documentadas y no como
controles activos.

## Reglas revisadas pendientes

Cuando el plan permita rate limiting, deben prepararse en modo de registro:

1. Cabecera `next-action` presente: 120 solicitudes cada 60 segundos por IP.
2. Solicitudes `POST` a `/app/configuracion` o `/app/integraciones`: 10
   solicitudes cada 60 segundos por IP.

Después de prepararlas:

```powershell
npx --yes vercel@latest firewall diff --no-color
npx --yes vercel@latest firewall rules list --expand --no-color
```

Los registros de Preview y producción deben revisarse antes de convertir una
regla de observación en una regla de bloqueo. Con independencia del Firewall
exterior, la comprobación previa de PostgREST limita las mutaciones a 120 por
minuto y las RPC costosas a 10 por minuto, y devuelve HTTP `429` con
`Retry-After`.
