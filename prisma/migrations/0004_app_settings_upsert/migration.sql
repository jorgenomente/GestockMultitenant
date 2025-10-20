-- Ensure specialized upsert helpers for app_settings
create or replace function public.app_settings_upsert_global(
  p_tenant_id uuid,
  p_key text,
  p_value jsonb
) returns public.app_settings
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.app_settings (tenant_id, branch_id, key, value)
  values (p_tenant_id, null, p_key, p_value)
  on conflict (tenant_id, key) where (branch_id is null)
  do update set
    value = excluded.value,
    updated_at = timezone('utc', now())
  returning *;
$$;

create or replace function public.app_settings_upsert_branch(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_key text,
  p_value jsonb
) returns public.app_settings
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.app_settings (tenant_id, branch_id, key, value)
  values (p_tenant_id, p_branch_id, p_key, p_value)
  on conflict (tenant_id, branch_id, key) where (branch_id is not null)
  do update set
    value = excluded.value,
    updated_at = timezone('utc', now())
  returning *;
$$;
