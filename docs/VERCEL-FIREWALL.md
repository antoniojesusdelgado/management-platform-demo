# Vercel Firewall y límites de peticiones

## Alcance

Vercel aporta protección DDoS en la capa de red. Las reglas específicas del
producto complementan esa protección y los límites aplicados por PostgREST. El
objetivo es contener abuso sin bloquear OAuth, pruebas de Preview, rastreadores
legítimos o navegación normal.

## Estrategia

1. Crear cada regla en modo de registro.
2. Revisar tráfico de Preview y producción.
3. Comprobar falsos positivos.
4. Activar bloqueo o respuesta `429` solo con evidencia suficiente.
5. Mantener una vía documentada de reversión.

## Superficies a vigilar

| Superficie | Referencia operativa | Clave |
| --- | --- | --- |
| Inicio y callback OAuth | 20 solicitudes cada 5 minutos | IP |
| Server Actions autenticadas | 120 solicitudes por minuto | IP y sesión |
| Sincronización, exportación y restauración | 10 solicitudes por minuto | IP, persona y organización |

Los valores son límites de referencia y deben contrastarse con el plan de
Vercel y el tráfico real. PostgREST mantiene una segunda barrera para mutaciones
y operaciones costosas.

## Falsos positivos

Antes de aplicar bloqueo, comprobar:

- callbacks de Google y Microsoft;
- acceso desde el portfolio autorizado;
- Googlebot y vistas previas sociales en páginas públicas;
- Vercel Preview y pruebas Playwright;
- restauración o exportación legítima de una persona autenticada;
- reintentos controlados de integraciones.

## Verificación

```powershell
npx --yes vercel@latest firewall diff --no-color
npx --yes vercel@latest firewall rules list --expand --no-color
```

Las reglas del panel son estado operativo: este documento no demuestra que una
regla esté publicada. La validación de una release debe conservar el resultado
del panel, respuestas `429`, cabeceras `Retry-After` y una muestra de tráfico
sin falsos positivos.

## Historial

Las revisiones [v1.3.1](VERCEL-FIREWALL-V1.3.1.md) y
[v1.5.0](VERCEL-FIREWALL-V1.5.0.md) se conservan como evidencia histórica. Esta
guía es la referencia vigente.
