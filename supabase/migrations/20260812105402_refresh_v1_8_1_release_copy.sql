-- Refresh only the untouched canonical v1.8.1 entry. Organizations that
-- customized either field keep their user-authored release copy.
update public.changelog_entries
set title = 'Todo resulta más claro y fácil de usar',
    summary = 'Hemos cuidado el acceso, las personas, las novedades y los indicadores para que encuentres antes lo que necesitas.',
    updated_at = now()
where version = '1.8.1'
  and title = 'Una experiencia más clara y ágil'
  and summary = 'El acceso, la navegación, la creación de empresas, las notificaciones y las conexiones corporativas son ahora más sencillos y predecibles.';
