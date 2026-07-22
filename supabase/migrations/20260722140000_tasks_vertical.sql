create type public.task_status as enum (
  'pending',
  'in_progress',
  'blocked',
  'in_review',
  'completed'
);

create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.task_event_kind as enum (
  'created',
  'updated',
  'assigned',
  'status',
  'comment',
  'dependency'
);

alter table public.tasks alter column status drop default;
alter table public.tasks
  alter column status type public.task_status
  using (
    case status::text
      when 'backlog' then 'pending'
      when 'active' then 'in_progress'
      when 'blocked' then 'blocked'
      when 'completed' then 'completed'
      else 'completed'
    end
  )::public.task_status;
alter table public.tasks alter column status set default 'pending';
alter table public.tasks
  add column priority public.task_priority not null default 'medium';

create table public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (task_id <> depends_on_task_id),
  unique (task_id, depends_on_task_id)
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_profile_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(body) between 2 and 1000),
  created_at timestamptz not null default now()
);

create table public.task_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  kind public.task_event_kind not null,
  from_status public.task_status,
  to_status public.task_status,
  note text not null check (char_length(note) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index task_dependencies_org_task_idx
  on public.task_dependencies (organization_id, task_id);
create index task_comments_org_task_idx
  on public.task_comments (organization_id, task_id, created_at desc);
create index task_events_org_task_idx
  on public.task_events (organization_id, task_id, created_at desc);
create index tasks_org_assignee_status_idx
  on public.tasks (organization_id, assignee_profile_id, status, due_date);

create or replace function private.prevent_task_dependency_cycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.task_id = new.depends_on_task_id then
    raise exception 'task cannot depend on itself';
  end if;

  if exists (
    with recursive dependency_path(task_id, depends_on_task_id) as (
      select dependency.task_id, dependency.depends_on_task_id
      from public.task_dependencies dependency
      where dependency.task_id = new.depends_on_task_id
      union
      select dependency.task_id, dependency.depends_on_task_id
      from public.task_dependencies dependency
      join dependency_path path on dependency.task_id = path.depends_on_task_id
    )
    select 1 from dependency_path where depends_on_task_id = new.task_id
  ) then
    raise exception 'task dependency cycle detected';
  end if;

  if not exists (
    select 1
    from public.tasks task
    join public.tasks dependency on dependency.id = new.depends_on_task_id
    where task.id = new.task_id
      and task.organization_id = new.organization_id
      and dependency.organization_id = new.organization_id
  ) then
    raise exception 'task dependencies must belong to the same organization';
  end if;

  return new;
end;
$$;

revoke all on function private.prevent_task_dependency_cycle()
from public, anon, authenticated;

create trigger prevent_task_dependency_cycle
before insert or update on public.task_dependencies
for each row execute function private.prevent_task_dependency_cycle();

create or replace function private.record_task_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.task_events (
    organization_id, task_id, actor_profile_id, kind,
    from_status, to_status, note
  ) values (
    new.organization_id, new.id, auth.uid(), 'created',
    null, new.status, 'Tarea creada.'
  );
  return new;
end;
$$;

create or replace function private.record_task_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.task_events (
    organization_id, task_id, actor_profile_id, kind,
    from_status, to_status, note
  ) values (
    new.organization_id,
    new.id,
    auth.uid(),
    case when old.assignee_profile_id is distinct from new.assignee_profile_id
      then 'assigned'::public.task_event_kind
      else 'updated'::public.task_event_kind
    end,
    old.status,
    new.status,
    case when old.assignee_profile_id is distinct from new.assignee_profile_id
      then 'Responsable actualizado.'
      else 'Datos de la tarea actualizados.'
    end
  );
  return new;
end;
$$;

create or replace function private.record_task_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.task_events (
    organization_id, task_id, actor_profile_id, kind, note
  ) values (
    new.organization_id, new.task_id, new.author_profile_id,
    'comment', 'Comentario añadido.'
  );
  return new;
end;
$$;

create or replace function private.record_task_dependency()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.task_events (
    organization_id, task_id, actor_profile_id, kind, note
  ) values (
    new.organization_id, new.task_id, new.created_by,
    'dependency', 'Dependencia añadida.'
  );
  return new;
end;
$$;

revoke all on function private.record_task_insert() from public, anon, authenticated;
revoke all on function private.record_task_update() from public, anon, authenticated;
revoke all on function private.record_task_comment() from public, anon, authenticated;
revoke all on function private.record_task_dependency() from public, anon, authenticated;

create trigger record_task_insert
after insert on public.tasks
for each row execute function private.record_task_insert();
create trigger record_task_update
after update of title, description, priority, assignee_profile_id, due_date
on public.tasks
for each row execute function private.record_task_update();
create trigger record_task_comment
after insert on public.task_comments
for each row execute function private.record_task_comment();
create trigger record_task_dependency
after insert on public.task_dependencies
for each row execute function private.record_task_dependency();

create or replace function public.transition_task(
  target_task_id uuid,
  target_status public.task_status,
  transition_note text,
  expected_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_task public.tasks%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if char_length(trim(transition_note)) not between 3 and 300 then
    raise exception 'transition note must contain between 3 and 300 characters';
  end if;
  if not private.has_permission(expected_organization_id, 'tasks.items.manage') then
    raise exception 'permission denied';
  end if;

  select * into current_task
  from public.tasks
  where id = target_task_id
    and organization_id = expected_organization_id
  for update;

  if current_task.id is null then
    raise exception 'task not found';
  end if;

  if not (
    (current_task.status = 'pending' and target_status in ('in_progress', 'blocked'))
    or (current_task.status = 'in_progress' and target_status in ('blocked', 'in_review'))
    or (current_task.status = 'blocked' and target_status = 'in_progress')
    or (current_task.status = 'in_review' and target_status in ('in_progress', 'completed'))
  ) then
    raise exception 'invalid task transition';
  end if;

  update public.tasks
  set status = target_status, updated_at = now()
  where id = current_task.id;

  insert into public.task_events (
    organization_id, task_id, actor_profile_id, kind,
    from_status, to_status, note
  ) values (
    current_task.organization_id, current_task.id, auth.uid(), 'status',
    current_task.status, target_status, trim(transition_note)
  );

  insert into public.audit_events (
    organization_id, actor_profile_id, event_type, entity_type,
    entity_id, metadata
  ) values (
    current_task.organization_id,
    auth.uid(),
    'task.transitioned',
    'task',
    current_task.id,
    jsonb_build_object(
      'from', current_task.status,
      'to', target_status
    )
  );
end;
$$;

revoke all on function public.transition_task(
  uuid, public.task_status, text, uuid
) from public, anon;
grant execute on function public.transition_task(
  uuid, public.task_status, text, uuid
) to authenticated;

alter table public.task_dependencies enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_events enable row level security;

create policy "members can read task dependencies"
on public.task_dependencies for select to authenticated
using (private.has_permission(organization_id, 'tasks.items.view'));
create policy "managers can manage task dependencies"
on public.task_dependencies for all to authenticated
using (private.has_permission(organization_id, 'tasks.items.manage'))
with check (private.has_permission(organization_id, 'tasks.items.manage'));

create policy "members can read task comments"
on public.task_comments for select to authenticated
using (private.has_permission(organization_id, 'tasks.items.view'));
create policy "managers can create task comments"
on public.task_comments for insert to authenticated
with check (
  author_profile_id = auth.uid()
  and private.has_permission(organization_id, 'tasks.items.manage')
);

create policy "members can read task events"
on public.task_events for select to authenticated
using (private.has_permission(organization_id, 'tasks.items.view'));

revoke all on table public.tasks from public, anon, authenticated;
grant select, insert on table public.tasks to authenticated;
grant update (title, description, priority, assignee_profile_id, due_date, updated_at)
on table public.tasks to authenticated;

revoke all on table
  public.task_dependencies,
  public.task_comments,
  public.task_events
from public, anon, authenticated;

grant select, insert on table public.task_dependencies to authenticated;
grant select, insert on table public.task_comments to authenticated;
grant select on table public.task_events to authenticated;
