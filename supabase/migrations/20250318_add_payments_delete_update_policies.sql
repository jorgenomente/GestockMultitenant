-- Habilita operaciones de update/delete para payment_providers y payments bajo las mismas reglas de acceso.
begin;

-- payment_providers policies ------------------------------------------------

drop policy if exists payment_providers_update_policy on public.payment_providers;
drop policy if exists payment_providers_delete_policy on public.payment_providers;

create policy payment_providers_update_policy
  on public.payment_providers
  for update
  using (
    auth.role() = 'service_role'
    or (auth.uid() is not null
        and has_access_to_branch(payment_providers.tenant_id, payment_providers.branch_id, auth.uid()))
  )
  with check (
    auth.uid() is not null
    and has_access_to_branch(payment_providers.tenant_id, payment_providers.branch_id, auth.uid())
  );

create policy payment_providers_delete_policy
  on public.payment_providers
  for delete
  using (
    auth.role() = 'service_role'
    or (auth.uid() is not null
        and has_access_to_branch(payment_providers.tenant_id, payment_providers.branch_id, auth.uid()))
  );

-- payments policies ---------------------------------------------------------

drop policy if exists payments_update_policy on public.payments;
drop policy if exists payments_delete_policy on public.payments;

create policy payments_update_policy
  on public.payments
  for update
  using (
    auth.role() = 'service_role'
    or (auth.uid() is not null
        and has_access_to_branch(payments.tenant_id, payments.branch_id, auth.uid()))
  )
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

create policy payments_delete_policy
  on public.payments
  for delete
  using (
    auth.role() = 'service_role'
    or (auth.uid() is not null
        and has_access_to_branch(payments.tenant_id, payments.branch_id, auth.uid()))
  );

commit;
