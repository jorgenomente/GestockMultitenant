-- Depo module: groups + items with RLS per branch
begin;

create table if not exists public.depo_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  slug text not null,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists depo_groups_branch_slug_uk
  on public.depo_groups (branch_id, lower(slug));

create index if not exists depo_groups_tenant_branch_idx
  on public.depo_groups (tenant_id, branch_id);

create index if not exists depo_groups_tenant_idx
  on public.depo_groups (tenant_id);

drop trigger if exists depo_groups_set_updated_at on public.depo_groups;
create trigger depo_groups_set_updated_at
  before update on public.depo_groups
  for each row
  execute function public.set_updated_at();

create table if not exists public.depo_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  group_id uuid not null references public.depo_groups(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity numeric(12,3) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_name text,
  updated_by_email text
);

create unique index if not exists depo_items_group_product_uk
  on public.depo_items (group_id, product_id);

create index if not exists depo_items_group_idx
  on public.depo_items (group_id);

create index if not exists depo_items_tenant_branch_idx
  on public.depo_items (tenant_id, branch_id);

drop trigger if exists depo_items_set_updated_at on public.depo_items;
create trigger depo_items_set_updated_at
  before update on public.depo_items
  for each row
  execute function public.set_updated_at();

alter table public.depo_groups enable row level security;
alter table public.depo_items enable row level security;

-- Ensure helper exists
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'has_access_to_branch') then
    raise exception 'Falta la función has_access_to_branch(tenant uuid, branch uuid, user uuid)';
  end if;
end $$;

-- depo_groups policies ------------------------------------------------------

drop policy if exists depo_groups_select_policy on public.depo_groups;
create policy depo_groups_select_policy
  on public.depo_groups
  for select
  using (
    auth.role() = 'service_role'
    or (auth.uid() is not null
        and has_access_to_branch(depo_groups.tenant_id, depo_groups.branch_id, auth.uid()))
  );

-- allow insert/update/delete to any member with branch access

drop policy if exists depo_groups_insert_policy on public.depo_groups;
create policy depo_groups_insert_policy
  on public.depo_groups
  for insert
  with check (
    auth.uid() is not null
    and has_access_to_branch(depo_groups.tenant_id, depo_groups.branch_id, auth.uid())
  );

drop policy if exists depo_groups_update_policy on public.depo_groups;
create policy depo_groups_update_policy
  on public.depo_groups
  for update
  using (
    auth.role() = 'service_role'
    or (auth.uid() is not null
        and has_access_to_branch(depo_groups.tenant_id, depo_groups.branch_id, auth.uid()))
  )
  with check (
    auth.uid() is not null
    and has_access_to_branch(depo_groups.tenant_id, depo_groups.branch_id, auth.uid())
  );

drop policy if exists depo_groups_delete_policy on public.depo_groups;
create policy depo_groups_delete_policy
  on public.depo_groups
  for delete
  using (
    auth.role() = 'service_role'
    or (auth.uid() is not null
        and has_access_to_branch(depo_groups.tenant_id, depo_groups.branch_id, auth.uid()))
  );

-- depo_items policies -------------------------------------------------------

drop policy if exists depo_items_select_policy on public.depo_items;
create policy depo_items_select_policy
  on public.depo_items
  for select
  using (
    auth.role() = 'service_role'
    or (auth.uid() is not null
        and has_access_to_branch(depo_items.tenant_id, depo_items.branch_id, auth.uid()))
  );

drop policy if exists depo_items_insert_policy on public.depo_items;
create policy depo_items_insert_policy
  on public.depo_items
  for insert
  with check (
    auth.uid() is not null
    and has_access_to_branch(depo_items.tenant_id, depo_items.branch_id, auth.uid())
    and exists (
      select 1 from public.depo_groups g
      where g.id = depo_items.group_id
        and g.tenant_id = depo_items.tenant_id
        and g.branch_id = depo_items.branch_id
    )
    and exists (
      select 1 from public.products p
      where p.id = depo_items.product_id
        and p.tenant_id = depo_items.tenant_id
        and p.branch_id = depo_items.branch_id
    )
  );

drop policy if exists depo_items_update_policy on public.depo_items;
create policy depo_items_update_policy
  on public.depo_items
  for update
  using (
    auth.role() = 'service_role'
    or (auth.uid() is not null
        and has_access_to_branch(depo_items.tenant_id, depo_items.branch_id, auth.uid()))
  )
  with check (
    auth.uid() is not null
    and has_access_to_branch(depo_items.tenant_id, depo_items.branch_id, auth.uid())
    and exists (
      select 1 from public.depo_groups g
      where g.id = depo_items.group_id
        and g.tenant_id = depo_items.tenant_id
        and g.branch_id = depo_items.branch_id
    )
    and exists (
      select 1 from public.products p
      where p.id = depo_items.product_id
        and p.tenant_id = depo_items.tenant_id
        and p.branch_id = depo_items.branch_id
    )
  );

drop policy if exists depo_items_delete_policy on public.depo_items;
create policy depo_items_delete_policy
  on public.depo_items
  for delete
  using (
    auth.role() = 'service_role'
    or (auth.uid() is not null
        and has_access_to_branch(depo_items.tenant_id, depo_items.branch_id, auth.uid()))
  );

commit;
