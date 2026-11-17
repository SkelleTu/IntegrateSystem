-- Preserve existing stock values and allow fractional quantities (for example 0.375 kg).
-- Existing integer quantities are interpreted in their current units and are not rescaled.
ALTER TABLE public.batches
  ALTER COLUMN quantity TYPE NUMERIC(14,3) USING quantity::numeric;

ALTER TABLE public.batch_logs
  ALTER COLUMN quantity TYPE NUMERIC(14,3) USING quantity::numeric;

ALTER TABLE public.inventory
  ALTER COLUMN quantity TYPE NUMERIC(14,3) USING quantity::numeric;

ALTER TABLE public.inventory_logs
  ALTER COLUMN quantity TYPE NUMERIC(14,3) USING quantity::numeric;

ALTER TABLE public.inventory_restocks
  ALTER COLUMN quantity TYPE NUMERIC(14,3) USING quantity::numeric;
