---
name: Variant/SKU model
description: Each batch row IS a product variant in the ERP/PDV model; key fields and rules.
---

# Variant/SKU model

## The rule
Each `batches` row represents one independent stock unit (variant). The `products` table is a family/grouper only.

**Batch-level fields (per variant):**
- `sku` — internal code, unique per variant, scanned at POS
- `variantName` — human name (e.g. "Coca-Cola Zero 2L")
- `barcode` — EAN/GTIN
- `salePrice` — overrides `products.salePrice` for this variant (nullable = use product price)
- `costPrice`, `quantity`, `entryDate`, `expiryDate`, `supplier` — per variant

**Product-level fields (family only):**
- `codigoProduto` — optional family code, NOT the variant SKU
- `salePrice` — default fallback price when batch has no salePrice
- `name`, `brand`, `category`, `flavor`, `unit`, etc.

**Why:** ERP/PDV standard requires each sellable unit to have its own SKU, barcode, and price independently tracked, searchable, and movable. The old system conflated family-level codes with variant codes.

**How to apply:**
- When creating a variant (inline flow), put the code in `batch.sku`, not `product.codigoProduto`.
- When looking up by scanner code at POS, search `batches.sku` AND `batches.barcode`.
- `GET /api/products/sku/:sku` — looks up variant by SKU, returns parent product + matchedBatch.
- `GET /api/products/barcode/:barcode` — looks up by EAN.
