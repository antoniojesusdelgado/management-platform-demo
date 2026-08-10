create extension if not exists supabase_vault with schema vault;

alter table public.module_settings drop constraint if exists module_settings_module_id_check;
alter table public.module_settings add constraint module_settings_module_id_check check (
  module_id in ('inicio','vacaciones','analitica','proyectos','tareas','incidencias','tesoreria','nominas','personal','operaciones','novedades','configuracion')
);

insert into public.permissions (code, description) values
  ('operations.automations.view', 'Consultar automatizaciones, plantillas y recurrencias'),
  ('operations.automations.manage', 'Administrar automatizaciones, plantillas y recurrencias'),
  ('operations.capacity.view', 'Consultar la planificación de capacidad'),
  ('operations.capacity.manage', 'Administrar asignaciones de capacidad'),
  ('operations.notifications.view', 'Consultar notificaciones operativas propias'),
  ('operations.notifications.manage', 'Administrar notificaciones operativas')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission on permission.code in (
  'operations.automations.view','operations.capacity.view','operations.notifications.view'
)
where role.code in ('admin','manager','collaborator','viewer')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission on permission.code in (
  'operations.automations.manage','operations.capacity.manage','operations.notifications.manage'
)
where role.code in ('admin','manager')
on conflict do nothing;

create table public.workspace_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('google_workspace','microsoft_365')),
  status text not null default 'connected' check (status in ('connected','expired','revoked')),
  capabilities text[] not null default '{}',
  account_label text not null check (char_length(account_label) between 2 and 120),
  token_secret_id uuid,
  token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, provider),
  check (capabilities <@ array['files','spreadsheets','mail','calendar']::text[])
);

create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 100),
  trigger_code text not null check (trigger_code in ('task_assigned','task_due','task_status_changed','leave_submitted','leave_approved','incident_sla_risk','scheduled_report')),
  action_code text not null check (action_code in ('create_task','notify','prepare_export','prepare_email','prepare_calendar_event')),
  condition_config jsonb not null default '{}'::jsonb check (
    jsonb_typeof(condition_config) = 'object'
    and condition_config - 'field' - 'operator' - 'value' = '{}'::jsonb
    and (
      condition_config = '{}'::jsonb
      or (
        condition_config ?& array['field','operator','value']
        and jsonb_typeof(condition_config->'field') = 'string'
        and jsonb_typeof(condition_config->'operator') = 'string'
        and jsonb_typeof(condition_config->'value') = 'string'
        and
        condition_config->>'field' in ('priority','status','team','due_window')
        and condition_config->>'operator' in ('equals','in','before')
        and char_length(condition_config->>'value') between 1 and 80
      )
    )
  ),
  enabled boolean not null default true,
  created_by uuid not null references public.profiles(id),
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  status text not null check (status in ('succeeded','failed','skipped')),
  summary text not null check (char_length(summary) between 3 and 240),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create table public.project_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 100),
  description text not null check (char_length(description) between 3 and 500),
  duration_days integer not null check (duration_days between 1 and 365),
  tasks jsonb not null default '[]'::jsonb check (jsonb_typeof(tasks) = 'array'),
  role_codes text[] not null default '{}',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.task_recurrences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 100),
  frequency text not null check (frequency in ('daily','weekly','monthly')),
  next_run_date date not null,
  last_run_date date,
  enabled boolean not null default true,
  source_template_id uuid references public.project_templates(id) on delete set null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  ,check (last_run_date is null or last_run_date < next_run_date)
);

create table public.capacity_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  week_start date not null,
  allocated_hours numeric(5,2) not null check (allocated_hours between 0 and 80),
  available_hours numeric(5,2) not null default 40 check (available_hours between 0 and 80),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, person_id, project_id, week_start)
);

create table public.operational_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  description text not null default '' check (char_length(description) <= 240),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  status text not null default 'unread' check (status in ('unread','read','dismissed')),
  source text not null check (source in ('assignment','review','deadline','automation','mention')),
  href text not null check (href ~ '^/app/[a-z0-9?=&_-]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 120),
  module_id text not null check (module_id ~ '^[a-z][a-z0-9_-]{1,39}$'),
  target text not null check (target in ('csv','xlsx','google_sheets','microsoft_excel')),
  status text not null default 'pending' check (status in ('pending','ready','failed','cancelled')),
  row_count integer not null default 0 check (row_count between 0 and 25000),
  filter_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(filter_snapshot) = 'object'),
  external_url text,
  error_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workspace_connections_org_profile_idx on public.workspace_connections (organization_id, profile_id);
