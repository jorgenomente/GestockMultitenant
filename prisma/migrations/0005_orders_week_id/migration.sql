-- 0005_orders_week_id
-- Vincula pedidos a provider_weeks para soportar pedidos semanales

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS week_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_week_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_week_id_fkey
      FOREIGN KEY (week_id)
      REFERENCES public.provider_weeks(id)
      ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS orders_week_idx ON public.orders(week_id);
