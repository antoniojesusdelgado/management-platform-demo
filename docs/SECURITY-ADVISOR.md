# Revisión de Security Advisor

## Comprobaciones v1.8.3

- La finalización del onboarding dispone únicamente de `UPDATE` sobre
  `profiles.onboarding_completed_at`; `authenticated` no recupera actualización
  general de perfiles y `anon` no obtiene ningún privilegio.
- RLS continúa activo en `public.profiles` y la política limita la escritura a
  la identidad autenticada correspondiente.
- La publicación de Novedades usa identificadores deterministas y
  `ON CONFLICT DO NOTHING`; no sobrescribe contenido operativo.
- Los cambios visuales y de redacción no amplían permisos OAuth, callbacks,
  secretos, subida de archivos ni superficies de HTML ejecutable.

## Endurecimiento v1.8.2

- El login de Google y Microsoft queda limitado a identidad básica.
- Productividad y directorio usan consentimientos separados y estado OAuth
  firmado ligado a proveedor, usuario, organización y finalidad.
- `apply_directory_sync_batch_v1_8` solo puede ejecutarse con `service_role`.
- El avatar se valida y recodifica en servidor: JPEG, PNG o WebP reales,
  10 MB de entrada, 40 megapíxeles y WebP privado 512×512 inferior a 1 MB.
- El WAF exterior complementa la cuota de PostgREST y se activa después de
  observar falsos positivos en OAuth.

No se aceptan HTML de usuario, SQL dinámico, rutas aportadas por el cliente ni
secretos con prefijo público.

## Situación de la versión

La demo sin registro no se conecta a Supabase. Las identidades autenticadas con
Google reciben espacios ficticios separados y todas las tablas expuestas de la
aplicación tienen Row Level Security.

La migración de refuerzo:

- añade un índice de prefijo izquierdo para cada clave foránea pública;
- evalúa `auth.uid()` una sola vez por sentencia en las políticas RLS;
- separa las políticas de lectura de las de inserción, actualización y borrado;
- conserva los filtros por organización y código estable de permiso.

## Lista autorizada de RPC con privilegios

La aplicación expone de forma intencionada una lista revisada de funciones
`SECURITY DEFINER` autenticadas mediante PostgREST. Estas funciones actúan como
límite transaccional para transiciones validadas, flujos financieros agregados
de la demo, preferencias personales, ciclo de vida del espacio y ejecuciones
ficticias de integraciones.

Estas funciones constituyen una excepción explícita y revisada de Security
Advisor. Salvo la comprobación previa de rate limiting descrita más abajo, cada
RPC autorizada debe cumplir estas condiciones:

1. `anon` y `PUBLIC` no pueden ejecutarla.
2. Solo `authenticated` recibe el permiso de ejecución necesario.
3. La función tiene un `search_path` vacío.
4. El cuerpo comprueba expresamente `auth.uid()`.
5. Las mutaciones de una organización comprueban también la pertenencia o un
   código estable de permiso.
6. La escritura directa en tablas sigue siendo más restrictiva que el contrato
   de la RPC cuando el módulo exige eventos inmutables o validación de estados.

`supabase/tests/011_release_hardening.sql` comprueba las condiciones
estructurales. Las suites pgTAP de módulos y organizaciones verifican el
resultado de la autorización. `supabase/tests/014_release_v1_3.sql` cubre además
la RPC protegida de Scenario V7, el generador privado, RLS en las tablas nuevas y
la detección de texto mal codificado. `supabase/tests/015_release_v1_3_1.sql`
cubre la marca histórica, la correspondencia de hitos entre TypeScript y SQL,
la idempotencia, la revocación de RPC antiguas y el rate limiting por debajo y
por encima del límite de operaciones costosas.

`supabase/tests/021_release_v1_7.sql` comprueba RLS en las nuevas tablas,
ausencia de lectura anónima y la separación entre las RPC públicas y las
funciones privadas que escriben secretos o procesan recurrencias. Los tokens de
Google Workspace y Microsoft 365 se cifran en Supabase Vault. La Data API solo
expone una referencia opaca; la lectura del secreto queda reservada al cliente
de servidor y la revocación elimina también el registro cifrado.

Los disparadores y acciones de automatización utilizan enumeraciones cerradas.
Las exportaciones reconstruyen en servidor la organización, la consulta y las
columnas permitidas; ninguna entrada acepta SQL, JavaScript, URLs o nombres de
tabla arbitrarios. El correo se limita a enlaces de compositor y no solicita
permisos de buzón.

Los avisos no deben descartarse de forma global. Cualquier nueva RPC con
privilegios necesita una revisión individual, el permiso mínimo, una
comprobación de identidad y cobertura pgTAP antes de entrar en esta lista.

Desde `v1.5.0`, los privilegios por defecto de PostgreSQL no conceden ejecución
de nuevas funciones públicas a `PUBLIC`, `anon` o `authenticated`. Cada nueva
RPC debe declarar sus permisos de forma explícita en su propia migración. La
suite `018_release_v1_5.sql` comprueba este cierre preventivo y que la excepción
de rate limiting necesaria para PostgREST continúa disponible.

CI ejecuta `bun audit --audit-level=high`, CodeQL y la revisión de dependencias.
El flujo ZAP Baseline es manual, acepta únicamente la raíz HTTPS validada de una
Preview `*.vercel.app` y conserva el informe pasivo como artefacto.

`check_management_request_rate_limit` es la única excepción aprobada. PostgREST
necesita que `authenticator`, `anon`, `authenticated` y `service_role` tengan
permiso `EXECUTE` para utilizarla como comprobación previa. La propia función
rechaza cualquier llamada directa por la ruta RPC pública, almacena solo un hash
unidireccional del sujeto y una ruta acotada. Las RPC históricas de restauración
V3–V6 y la marca de restauración V2 están revocadas expresamente.

Los avisos informativos restantes del linter se revisan contra esta lista antes
de cada publicación. No se abren políticas RLS ni se revocan permisos necesarios
solo para ocultar un aviso: cualquier cambio debe mantener las pruebas de
autorización y el funcionamiento de PostgREST.

## Revisión de autenticación

Google OAuth es el único proveedor público de autenticación. El acceso con
contraseña y el registro anónimo no forman parte de la aplicación, por lo que la
protección frente a contraseñas filtradas no interviene en el flujo actual. Si
se habilita el acceso por contraseña, esa protección pasará a ser un requisito
de publicación.

## Aceptación manual

El aislamiento se prueba en la base de datos con varias identidades ficticias.
Antes de una publicación formal debe completarse una validación en navegador
con dos cuentas de Google independientes y confirmar que:

- cada cuenta crea una organización distinta;
- ninguna cuenta puede abrir registros de la otra organización;
- el cierre de sesión retira el acceso a las rutas protegidas;
- los roles simulados solo reducen los permisos efectivos.
