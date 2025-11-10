-- Adds whatsapp column to payment_providers if it does not exist

alter table if exists public.payment_providers
  add column if not exists whatsapp text;
