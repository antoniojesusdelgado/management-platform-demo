# Seguridad

## Controles añadidos en v1.8.0

- Google y Microsoft usan OAuth con PKCE; la conexión de la suite es distinta
  del inicio de sesión.
- El selector multiempresa solo acepta organizaciones con membresía activa y
  la base de datos vuelve a validar el aislamiento.
- Los vínculos de directorio son únicos por organización, proveedor e
  identificador externo. Las bajas desactivan perfiles y no borran histórico.
- La sincronización programada exige `CRON_SECRET`; las credenciales se leen y
  actualizan exclusivamente mediante Supabase Vault y `service_role` en
  servidor.
- Las funciones privilegiadas nuevas usan `search_path` vacío y revocan los
  privilegios de `PUBLIC`.

## Alcance

Este repositorio contiene la implementación pública de la plataforma. El modo
de exploración utiliza datos ficticios, guarda su estado en `sessionStorage` y
no consulta Supabase. La aplicación autenticada crea un espacio sintético
independiente para cada identidad autorizada.

No existe un modelo de lenguaje, agente ni entrada conectada a herramientas, por
lo que la inyección de prompts no forma parte de la superficie de ataque actual.
Las entradas de texto se tratan como datos y se protegen frente a XSS, marcado
ejecutable, inyección SQL y abuso de recursos.

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
- `/explorar` también usa nonce y solo admite como ancestro el origen exacto
  configurado mediante `PORTFOLIO_ORIGIN`; `/demo/embed` se conserva únicamente
  como redirección permanente de compatibilidad.
- PostgREST aplica límites por minuto a las mutaciones y a las operaciones más
  costosas. Vercel aporta la protección de red y las reglas de Firewall
  configuradas para el proyecto.

El nombre, el correo y la imagen de Google no se copian a las tablas públicas de
la aplicación. El perfil visible usa una identidad ficticia.

La supresión de cuenta se ejecuta en dos fases: primero se eliminan conexiones,
credenciales guardadas y avatares de la plataforma y se anonimiza el perfil;
después Supabase Auth desactiva la
identidad mediante borrado irreversible. La operación exige una sesión válida,
confirmación explícita y una acción de servidor. No se expone la clave secreta
al navegador.

Google Analytics 4 permanece desactivado hasta recibir consentimiento. Las
acciones de aceptar y rechazar tienen la misma jerarquía y la preferencia se
puede revisar en cualquier momento. Se desactivan las señales de Google y la
personalización publicitaria.

## Secretos y variables

Solo las variables expresamente publicables pueden usar el prefijo
`NEXT_PUBLIC_`. El secreto de Google, las claves privadas de Supabase, los
tokens y las credenciales de base de datos deben permanecer en sus respectivos
gestores de secretos.

Antes de publicar una versión:

1. Ejecuta `bun run security:secrets` para revisar archivos e historial Git.
2. Ejecuta `bun run security:public-data` para comprobar los límites del modo
   de exploración.
3. Revisa `bun audit --audit-level=high`, CodeQL y Dependency Review.
4. Comprueba los avisos de Security Advisor y Database Linter en Supabase.
5. Confirma que previsualización y producción usan variables separadas.
6. Revisa el informe pasivo de ZAP generado contra el despliegue validado.

Las excepciones de seguridad necesarias para las RPC están justificadas y
probadas en [docs/SECURITY-ADVISOR.md](docs/SECURITY-ADVISOR.md).

## Comunicar una vulnerabilidad

No publiques credenciales, datos personales ni instrucciones de explotación en
un issue. Envía el hallazgo de forma privada al propietario del repositorio e
incluye únicamente la información necesaria para reproducirlo.

Contacto: [contacto@antoniodelgado.tech](mailto:contacto@antoniodelgado.tech).

Al informar, indica la ruta afectada, el impacto estimado y los pasos de
reproducción. No pruebes el hallazgo contra datos o cuentas de terceros.