create index automation_rules_org_enabled_idx on public.automation_rules (organization_id, enabled);
create index automation_rules_created_by_idx on public.automation_rules (created_by);
create index automation_runs_rule_created_idx on public.automation_runs (rule_id, created_at desc);
create index project_templates_org_idx on public.project_templates (organization_id);
create index project_templates_created_by_idx on public.project_templates (created_by);
create index task_recurrences_due_idx on public.task_recurrences (organization_id, enabled, next_run_date);
create index task_recurrences_created_by_idx on public.task_recurrences (created_by);
create index task_recurrences_source_template_idx on public.task_recurrences (source_template_id);
create index capacity_allocations_week_idx on public.capacity_allocations (organization_id, week_start, person_id);
create index capacity_allocations_person_idx on public.capacity_allocations (person_id);
create index capacity_allocations_project_idx on public.capacity_allocations (project_id);
create index capacity_allocations_created_by_idx on public.capacity_allocations (created_by);
create index operational_notifications_recipient_idx on public.operational_notifications (recipient_profile_id, status, created_at desc);
create index operational_notifications_org_idx on public.operational_notifications (organization_id);
create index export_jobs_profile_idx on public.export_jobs (profile_id, created_at desc);
create index export_jobs_org_idx on public.export_jobs (organization_id);

alter table public.workspace_connections enable row level security;
alter table public.automation_rules enable row level security;
alter table public.automation_runs enable row level security;
alter table public.project_templates enable row level security;
alter table public.task_recurrences enable row level security;
alter table public.capacity_allocations enable row level security;
alter table public.operational_notifications enable row level security;
alter table public.export_jobs enable row level security;

create policy workspace_connections_owner_select on public.workspace_connections for select to authenticated
using (profile_id = (select auth.uid()) and private.is_org_member(organization_id));
create policy workspace_connections_owner_delete on public.workspace_connections for delete to authenticated
using (profile_id = (select auth.uid()) and private.is_org_member(organization_id));

create policy automation_rules_view on public.automation_rules for select to authenticated using (private.has_permission(organization_id, 'operations.automations.view'));
create policy automation_rules_insert on public.automation_rules for insert to authenticated with check (created_by = (select auth.uid()) and private.has_permission(organization_id, 'operations.automations.manage'));
create policy automation_rules_update on public.automation_rules for update to authenticated using (private.has_permission(organization_id, 'operations.automations.manage')) with check (private.has_permission(organization_id, 'operations.automations.manage'));
create policy automation_runs_view on public.automation_runs for select to authenticated using (private.has_permission(organization_id, 'operations.automations.view'));
create policy automation_runs_insert on public.automation_runs for insert to authenticated with check (private.has_permission(organization_id, 'operations.automations.manage'));
create policy project_templates_view on public.project_templates for select to authenticated using (private.has_permission(organization_id, 'operations.automations.view'));
create policy project_templates_manage on public.project_templates for all to authenticated using (private.has_permission(organization_id, 'operations.automations.manage')) with check (private.has_permission(organization_id, 'operations.automations.manage'));
create policy task_recurrences_view on public.task_recurrences for select to authenticated using (private.has_permission(organization_id, 'operations.automations.view'));
create policy task_recurrences_manage on public.task_recurrences for all to authenticated using (private.has_permission(organization_id, 'operations.automations.manage')) with check (private.has_permission(organization_id, 'operations.automations.manage'));
create policy capacity_allocations_view on public.capacity_allocations for select to authenticated using (private.has_permission(organization_id, 'operations.capacity.view'));
create policy capacity_allocations_manage on public.capacity_allocations for all to authenticated using (private.has_permission(organization_id, 'operations.capacity.manage')) with check (private.has_permission(organization_id, 'operations.capacity.manage'));
create policy operational_notifications_owner_select on public.operational_notifications for select to authenticated using (recipient_profile_id = (select auth.uid()) and private.has_permission(organization_id, 'operations.notifications.view'));
create policy operational_notifications_owner_update on public.operational_notifications for update to authenticated using (recipient_profile_id = (select auth.uid()) and private.has_permission(organization_id, 'operations.notifications.view')) with check (recipient_profile_id = (select auth.uid()) and private.has_permission(organization_id, 'operations.notifications.view'));
create policy operational_notifications_manage_insert on public.operational_notifications for insert to authenticated with check (private.has_permission(organization_id, 'operations.notifications.manage'));
create policy export_jobs_owner_select on public.export_jobs for select to authenticated using (profile_id = (select auth.uid()) and private.has_permission(organization_id, 'analytics.dashboards.export'));
create policy export_jobs_owner_insert on public.export_jobs for insert to authenticated with check (profile_id = (select auth.uid()) and private.has_permission(organization_id, 'analytics.dashboards.export'));
create policy export_jobs_owner_update on public.export_jobs for update to authenticated using (profile_id = (select auth.uid()) and private.has_permission(organization_id, 'analytics.dashboards.export')) with check (profile_id = (select auth.uid()) and private.has_permission(organization_id, 'analytics.dashboards.export'));

