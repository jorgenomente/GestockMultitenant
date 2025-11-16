-- 0006_stock_signature

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS stock_signature_at TIMESTAMPTZ;

UPDATE public.order_items
SET stock_signature_at = stock_updated_at
WHERE stock_signature_at IS NULL;
