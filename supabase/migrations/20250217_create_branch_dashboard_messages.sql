-- Create table for branch dashboard messages
create table if not exists public.branch_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text,
  message text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists branch_messages_tenant_branch_idx
  on public.branch_messages (tenant_id, branch_id, created_at desc);

create index if not exists branch_messages_branch_idx
  on public.branch_messages (branch_id);

create index if not exists branch_messages_tenant_idx
  on public.branch_messages (tenant_id);
