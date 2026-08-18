# Integraciones de productividad

## Principio de diseño

La cuenta utilizada para acceder a Plataforma de gestión no concede acceso
automático a archivos, calendarios o directorios. El producto separa tres
finalidades:

| Finalidad | Alcance |
| --- | --- |
| Acceso | Identidad básica mediante Google o Microsoft |
| Productividad | Archivos, hojas de cálculo y calendario autorizados |
| Directorio | Personas corporativas con consentimiento administrativo |

Una persona puede iniciar sesión con Google y conectar Microsoft 365, o al
revés. Cada conexión pertenece a una persona y a una organización.

## Capacidades

- **Archivos:** Drive o OneDrive, con acceso limitado a la aplicación.
- **Hojas de cálculo:** Google Sheets o libros Excel compatibles.
- **Calendario:** creación de eventos después de confirmación.
- **Correo:** apertura del compositor de Gmail u Outlook; la plataforma no lee
  buzones ni envía mensajes automáticamente.
- **Directorio:** sincronización de solo lectura para una cuenta corporativa
  autorizada.

Las descargas CSV y XLSX locales permanecen disponibles sin conectar un
proveedor.

## Estados visibles

La interfaz distingue:

- proveedor disponible o no configurado;
- conexión pendiente, activa, expirada o revocada;
- capacidades concedidas;
- cuenta personal, corporativa o todavía no verificada;
- consentimiento administrativo del directorio;
- última sincronización y error recuperable.

Un botón de acceso activo no implica que las capacidades de productividad o
directorio estén concedidas.

## Google Workspace

1. Crear una aplicación web OAuth y activar las API necesarias.
2. Añadir
   `https://<dominio>/api/workspace/oauth/google_workspace/callback`.
3. Configurar `GOOGLE_WORKSPACE_CLIENT_ID` y
   `GOOGLE_WORKSPACE_CLIENT_SECRET` solo en servidor.
4. Solicitar permisos de forma incremental.

`drive.file` limita Drive a archivos creados o seleccionados para la
aplicación. Sheets y Calendar se habilitan únicamente cuando la persona solicita
esas capacidades. El acceso al directorio requiere una cuenta Google Workspace
administrada y un consentimiento separado; no se ofrece a cuentas personales.

## Microsoft 365

1. Registrar una aplicación de productividad en Microsoft Entra.
2. Añadir
   `https://<dominio>/api/workspace/oauth/microsoft_365/callback`.
3. Configurar `MICROSOFT_365_CLIENT_ID`,
   `MICROSOFT_365_CLIENT_SECRET` y `MICROSOFT_365_TENANT_ID` en servidor.
4. Conceder únicamente los permisos delegados necesarios.

Excel conectado trabaja con libros `.xlsx` almacenados en OneDrive empresarial
o SharePoint. La sincronización de personas usa Microsoft Graph y solo se
habilita para una organización Entra con consentimiento administrativo. Las
cuentas personales mantienen las capacidades que admita el proveedor, pero no
simulan un directorio corporativo.

## OAuth, PKCE y secretos

El flujo utiliza Authorization Code con PKCE. El parámetro `state` protege
proveedor, identidad, organización, caducidad y retorno; se cifra y autentica
mediante `WORKSPACE_OAUTH_STATE_SECRET`. Las redirecciones se construyen desde
`NEXT_PUBLIC_APP_URL`, no desde valores enviados por el navegador.

Los tokens solo se intercambian en servidor. Supabase Vault conserva el secreto
cifrado y `workspace_connections` almacena una referencia, el propietario,
las capacidades y metadatos no sensibles. `SUPABASE_SECRET_KEY` nunca debe
aparecer en el cliente ni usar el prefijo `NEXT_PUBLIC_`.

## Sincronización de directorio

Google se pagina y Microsoft conserva el cursor incremental de Graph. La clave
`(organization_id, provider, external_id)` evita duplicados. Una baja externa
desactiva el perfil vinculado sin borrar tareas, proyectos ni auditoría; una
reactivación recupera el mismo vínculo.

Nombre corporativo, correo, equipo y estado pueden proceder del proveedor.
Roles, permisos, asignaciones y actividad pertenecen a la plataforma y no se
sobrescriben durante la sincronización.

## Exportaciones

El servidor recibe un identificador cerrado de módulo y reconstruye filtros,
organización, permisos y columnas. No acepta SQL, nombres de tabla ni columnas
arbitrarias enviados por el cliente.

Los trabajos grandes se paginan, tienen límite operativo y permanecen
pendientes hasta que una persona confirma el destino externo. Cada resultado
registra estado y error recuperable.

## Exploración sin registro

El modo de exploración utiliza conectores simulados deterministas. Nunca inicia
OAuth, consulta Vault ni escribe en servicios de Google o Microsoft.

## Validación

Antes de habilitar un proveedor en producción:

1. comprobar callback, PKCE, `state` manipulado y caducidad;
2. validar revocación, renovación y permisos incompletos;
3. probar cuentas personales y corporativas según el alcance;
4. confirmar aislamiento entre organizaciones y propietarios;
5. revisar secretos, logs y mensajes de error;
6. ejecutar el recorrido completo en Preview con una cuenta de prueba.
