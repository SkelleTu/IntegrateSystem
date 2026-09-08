---
name: Set spread TS error
description: Spreading a Set causes TS2802 in this project; use Array.from() instead.
---

# Set spread TS error

## The rule
`[...new Set(arr)]` triggers `TS2802: Type 'Set<X>' can only be iterated through when using --downlevelIteration flag or with a --target of es2015 or higher` in this project.

**Fix:** Always use `Array.from(new Set(arr))` instead.

**Why:** The tsconfig targets ES5 or pre-ES2015 without `downlevelIteration: true`. Spread of custom iterables (Set, Map, etc.) does not compile cleanly in this configuration.

**How to apply:** Whenever you need to deduplicate an array, use `Array.from(new Set(arr))` — not `[...new Set(arr)]`.
