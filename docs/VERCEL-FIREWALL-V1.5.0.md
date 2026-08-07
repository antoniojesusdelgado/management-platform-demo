# Revisión de Vercel Firewall para v1.5.0

## Finalidad

Esta revisión complementa la protección DDoS automática de Vercel. No pretende
impedir todo el rastreo ni el tráfico automatizado. La aplicación protege los
datos privados y las operaciones autenticadas sin bloquear la indexación
legítima.

## Reglas preparadas

Toda regla personalizada debe comenzar en modo de registro. Las candidatas son:

1. Registrar un volumen inusualmente alto contra `/auth/google` y
   `/auth/callback` sin bloquear el flujo OAuth.
2. Registrar solicitudes repetidas a rutas autenticadas que no lleven el
   contexto de sesión esperado.
3. Registrar ráfagas automatizadas contra las operaciones costosas de
   restauración, manteniendo el límite previo de base de datos como control
   efectivo.

No se publicará una regla de bloqueo hasta revisar una muestra de tráfico y
recibir la confirmación expresa del propietario del repositorio.

## Comprobaciones de falsos positivos

Antes de cambiar una regla de registro a bloqueo o desafío, se confirmará que no
afecta a:

- las redirecciones y callbacks de Google OAuth;
- el iframe del portfolio desde `https://antoniodelgado.tech`;
- Googlebot y los rastreadores de vistas previas sociales en páginas públicas;
- los despliegues Preview utilizados por CI y las pruebas de navegador;
- las personas autenticadas que restauren su espacio aislado de demostración.

Se conservará una vía de reversión y se revisarán los registros de Vercel tras
cada cambio. La configuración del firewall es estado operativo y este documento
no la activa.
