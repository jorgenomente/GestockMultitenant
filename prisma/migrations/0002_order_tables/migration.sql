-- 0002_order_tables
-- Tablas base para pedidos de proveedores y estado persistente

-- Helper para actualizar la columna updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Pedidos de proveedores
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDIENTE',
  notes TEXT,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  tenant_id UUID,
  branch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS orders_provider_id_idx ON public.orders(provider_id);
CREATE INDEX IF NOT EXISTS orders_tenant_branch_idx ON public.orders(tenant_id, branch_id);

DROP TRIGGER IF EXISTS set_timestamp_orders ON public.orders;
CREATE TRIGGER set_timestamp_orders
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ítems de cada pedido
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  display_name TEXT,
  qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  group_name TEXT,
  pack_size INTEGER,
  stock_qty NUMERIC(12,2),
  stock_updated_at TIMESTAMPTZ,
  previous_qty NUMERIC(12,2),
  previous_qty_updated_at TIMESTAMPTZ,
  price_updated_at TIMESTAMPTZ,
  tenant_id UUID,
  branch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_order_product_idx ON public.order_items(order_id, product_name);
CREATE INDEX IF NOT EXISTS order_items_tenant_branch_idx ON public.order_items(tenant_id, branch_id);

DROP TRIGGER IF EXISTS set_timestamp_order_items ON public.order_items;
CREATE TRIGGER set_timestamp_order_items
BEFORE UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Historial de pedidos (snapshots)
CREATE TABLE IF NOT EXISTS public.order_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  title TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT order_snapshots_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS order_snapshots_order_idx ON public.order_snapshots(order_id);

-- Resúmenes globales por proveedor
CREATE TABLE IF NOT EXISTS public.order_summaries (
  provider_id UUID PRIMARY KEY,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  items NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Resúmenes por semana + proveedor
CREATE TABLE IF NOT EXISTS public.order_summaries_week (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  items NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS order_summaries_week_unique_idx
  ON public.order_summaries_week(week_id, provider_id);

-- Ajustes de aplicación (clave/valor JSON)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  tenant_id UUID,
  branch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS set_timestamp_app_settings ON public.app_settings;
CREATE TRIGGER set_timestamp_app_settings
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Estado de UI por pedido (orden de grupos, checkboxes, etc.)
CREATE TABLE IF NOT EXISTS public.order_ui_state (
  order_id UUID PRIMARY KEY,
  group_order TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  checked_map JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS set_timestamp_order_ui_state ON public.order_ui_state;
CREATE TRIGGER set_timestamp_order_ui_state
BEFORE UPDATE ON public.order_ui_state
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
