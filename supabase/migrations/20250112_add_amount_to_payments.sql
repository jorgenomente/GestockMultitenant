begin;

alter table public.payments
  add column if not exists amount numeric(14,2) not null default 0;

commit;
