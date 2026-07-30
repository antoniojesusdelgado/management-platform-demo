# ADR 0002: Autenticación y RLS

- Estado: Aceptada
- Fecha: 2026-07-20

## Decisión

Utilizar Google OAuth mediante Supabase Auth con PKCE y cookies SSR. Después del
acceso se exige una pertenencia activa. El aislamiento por organización y los
permisos se aplican tanto en el servidor como en PostgreSQL RLS.

## Controles de seguridad

- No existe una interfaz pública de registro.
- La autorización no depende de `user_metadata`.
- Los códigos de permiso son estables e independientes de los nombres y colores
  editables de los roles.
- Las Server Actions vuelven a validar identidad, pertenencia y permiso.
- Las funciones SQL con privilegios usan `security definer`, nombres de objeto
  explícitos, un `search_path` vacío y permisos `EXECUTE` restringidos.
- RLS está activado en todas las tablas de aplicación.

## Riesgos residuales

Los límites de peticiones, la entrega de invitaciones y la configuración del
proveedor OAuth deben validarse tras el aprovisionamiento. Las pruebas RLS
necesitan Docker local o una base de datos aislada.
