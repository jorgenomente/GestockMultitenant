-- supabase/migrations/20250112_add_payments_tables.sql
-- Tablas básicas para el módulo de Pagos. Ajustá según tus necesidades finales.

begin;

--- Enumeraciones -----------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_type t where t.typname = 'payment_method'
  ) then
    create type public.payment_method as enum ('EFECTIVO', 'TRANSFERENCIA', 'ECHEQ');
  end if;
end
$$;

--- Tabla: payment_providers ------------------------------------------------

create table if not exists public.payment_providers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  name text not null,
  alias text,
  whatsapp text,
  payment_terms text,
  payment_day text,
  contact_info text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists payment_providers_tenant_branch_idx
  on public.payment_providers (tenant_id, branch_id, lower(name));

drop trigger if exists payment_providers_set_updated_at on public.payment_providers;
create trigger payment_providers_set_updated_at
  before update on public.payment_providers
  for each row
  execute function public.set_updated_at();

--- Tabla: payments ---------------------------------------------------------

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  payment_date date not null,
  invoice_number text not null,
  provider_name text not null,
  payment_method public.payment_method not null,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists payments_tenant_branch_date_idx
  on public.payments (tenant_id, branch_id, payment_date desc, created_at desc);

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row
  execute function public.set_updated_at();

--- RLS --------------------------------------------------------------------

alter table public.payment_providers enable row level security;
alter table public.payments enable row level security;

-- Políticas básicas: cada usuario autenticado sólo ve registros de branches
-- asociados a su tenant y sucursales asignadas. Ajustá las funciones helpers
-- a tus helpers reales (por ej. has_access_to_branch) si ya existen.

do $$
begin
  if not exists (
    select 1 from pg_proc where proname = 'has_access_to_branch'
  ) then
    raise notice 'Definí la función has_access_to_branch(tenant uuid, branch uuid, user uuid) antes de habilitar estas políticas.';
  end if;
end
$$;

drop policy if exists payment_providers_select_policy on public.payment_providers;
create policy payment_providers_select_policy
  on public.payment_providers
  for select
  using (
    auth.role() = 'service_role'
    or (auth.uid() is not null
        and has_access_to_branch(payment_providers.tenant_id, payment_providers.branch_id, auth.uid()))
  );

drop policy if exists payment_providers_insert_policy on public.payment_providers;
create policy payment_providers_insert_policy
  on public.payment_providers
  for insert
  with check (
    auth.uid() is not null
    and has_access_to_branch(payment_providers.tenant_id, payment_providers.branch_id, auth.uid())
  );

drop policy if exists payments_select_policy on public.payments;
create policy payments_select_policy
  on public.payments
  for select
  using (
    auth.role() = 'service_role'
    or (auth.uid() is not null
        and has_access_to_branch(payments.tenant_id, payments.branch_id, auth.uid()))
  );

drop policy if exists payments_insert_policy on public.payments;
create policy payments_insert_policy
  on public.payments
  for insert
  with check (
    auth.uid() is not null
    and has_access_to_branch(payments.tenant_id, payments.branch_id, auth.uid())
  );

-- Provider linkage and stricter policies

alter table public.payments
  add column if not exists provider_id uuid references public.payment_providers(id) on delete restrict;

alter table public.payments
  alter column provider_id set not null;

create index if not exists payments_provider_idx
  on public.payments (provider_id);

drop policy if exists payments_select_policy on public.payments;
create policy payments_select_policy
  on public.payments
  for select
  using (
    auth.role() = 'service_role'
    or (auth.uid() is not null
        and has_access_to_branch(payments.tenant_id, payments.branch_id, auth.uid()))
  );

drop policy if exists payments_insert_policy on public.payments;
create policy payments_insert_policy
  on public.payments
  for insert
  with check (
    auth.uid() is not null
    and has_access_to_branch(payments.tenant_id, payments.branch_id, auth.uid())
    and exists (
      select 1
      from public.payment_providers prov
      where prov.id = payments.provider_id
        and prov.tenant_id = payments.tenant_id
        and prov.branch_id = payments.branch_id
    )
  );

-- Amount column

alter table public.payments
  add column if not exists amount numeric(14,2) not null default 0;

commit;
