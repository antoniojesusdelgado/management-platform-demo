# Seguridad

## Alcance

Este repositorio es una demostración pública construida con datos ficticios. La
ruta sin registro guarda su estado en `sessionStorage` y no consulta Supabase.
La aplicación autenticada crea un espacio sintético independiente para cada
identidad de Google.

## Controles principales

- Google OAuth utiliza PKCE y cookies seguras.
- Las sesiones, la pertenencia a la organización y los permisos se comprueban
  de nuevo en el servidor.
- Todas las tablas de aplicación tienen Row Level Security (RLS).
- Las funciones con privilegios elevados usan permisos mínimos y un
  `search_path` vacío.
- Las consultas se realizan con parámetros; no se construye SQL a partir de
  texto introducido por el usuario.
- Los esquemas Zod normalizan el texto, limitan su longitud y rechazan
  caracteres de control o marcado ejecutable.
- La política CSP usa nonces en las superficies dinámicas. Ningún dato de
  usuario llega a `dangerouslySetInnerHTML`.
- PostgREST aplica límites por minuto a las mutaciones y a las operaciones más
  costosas. Vercel aporta la protección de red y las reglas de Firewall
  configuradas para el proyecto.

El nombre, el correo y la imagen de Google no se copian a las tablas públicas de
la aplicación. El perfil visible usa una identidad ficticia.

## Secretos y variables

Solo las variables expresamente publicables pueden usar el prefijo
`NEXT_PUBLIC_`. El secreto de Google, las claves privadas de Supabase, los
tokens y las credenciales de base de datos deben permanecer en sus respectivos
gestores de secretos.

Antes de publicar una versión:

1. Ejecuta `bun run security:secrets` para revisar archivos e historial Git.
2. Ejecuta `bun run security:public-data` para comprobar los límites de la demo.
3. Revisa `bun audit --audit-level=high`, CodeQL y Dependency Review.
4. Comprueba los avisos de Security Advisor y Database Linter en Supabase.
5. Confirma que Preview y Production usan variables separadas.
6. Revisa el informe pasivo de ZAP generado contra la Preview validada.

Las excepciones de seguridad necesarias para las RPC están justificadas y
probadas en [docs/SECURITY-ADVISOR.md](docs/SECURITY-ADVISOR.md).

## Comunicar una vulnerabilidad

No publiques credenciales, datos personales ni instrucciones de explotación en
un issue. Envía el hallazgo de forma privada al propietario del repositorio e
incluye únicamente la información necesaria para reproducirlo.

Al informar, indica la ruta afectada, el impacto estimado y los pasos de
reproducción. No pruebes el hallazgo contra datos o cuentas de terceros.
