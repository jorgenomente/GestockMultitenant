-- Agrega campos para que los proveedores puedan marcar ítems de clientes como "pedido".
begin;

alter table if exists public.client_order_items
  add column if not exists ordered boolean not null default false;

alter table if exists public.client_order_items
  add column if not exists ordered_at timestamptz;

commit;
