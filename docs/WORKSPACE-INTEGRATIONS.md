# Integraciones de productividad

## Alcance de v1.7.0

La plataforma ofrece un contrato común para `google_workspace` y
`microsoft_365`. Cada conexión pertenece a una persona y a una organización;
no se comparte entre usuarios y no sustituye al inicio de sesión de la
aplicación.

Las capacidades son `files`, `spreadsheets`, `mail` y `calendar`. Drive,
Sheets, OneDrive, Excel y Calendar solo se utilizan después de una confirmación
explícita. El correo abre el compositor de Gmail u Outlook: la aplicación no
lee buzones, no guarda borradores por API y no envía mensajes.

## Google Cloud

1. Crear una aplicación web OAuth en Google Cloud y activar Drive API, Sheets
   API y Calendar API.
2. Añadir como URI de redirección
   `https://<dominio>/api/workspace/oauth/google_workspace/callback`.
3. Configurar `GOOGLE_WORKSPACE_CLIENT_ID` y
   `GOOGLE_WORKSPACE_CLIENT_SECRET` solo en el entorno del servidor.
4. Revisar la pantalla de consentimiento y solicitar únicamente `drive.file`,
   `spreadsheets`, `calendar.events`, `openid` y `email`.

`drive.file` limita el acceso a archivos creados o seleccionados para la
aplicación. No se solicita acceso general a Drive ni ningún alcance de Gmail.

## Microsoft Entra

1. Registrar una aplicación web en Microsoft Entra.
2. Añadir
   `https://<dominio>/api/workspace/oauth/microsoft_365/callback` como URI de
   redirección.
3. Configurar `MICROSOFT_365_CLIENT_ID`, `MICROSOFT_365_CLIENT_SECRET` y, si la
   organización lo necesita, `MICROSOFT_365_TENANT_ID`.
4. Conceder permisos delegados `User.Read`, `Files.ReadWrite` y
   `Calendars.ReadWrite`.

Excel conectado trabaja con libros `.xlsx` en OneDrive empresarial o
SharePoint. Las cuentas que no dispongan de ese entorno mantienen la descarga
local de XLSX y CSV.

## Estado, PKCE y secretos

El flujo usa Authorization Code con PKCE. El parámetro `state` contiene el
proveedor, la organización, la identidad, el verificador y la caducidad; se
cifra y autentica con AES-256-GCM mediante `WORKSPACE_OAUTH_STATE_SECRET` y se
comprueba en el callback. La clave debe contener exactamente 32 bytes codificados
en Base64 URL-safe. Las
redirecciones se construyen desde `NEXT_PUBLIC_APP_URL`, no desde valores
enviados por el navegador.

Los tokens solo pasan por código de servidor. Supabase Vault conserva el
contenido cifrado y `workspace_connections` guarda únicamente la referencia al
secreto, el propietario, las capacidades, el estado y metadatos no sensibles.
El cliente administrativo utiliza `SUPABASE_SECRET_KEY`; nunca debe declararse
con el prefijo `NEXT_PUBLIC_`.

## Exportaciones

El servidor acepta un identificador cerrado de módulo y reconstruye la consulta
con RLS, organización y columnas permitidas. No acepta SQL, nombres de tabla ni
columnas arbitrarias. Los trabajos tienen un máximo de 25.000 filas y producen
CSV, XLSX local, Google Sheets o Excel en Microsoft 365. Las escrituras externas
se dividen en lotes y permanecen pendientes hasta que una persona confirma el
destino.

## Modo invitado

La demo sin registro utiliza conectores simulados deterministas. Nunca inicia
OAuth, consulta Vault ni escribe en servicios externos.