grant select, delete on public.workspace_connections to authenticated;
grant select, insert, update on public.automation_rules, public.automation_runs to authenticated;
grant select, insert, update, delete on public.project_templates, public.task_recurrences, public.capacity_allocations to authenticated;
grant select, insert, update on public.operational_notifications, public.export_jobs to authenticated;

create or replace function private.save_workspace_connection_secret(
  expected_organization_id uuid,
  expected_profile_id uuid,
  target_provider text,
  target_account_label text,
  target_capabilities text[],
  target_access_token text,
  target_refresh_token text,
  target_expires_at timestamptz
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  existing_secret_id uuid;
  stored_secret_id uuid;
  connection_id uuid;
  secret_payload text;
begin
  if (select auth.uid()) is null or (select auth.uid()) <> expected_profile_id or not private.is_org_member(expected_organization_id) then
    raise exception 'permission denied';
  end if;
  if target_provider not in ('google_workspace','microsoft_365') or char_length(target_access_token) < 8 then
    raise exception 'invalid provider token';
  end if;
  select token_secret_id into existing_secret_id from public.workspace_connections
  where profile_id = expected_profile_id and provider = target_provider;
  secret_payload := jsonb_build_object('access_token', target_access_token, 'refresh_token', nullif(target_refresh_token, ''), 'expires_at', target_expires_at)::text;
  if existing_secret_id is null then
    stored_secret_id := vault.create_secret(secret_payload, 'workspace-' || expected_profile_id::text || '-' || target_provider, 'OAuth token for an isolated workspace connection');
  else
    perform vault.update_secret(existing_secret_id, secret_payload);
    stored_secret_id := existing_secret_id;
  end if;
  insert into public.workspace_connections (organization_id, profile_id, provider, status, capabilities, account_label, token_secret_id, token_expires_at)
  values (expected_organization_id, expected_profile_id, target_provider, 'connected', target_capabilities, target_account_label, stored_secret_id, target_expires_at)
  on conflict (profile_id, provider) do update set organization_id = excluded.organization_id, status = 'connected', capabilities = excluded.capabilities, account_label = excluded.account_label, token_secret_id = excluded.token_secret_id, token_expires_at = excluded.token_expires_at, connected_at = now(), updated_at = now()
  returning id into connection_id;
  return connection_id;
end;
$$;

create or replace function public.save_workspace_connection(
  expected_organization_id uuid, expected_profile_id uuid, target_provider text,
  target_account_label text, target_capabilities text[], target_access_token text,
  target_refresh_token text, target_expires_at timestamptz
) returns uuid language sql security invoker set search_path = '' as $$
  select private.save_workspace_connection_secret(expected_organization_id, expected_profile_id, target_provider, target_account_label, target_capabilities, target_access_token, target_refresh_token, target_expires_at);
$$;
revoke all on function private.save_workspace_connection_secret(uuid,uuid,text,text,text[],text,text,timestamptz) from public, anon, authenticated;
grant execute on function private.save_workspace_connection_secret(uuid,uuid,text,text,text[],text,text,timestamptz) to authenticated;
revoke all on function public.save_workspace_connection(uuid,uuid,text,text,text[],text,text,timestamptz) from public, anon;
grant execute on function public.save_workspace_connection(uuid,uuid,text,text,text[],text,text,timestamptz) to authenticated;

create or replace function public.get_workspace_connection_secret(target_connection_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare payload jsonb;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then raise exception 'permission denied'; end if;
  select secret.decrypted_secret::jsonb into payload
  from public.workspace_connections connection
  join vault.decrypted_secrets secret on secret.id = connection.token_secret_id
  where connection.id = target_connection_id;
  return payload;
end;
$$;
revoke all on function public.get_workspace_connection_secret(uuid) from public, anon, authenticated;
grant execute on function public.get_workspace_connection_secret(uuid) to service_role;

create or replace function private.disconnect_workspace_connection_secret(
  expected_organization_id uuid, expected_profile_id uuid, target_provider text
) returns void language plpgsql security definer set search_path = '' as $$
declare stored_secret_id uuid;
begin
  if (select auth.uid()) is null or (select auth.uid()) <> expected_profile_id or not private.is_org_member(expected_organization_id) then raise exception 'permission denied'; end if;
  delete from public.workspace_connections
  where organization_id = expected_organization_id and profile_id = expected_profile_id and provider = target_provider
  returning token_secret_id into stored_secret_id;
  if stored_secret_id is not null then delete from vault.secrets where id = stored_secret_id; end if;
end;
$$;
create or replace function public.disconnect_workspace_connection(
  expected_organization_id uuid, expected_profile_id uuid, target_provider text
) returns void language sql security invoker set search_path = '' as $$
  select private.disconnect_workspace_connection_secret(expected_organization_id, expected_profile_id, target_provider);
$$;
revoke all on function private.disconnect_workspace_connection_secret(uuid,uuid,text) from public, anon, authenticated;
grant execute on function private.disconnect_workspace_connection_secret(uuid,uuid,text) to authenticated;
revoke all on function public.disconnect_workspace_connection(uuid,uuid,text) from public, anon;
grant execute on function public.disconnect_workspace_connection(uuid,uuid,text) to authenticated;

create or replace function private.process_due_recurrences(target_date date default current_date)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  recurrence record;
  processed_count integer := 0;
  next_date date;
begin
  for recurrence in
    select * from public.task_recurrences
    where enabled and next_run_date <= target_date
    order by next_run_date, id
    for update skip locked
  loop
    next_date := case recurrence.frequency
      when 'daily' then recurrence.next_run_date + 1
      when 'weekly' then recurrence.next_run_date + 7
      else (recurrence.next_run_date + interval '1 month')::date
    end;
    if recurrence.source_template_id is null then
      insert into public.export_jobs (
        id, organization_id, profile_id, name, module_id, target, status,
        row_count, filter_snapshot
      ) values (
        private.demo_uuid(recurrence.organization_id, 'v1-7-recurring-export-' || recurrence.id::text || '-' || recurrence.next_run_date::text, 1),
        recurrence.organization_id, recurrence.created_by, recurrence.name,
        'analitica', 'xlsx', 'ready', 0,
        jsonb_build_object('source', 'recurrence', 'period', recurrence.next_run_date)
      ) on conflict (id) do nothing;
    end if;
    insert into public.operational_notifications (
      id, organization_id, recipient_profile_id, title, description,
      priority, status, source, href
    ) values (
      private.demo_uuid(recurrence.organization_id, 'v1-7-recurrence-notification-' || recurrence.id::text || '-' || recurrence.next_run_date::text, 1),
      recurrence.organization_id, recurrence.created_by,
      'Trabajo recurrente preparado', recurrence.name,
      'medium', 'unread', 'automation', '/app/operaciones'
    ) on conflict (id) do nothing;
    update public.task_recurrences
      set last_run_date = recurrence.next_run_date,
          next_run_date = next_date,
          updated_at = now()
      where id = recurrence.id;
    processed_count := processed_count + 1;
  end loop;
  return processed_count;
end;
$$;
revoke all on function private.process_due_recurrences(date) from public, anon, authenticated;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'daily-v1-7-recurrences';
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule('daily-v1-7-recurrences', '20 3 * * *', 'select private.process_due_recurrences();');
end;
$$;

create or replace function private.seed_v1_7_operations(target_organization_id uuid, actor_profile_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare first_person uuid; second_person uuid; first_project uuid;
begin
  select id into first_person from public.people where organization_id = target_organization_id and status = 'active' order by display_name limit 1;
  select id into second_person from public.people where organization_id = target_organization_id and status = 'active' order by display_name offset 1 limit 1;
  select id into first_project from public.projects where organization_id = target_organization_id and status = 'active' order by code limit 1;
  insert into public.automation_rules (id,organization_id,name,trigger_code,action_code,condition_config,enabled,created_by,last_run_at) values
    (private.demo_uuid(target_organization_id,'v1-7-rule',1),target_organization_id,'Avisar antes de incumplir un SLA','incident_sla_risk','notify','{"field":"priority","operator":"in","value":"high,critical"}'::jsonb,true,actor_profile_id,now()),
    (private.demo_uuid(target_organization_id,'v1-7-rule',2),target_organization_id,'Preparar el informe semanal','scheduled_report','prepare_export','{}'::jsonb,true,actor_profile_id,null),
    (private.demo_uuid(target_organization_id,'v1-7-rule',3),target_organization_id,'Preparar cobertura tras una aprobación','leave_approved','create_task','{"field":"team","operator":"equals","value":"Operaciones"}'::jsonb,false,actor_profile_id,null)
  on conflict (id) do nothing;
  insert into public.project_templates (id,organization_id,name,description,duration_days,tasks,role_codes,created_by) values
    (private.demo_uuid(target_organization_id,'v1-7-template',1),target_organization_id,'Proyecto de consultoría','Descubrimiento, propuesta, ejecución, validación y cierre.',45,'[{"title":"Descubrimiento"},{"title":"Propuesta"},{"title":"Ejecución"},{"title":"Validación"},{"title":"Cierre"}]'::jsonb,array['manager','collaborator'],actor_profile_id),
    (private.demo_uuid(target_organization_id,'v1-7-template',2),target_organization_id,'Incorporación de una persona','Accesos, documentación, acompañamiento y revisión inicial.',30,'[{"title":"Preparar accesos"},{"title":"Revisar documentación"},{"title":"Acompañamiento inicial"}]'::jsonb,array['manager','collaborator'],actor_profile_id)
  on conflict (id) do nothing;
  insert into public.task_recurrences (id,organization_id,name,frequency,next_run_date,created_by) values
    (private.demo_uuid(target_organization_id,'v1-7-recurrence',1),target_organization_id,'Informe de seguimiento','weekly',current_date + 7,actor_profile_id),
    (private.demo_uuid(target_organization_id,'v1-7-recurrence',2),target_organization_id,'Revisión de cierre','monthly',(date_trunc('month',current_date) + interval '1 month')::date,actor_profile_id)
  on conflict (id) do nothing;
  if first_person is not null and first_project is not null then
    insert into public.capacity_allocations (id,organization_id,person_id,project_id,week_start,allocated_hours,available_hours,created_by) values
      (private.demo_uuid(target_organization_id,'v1-7-capacity',1),target_organization_id,first_person,first_project,date_trunc('week',current_date)::date,32,40,actor_profile_id)
    on conflict (id) do nothing;
  end if;
  if second_person is not null and first_project is not null then
    insert into public.capacity_allocations (id,organization_id,person_id,project_id,week_start,allocated_hours,available_hours,created_by) values
      (private.demo_uuid(target_organization_id,'v1-7-capacity',2),target_organization_id,second_person,first_project,date_trunc('week',current_date)::date,44,40,actor_profile_id)
    on conflict (id) do nothing;
  end if;
  insert into public.operational_notifications (id,organization_id,recipient_profile_id,title,description,priority,status,source,href) values
    (private.demo_uuid(target_organization_id,'v1-7-notification',1),target_organization_id,actor_profile_id,'Incidencia próxima a su objetivo','Revisa la prioridad y confirma el siguiente paso.','critical','unread','automation','/app/incidencias'),
    (private.demo_uuid(target_organization_id,'v1-7-notification',2),target_organization_id,actor_profile_id,'Informe semanal preparado','La exportación está lista para que confirmes el destino.','medium','unread','review','/app/operaciones')
  on conflict (id) do nothing;
  insert into public.export_jobs (id,organization_id,profile_id,name,module_id,target,status,row_count) values
    (private.demo_uuid(target_organization_id,'v1-7-export',1),target_organization_id,actor_profile_id,'Seguimiento semanal','analitica','xlsx','ready',48)
  on conflict (id) do nothing;
  insert into public.module_settings (organization_id,module_id,enabled,sort_order) values (target_organization_id,'operaciones',true,9)
  on conflict (organization_id,module_id) do update set enabled = true;
  insert into public.changelog_entries (id,organization_id,version,title,summary,status,published_at,created_by,created_at,updated_at)
  values (private.demo_uuid(target_organization_id,'changelog-v7-release',9),target_organization_id,'1.7.0','Menos tareas repetitivas, más control','Automatizaciones, plantillas, planificación de capacidad e informes conectados reúnen el trabajo operativo en un mismo lugar.','published',timestamptz '2026-08-10 16:00:00+00',actor_profile_id,timestamptz '2026-08-10 16:00:00+00',timestamptz '2026-08-10 16:00:00+00')
  on conflict (organization_id,version) do nothing;
end;
$$;
revoke all on function private.seed_v1_7_operations(uuid,uuid) from public, anon, authenticated;

do $$ declare pending record; begin
  for pending in select organization.id organization_id, (select membership.profile_id from public.memberships membership where membership.organization_id=organization.id and membership.status='active' order by membership.id limit 1) actor_profile_id from public.organizations organization loop
    if pending.actor_profile_id is not null then perform private.seed_v1_7_operations(pending.organization_id,pending.actor_profile_id); end if;
  end loop;
end $$;

update public.profiles
set notification_preferences = coalesce(notification_preferences, '{}'::jsonb) ||
  '{"mentions":true,"automations":true,"exports":true}'::jsonb;

alter default privileges for role postgres in schema public revoke execute on functions from public;
