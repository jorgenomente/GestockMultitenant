-- 0003_stock_log

CREATE TABLE IF NOT EXISTS public.stock_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL,
  stock_prev NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_in NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_out NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_applied NUMERIC(12,2) NOT NULL DEFAULT 0,
  sales_since NUMERIC(12,2) NOT NULL DEFAULT 0,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  committed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  tenant_id UUID,
  branch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS stock_logs_item_idx ON public.stock_logs(order_item_id);
CREATE INDEX IF NOT EXISTS stock_logs_tenant_branch_idx ON public.stock_logs(tenant_id, branch_id);

ALTER TABLE public.stock_logs
  ADD CONSTRAINT stock_logs_order_item_fkey
  FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;

