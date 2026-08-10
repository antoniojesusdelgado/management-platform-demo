# Despliegue

## Modelo de publicación

La ruta pública sin registro funciona sin autenticación ni Supabase. Google
OAuth da acceso a la demostración técnica autenticada; cada identidad recibe un
espacio ficticio separado con todos los permisos de la demo. Ninguna de las dos
rutas debe contener datos operativos, financieros o laborales reales.

La Preview actúa como candidata de publicación. Solo se crea producción después
de superar las comprobaciones de base de datos, navegador, accesibilidad y
seguridad.

## 1. Control de calidad local

```powershell
bun install --frozen-lockfile
bunx supabase start
bunx supabase db reset
bunx supabase test db
bunx supabase db lint --level warning --fail-on error
bunx supabase inspect db index-stats --local
bunx supabase gen types --lang typescript --local
bun run lint
bun run typecheck
bun run test
bun run security:public-data
bun run build
bun run e2e
git diff --check
```

Los servicios locales usan el rango `56420–56429`, elegido para evitar los
rangos dinámicos que Windows puede reservar para Hyper-V y Docker. Este ajuste
solo afecta al entorno local; las URLs de Preview y producción no cambian.

El resultado generado debe coincidir con
`src/lib/supabase/database.types.ts`.

Para ejecutar la misma suite de navegador contra una Preview ya desplegada:

```powershell
$env:PLAYWRIGHT_BASE_URL = "https://<preview-host>"
bun run e2e
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

## 2. Supabase

1. Crear un proyecto dedicado en `eu-central-1`.
2. Revisar las migraciones con `supabase db push --dry-run`.
3. Aplicar únicamente las migraciones revisadas.
4. Ejecutar Database Linter y Security Advisor.
5. Configurar en Vercel la URL del proyecto y una clave
   `sb_publishable_...` habilitada.
6. Mantener las claves secretas o `service_role` fuera de la aplicación.

El registro por correo y el acceso anónimo permanecen desactivados. Google es
el único proveedor público de la aplicación.

Las RPC autenticadas `SECURITY DEFINER` son excepciones revisadas, no avisos
ignorados. Sus condiciones y pruebas pgTAP están documentadas en
[SECURITY-ADVISOR.md](./SECURITY-ADVISOR.md).

## 3. Google OAuth

Crear una aplicación web en Google Auth Platform y añadir:

- Orígenes JavaScript autorizados: el origen exacto de producción y el origen
  estable de Preview utilizado para QA de OAuth.
- URI de redirección autorizada:
  `https://<project-ref>.supabase.co/auth/v1/callback`.

El identificador y el secreto de Google se configuran únicamente en Supabase
Auth. En la configuración de URL de Supabase:

- definir Site URL con el origen de producción;
- añadir `http://localhost:3000/**` para desarrollo;
- añadir la ruta exacta de callback de producción;
- añadir un comodín de Vercel Preview solo para el proyecto y cuenta de este
  repositorio.

Debe validarse el acceso correcto, callback PKCE, renovación de cookies, cierre
de sesión y aislamiento con dos identidades de prueba. Ningún dato de identidad
del proveedor debe copiarse a `public.profiles`.

## 4. Vercel Preview

