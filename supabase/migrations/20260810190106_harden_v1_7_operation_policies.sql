drop policy if exists project_templates_manage on public.project_templates;
create policy project_templates_insert on public.project_templates
  for insert to authenticated
  with check (private.has_permission(organization_id, 'operations.automations.manage'));
create policy project_templates_update on public.project_templates
  for update to authenticated
  using (private.has_permission(organization_id, 'operations.automations.manage'))
  with check (private.has_permission(organization_id, 'operations.automations.manage'));
create policy project_templates_delete on public.project_templates
  for delete to authenticated
  using (private.has_permission(organization_id, 'operations.automations.manage'));

drop policy if exists task_recurrences_manage on public.task_recurrences;
create policy task_recurrences_insert on public.task_recurrences
  for insert to authenticated
  with check (private.has_permission(organization_id, 'operations.automations.manage'));
create policy task_recurrences_update on public.task_recurrences
  for update to authenticated
  using (private.has_permission(organization_id, 'operations.automations.manage'))
  with check (private.has_permission(organization_id, 'operations.automations.manage'));
create policy task_recurrences_delete on public.task_recurrences
  for delete to authenticated
  using (private.has_permission(organization_id, 'operations.automations.manage'));

drop policy if exists capacity_allocations_manage on public.capacity_allocations;
create policy capacity_allocations_insert on public.capacity_allocations
  for insert to authenticated
  with check (private.has_permission(organization_id, 'operations.capacity.manage'));
create policy capacity_allocations_update on public.capacity_allocations
  for update to authenticated
  using (private.has_permission(organization_id, 'operations.capacity.manage'))
  with check (private.has_permission(organization_id, 'operations.capacity.manage'));
create policy capacity_allocations_delete on public.capacity_allocations
  for delete to authenticated
  using (private.has_permission(organization_id, 'operations.capacity.manage'));
