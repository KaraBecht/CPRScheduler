---
name: Generated API client outputs
description: Validation guidance when generated API client source and declaration output disagree.
---

The API client source schemas and the checked-in declaration output can temporarily disagree after API contract changes. In that state, frontend typecheck errors may include pre-existing fields that are already used throughout the app.

**Why:** The scheduler's Vite build resolves the client source and can validate the actual frontend bundle even when a stale declaration artifact makes the package typecheck noisy.

**How to apply:** Check the generated source and declaration output before treating a typecheck failure as caused by the current change; run the affected artifact's production build and inspect the preview as the practical frontend validation. Do not regenerate or replace generated files unless the task specifically calls for API contract work.