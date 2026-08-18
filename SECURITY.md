# Seguridad

## Modelo de seguridad

Plataforma de gestión aplica defensa en profundidad. La aplicación valida la
sesión y el permiso en el servidor; PostgreSQL vuelve a limitar cada operación
mediante Row Level Security (RLS). El identificador de organización recibido
del navegador nunca concede acceso por sí solo.

El modo de exploración utiliza un estado local validado y no consulta ni escribe
en Supabase. El área autenticada mantiene organizaciones, membresías y datos
operativos separados.

## Controles principales

- Google y Microsoft utilizan OAuth con PKCE para la identidad básica.
- El acceso, la productividad y la sincronización de directorio son
  autorizaciones independientes.
- Las Server Actions normalizan y validan entradas con Zod antes de procesarlas.
- Las consultas son parametrizadas; no se construye SQL desde texto de usuario.
- Las funciones privilegiadas autorizan identidad, organización y permiso,
  usan `search_path` vacío y revocan el acceso de `PUBLIC`.
- Los tokens de productividad solo se procesan en servidor y se referencian
  mediante Supabase Vault.
- Los avatares se validan por firma, se decodifican y se recodifican en WebP en
  servidor antes de almacenarse en un bucket privado.
- La Content Security Policy utiliza nonce en superficies dinámicas, restringe
  el framing y evita HTML de usuario ejecutable.
- PostgREST limita mutaciones y operaciones costosas; Vercel Firewall actúa
  como capa exterior de observación y protección de red.
- Google Analytics 4 permanece desactivado hasta recibir consentimiento.
- El escaneo de secretos, CodeQL, Dependency Review y ZAP forman parte de la
  cadena de validación.

La lista de RPC privilegiadas y sus excepciones técnicas se mantiene en
[Revisión de Security Advisor](docs/SECURITY-ADVISOR.md). La configuración
operativa de red se documenta en [Vercel Firewall](docs/VERCEL-FIREWALL.md).

## Datos y privacidad

Los espacios públicos utilizan datos sintéticos y no copian el nombre, correo o
imagen del proveedor OAuth a las tablas visibles. Las conexiones de Google
Workspace y Microsoft 365 pertenecen a una persona y una organización; RLS
impide consultar o revocar conexiones ajenas.

La supresión de cuenta exige sesión válida y confirmación explícita. El proceso
revoca conexiones, elimina el avatar, anonimiza el perfil, suspende membresías y
desactiva la identidad. Se conserva únicamente la trazabilidad operativa no
identificativa necesaria para mantener la integridad de las organizaciones.

## Gestión de secretos

Solo las variables expresamente publicables pueden utilizar el prefijo
`NEXT_PUBLIC_`. Los secretos OAuth, las claves privadas de Supabase, los tokens
y las credenciales de base de datos deben permanecer en los gestores de
secretos de Supabase y Vercel.

Antes de publicar:

1. Ejecutar `bun run security:secrets` y `bun run security:public-data`.
2. Revisar `bun audit --audit-level=high`, CodeQL y Dependency Review.
3. Ejecutar las pruebas pgTAP, Database Linter y Security Advisor.
4. Validar cabeceras, CSP, framing, OAuth y aislamiento en Preview.
5. Ejecutar ZAP Baseline únicamente contra el host aprobado.

## Versiones compatibles

Las correcciones de seguridad se publican sobre la versión activa. No se
mantienen ramas antiguas con soporte prolongado. Se recomienda utilizar siempre
la última release publicada y revisar sus notas antes de actualizar.

## Comunicar una vulnerabilidad

No publiques credenciales, datos personales, payloads activos ni instrucciones
de explotación en un issue. Envía el hallazgo de forma privada a
[contacto@antoniodelgado.tech](mailto:contacto@antoniodelgado.tech).

Incluye la ruta afectada, el impacto estimado, los pasos mínimos de reproducción
y una forma segura de contacto. No pruebes el hallazgo contra cuentas o datos de
terceros.
