# Onboarding, multiempresa y sincronización de directorio

## Recorrido de acceso

La ruta invitada abre directamente el repositorio local y determinista. Google
y Microsoft autentican mediante Supabase OAuth con PKCE y vuelven a
`/auth/callback`. Si existe una membresía activa se recupera la última empresa;
si no existe, se abre `/app/onboarding`.

El onboarding permite crear una empresa vacía, cargar la plantilla sintética o
aceptar un código de invitación ligado al correo verificado. Las organizaciones
anteriores se marcan como incorporadas durante la migración y sus datos no se
regeneran.

## Empresa activa e aislamiento

`profiles.active_organization_id` conserva la preferencia entre dispositivos y
la cookie `active-organization`, `httpOnly` y `SameSite=Lax`, agiliza el cambio
en el navegador. La cookie nunca concede acceso: la RPC de cambio y todas las
consultas comprueban de nuevo la membresía y RLS.

## Directorio corporativo

Cada proveedor dispone de configuración, cursor y trabajos independientes.
Google se recorre en páginas de 100 usuarios. Microsoft conserva el enlace
`users/delta` para cambios incrementales. Los lotes aceptan como máximo 250
identidades y se aplican con una clave idempotente.

La clave única `(organization_id, provider, external_id)` impide duplicados.
Una identidad nueva crea un perfil operativo mínimo; una identidad conocida
actualiza nombre, equipo y estado. La eliminación o suspensión externa cambia
el perfil a inactivo y conserva tareas, proyectos, eventos y auditoría.

## Operación y recuperación

Una persona con `settings.workspace.manage` puede iniciar una sincronización
manual desde Integraciones. En el plan actual, Vercel llama una vez al día al
endpoint firmado `/api/cron/directory-sync`. La frecuencia horaria queda
preparada para Vercel Pro o un programador externo compatible. Los tokens se
descifran solo en servidor, se
renuevan cuando faltan menos de 60 segundos y vuelven a guardarse en Vault.

Los fallos dejan un código acotado en la configuración y no revierten páginas
ya confirmadas. Una nueva ejecución reutiliza los vínculos existentes y puede
continuar sin duplicar personas.
