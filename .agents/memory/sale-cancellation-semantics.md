---
name: Sale cancellation semantics
description: Business rule for reversing a completed point-of-sale transaction.
---

# Sale cancellation semantics

Canceling a completed sale is an operational reversal, not a destructive hard delete: the sale remains in history with a canceled status, while completed-sale totals exclude it, stock is returned to the original item location, and finance receives the corresponding reversal.

**Why:** Removing only a row or only one side of the transaction creates inconsistencies between inventory, cash reports, and audit history.

**How to apply:** Any cancellation entry point must use the shared sale-cancellation service and must not bypass the inventory and financial reversal steps.