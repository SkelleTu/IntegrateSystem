---
name: POS batch stock deduction
description: Inventory and cancellation behavior for sales using the product-to-batch catalog.
---

# POS batch stock deduction

The cashier represents a sellable batch with a virtual item ID derived from the real batch ID. Sale creation and cancellation must translate that ID and update `batches` plus `batch_logs`; the legacy `inventory` table is only for legacy inventory items.

**Why:** The visible stock system is batch-based, so updating only the legacy inventory table lets a sale and its financial transaction succeed while the displayed batch quantity remains unchanged.

**How to apply:** Preserve the virtual-ID mapping whenever the cashier catalog continues to flatten batches. Any change to sale persistence or cancellation should cover both quantity changes and movement logs for batch-backed products.