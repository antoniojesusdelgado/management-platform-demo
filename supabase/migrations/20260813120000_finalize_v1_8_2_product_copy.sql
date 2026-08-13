-- Update only untouched canonical v1.8.2 release copy. User-edited entries remain intact.
update public.changelog_entries
set title = 'Una plataforma más clara y bajo tu control',
    summary = 'Estrenamos una identidad más profesional, acceso con Google o Microsoft y opciones sencillas para gestionar tu privacidad.',
    published_at = '2026-08-13T12:00:00+02:00'::timestamptz,
    updated_at = now()
where version = '1.8.2'
  and title = 'Más control sobre tu privacidad'
  and summary = 'Ahora puedes decidir si compartes métricas de uso, cambiar esa elección cuando quieras y eliminar tu cuenta desde el perfil.';