Configurar las variables de Preview y producción:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
PORTFOLIO_ORIGIN
```

`NEXT_PUBLIC_APP_URL` debe coincidir con el origen exacto de cada entorno.
`PORTFOLIO_ORIGIN` debe ser el origen exacto del portfolio; solo
`/demo/embed` puede mostrarse dentro de un iframe.

Después de desplegar la Preview se comprueba:

- `/`, `/demo/embed`, `/login` y todas las rutas autenticadas;
- escritorio y móvil a 360 px;
- navegación por teclado, foco visible, movimiento reducido y resultados Axe;
- aprovisionamiento OAuth y RLS entre espacios;
- CSP, `frame-ancestors`, política de referencia y cabeceras MIME;
- ausencia de errores, secretos, datos personales o peticiones externas
  inesperadas.

## 5. Producción

Solo debe promoverse la revisión de código que superó QA en Preview, usando las
variables del entorno de producción. Después de la promoción:

1. Repetir las pruebas rápidas en las rutas pública, integrada y autenticada.
2. Revisar errores de ejecución y registros del despliegue.
3. Confirmar el origen autorizado del iframe del portfolio.
4. Confirmar que Google OAuth utiliza el origen de producción.
5. Conservar el despliegue anterior como opción de reversión.

## Candidata v1.7.0

La publicación requiere añadir en Preview y Producción las variables descritas
en `WORKSPACE-INTEGRATIONS.md`. `WORKSPACE_OAUTH_STATE_SECRET`,
`SUPABASE_SECRET_KEY` y los secretos de cliente son variables exclusivas del
servidor. Después de configurarlas se deben registrar exactamente los callbacks
de Google Workspace y Microsoft Entra para cada dominio autorizado.

Antes de promover la Preview se comprueban por separado: OAuth válido, estado
manipulado, revocación, permisos incompletos, exportación local, confirmación de
escritura externa y ausencia de OAuth en el modo invitado.

## Versión actual

- Origen canónico de producción: <https://plataformagestion.app>
- Alternativa de Vercel: <https://management-platform-demo.vercel.app>
- Preview estable de la rama:
  <https://management-platform-de-git-acc0ac-antonio-jesus-delgado-briones.vercel.app>
- Versión actual de producción: `v1.5.1`
- Candidata en validación: `v1.7.0`
- Región y plan de Supabase: `eu-central-1`, Free
- Producción y Preview utilizan variables separadas para los orígenes de la
  aplicación y del portfolio.
- La compilación local y la Preview superaron 64 comprobaciones de extremo a
  extremo; 6 combinaciones de proyecto o dispositivo se omitieron de forma
  intencionada.
- La migración más reciente es
  `20260810185850_release_v1_7_operations.sql` y
  `20260810190106_harden_v1_7_operation_policies.sql`.
- El esquema remoto incluye políticas RLS, aprovisionamiento determinista y la
  integración nocturna neutral programada a las 02:15 UTC.
- El refuerzo eliminó los índices de claves foráneas ausentes, las políticas de
  autenticación sin optimizar y las lecturas permisivas duplicadas detectadas
  por los asesores.
- El aislamiento con una segunda identidad de Google sigue siendo una
  comprobación manual. pgTAP cubre el aislamiento multiorganización.

## Versión v1.5.1

`v1.5.1` corrige la diferencia entre la versión publicada y la mostrada en
Novedades:

1. `package.json`, el catálogo de producto y la interfaz deben informar la
   misma versión.
2. `GuestDemoState V19` añade únicamente las novedades ausentes y conserva
   cualquier contenido modificado en la sesión.
3. La migración SQL inserta `v1.4.0`, `v1.4.1`, `v1.5.0` y `v1.5.1` mediante
   identificadores deterministas y `ON CONFLICT DO NOTHING`.
4. `bunx supabase db push --dry-run` debe mostrar solo la migración de
   alineación antes de aplicarla al proyecto remoto.
5. La Preview debe validarse en modo invitado y OAuth antes de promover el
   mismo artefacto a producción.
6. GitHub, Vercel y Novedades deben terminar apuntando a `v1.5.1`.

## Versión v1.3.2

`v1.3.2` se preparó en `codex/management-platform-v1-3-2` como una corrección
aditiva del directorio y los contenidos:

1. Registrar por organización el total de personas, nombres provisionales,
   nombres distintos y grupos duplicados.
2. Ejecutar `bunx supabase db push --dry-run` y revisar solo la migración
   pendiente de v1.3.2.
3. Restaurar la base de datos local, ejecutar pgTAP y confirmar que la
   correspondencia de nombres SQL coincide con el generador TypeScript.
4. Aplicar la migración y comprobar que el total y los identificadores no
   cambian y que los nombres provisionales y duplicados quedan a cero.
5. Subir la rama, validar su Vercel Preview y promover exactamente ese
   despliegue.
6. Probar Personal y Novedades tanto sin registro como con Google. Confirmar que
   v1.3.2 muestra la fecha 30 de julio de 2026 y utiliza lenguaje no técnico.

La migración no inserta ni elimina personas. Solo renombra identificadores V7
deterministas que aún conservan el marcador generado e instala la misma
correspondencia para inserciones incrementales posteriores.

## Versión v1.3.1

`v1.3.1` se entregó desde `codex/management-platform-v1-3-1` como corrección
inmutable sobre v1.3.0:

1. Ejecutar la matriz completa de aplicación y Supabase local.
2. Revisar `supabase db push --dry-run` y registrar los recuentos antes de la
   migración aditiva.
3. Subir el commit de la versión, abrir el PR y validar la Preview a
   320/360/390 px y en escritorio.
4. Preparar las reglas de Vercel Firewall únicamente en modo de registro. La
   publicación se realiza desde el panel después de revisar el tráfico.
5. Aplicar la migración y verificar `scenario_v7_backfilled_at`, un evento
   `backfilled`, las filas editadas sin cambios y entre 245 y 255 personas
   activas.
6. Probar la demo sin registro y una identidad de Google existente, ejecutar
   ZAP pasivo y revisar Security Advisor.
7. Promover la Preview validada, fusionar el PR autorizado y etiquetar el commit
   incluido en `main` como `v1.3.1`.

El procedimiento de base de datos se encuentra en
[SCENARIO-V7-BACKFILL.md](./SCENARIO-V7-BACKFILL.md). El limitador de PostgREST
se aplica en la migración compatible. La observación exterior por IP y las
limitaciones del plan se documentan en
[VERCEL-FIREWALL-V1.3.1.md](./VERCEL-FIREWALL-V1.3.1.md).

## Versión v1.3.0

`v1.3.0` se finalizó en `codex/management-platform-v1-3-1`. Antes de publicarla
se ejecutaron la suite local completa, generación de Scenario V7, restauración,
pgTAP, lint de base de datos, asesores y comparación de tipos. El proceso fue:

1. Subir el commit revisado y abrir un PR en borrador.
2. Validar la Preview de Vercel con tema claro predeterminado y oscuro manual.
3. Ejecutar ZAP Baseline pasivo contra el host permitido y conservar el
   artefacto.
4. Revisar `supabase db push --dry-run` y aplicar la migración aditiva.
5. Verificar callback PKCE, renovación, cierre de sesión y aislamiento.
6. Promover exactamente el artefacto validado.
7. Tras la fusión autorizada, confirmar la igualdad del árbol, etiquetar
   `v1.3.0` y publicar la Release de GitHub.

La migración no elimina registros operativos.
`ensure_demo_scenario_current` mantiene un bloqueo transaccional por
organización y añade únicamente el intervalo que falta hasta ayer en
`Europe/Madrid`.

La corrección posterior publicó manualmente la entrada v1.3.0 con fecha
editorial `2026-06-23` y reparó únicamente las cadenas ficticias con problemas
conocidos de codificación. El formulario de Personal obtiene sus equipos de los
datos persistidos y vuelve a validar el equipo antes de guardar las fechas
profesionales. Una migración aditiva final alineó las organizaciones existentes
y nuevas con `scenario_version = 7` incluso cuando no quedaba intervalo diario
por generar.

## Versión v1.2.0

`v1.2.0` se desarrolló en `codex/management-platform-v1-2`. Añadió una migración
idempotente para Scenario V3, restauró una sola vez las organizaciones V2 y
conservó el bucket privado de avatares y la configuración OAuth.

La secuencia incluyó restauración local, pgTAP, comprobaciones de aplicación,
Preview, restauración V3 en una organización de prueba, OAuth, revisión móvil,
promoción del mismo artefacto, restauración idempotente, prueba rápida de
producción, etiqueta y Release de GitHub.

## Versión v1.2.1

`v1.2.1` se desarrolló en `codex/management-platform-v1-2-1`. Su migración
Scenario V4 conservó el esquema, sustituyó una sola vez el escenario ficticio
de seis meses en organizaciones V3 y registró
`demo.scenario.v4_restored`.

Se mantuvo la misma secuencia: restauración local, pgTAP, comprobaciones,
Preview, simulación de migración remota, migración compatible, promoción,
prueba rápida, etiqueta y Release.

## Versión v1.2.2

`v1.2.2` se desarrolló en `codex/management-platform-v1-2-2`. Scenario V5
amplió el intervalo operativo ficticio del 1 de enero de 2025 al 17 de junio de
2026, añadió participantes de nómina sin importes individuales y la jerarquía de
personal, y restauró una sola vez las organizaciones V4 con un evento de
auditoría.

El mantenimiento posterior conservó inmutable la etiqueta `v1.2.2` e introdujo
Scenario V6 y `GuestDemoState V14`. Añadió modalidades contractuales,
reequilibró las tareas, aseguró la coherencia entre progreso y estado de
proyecto y mejoró las definiciones y formatos analíticos visibles. La entrega
continuó utilizando una Preview revisada antes de la migración compatible y la
promoción del mismo artefacto.
