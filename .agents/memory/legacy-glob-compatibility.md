---
name: Legacy glob compatibility
description: Why spreadsheet dependency security upgrades need real filesystem glob tests.
---

When upgrading minimatch across major versions for security, test the older glob consumers with actual filesystem patterns and ZIP archives. Spreadsheet buffer round-trips alone are insufficient.

**Why:** ExcelJS's latest available release still brings legacy glob consumers. Modern minimatch returns matcher objects rather than regular expressions; old glob assumes regex metadata and string-match behavior. Ordinary ExcelJS buffer tests can pass while filesystem glob patterns crash.

**How to apply:** Keep the glob compatibility patch while those legacy parents remain. Run `pnpm test:dependency-compat` after dependency or patch changes. Do not revert to vulnerable minimatch versions to restore compatibility; remove the patch only after the parent chain supports the patched matcher API.
