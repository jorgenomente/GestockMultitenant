-- Agrega provider_id a la tabla payments y refuerza RLS
begin;

alter table public.payments
  add column if not exists provider_id uuid references public.payment_providers(id) on delete restrict;

alter table public.payments
  alter column provider_id set not null;

create index if not exists payments_provider_idx
  on public.payments (provider_id);

drop policy if exists payments_insert_policy on public.payments;
drop policy if exists payments_select_policy on public.payments;

create policy payments_select_policy
  on public.payments
  for select
  using (
    auth.role() = 'service_role'
    or (auth.uid() is not null
        and has_access_to_branch(payments.tenant_id, payments.branch_id, auth.uid()))
  );

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

commit;
