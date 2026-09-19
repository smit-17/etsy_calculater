CREATE UNIQUE INDEX saved_prices_sku_unique_idx
ON public.saved_prices (sku)
WHERE sku <> '';