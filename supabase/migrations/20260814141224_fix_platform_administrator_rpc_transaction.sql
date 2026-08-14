alter function public.is_platform_administrator_v1_8_3_hotfix_1() volatile;

comment on function public.is_platform_administrator_v1_8_3_hotfix_1() is
  'Returns whether the authenticated profile can administer organization lifecycle operations. VOLATILE keeps PostgREST pre-request security checks in a read-write transaction.';

revoke all on function public.is_platform_administrator_v1_8_3_hotfix_1() from public, anon;
grant execute on function public.is_platform_administrator_v1_8_3_hotfix_1() to authenticated;
