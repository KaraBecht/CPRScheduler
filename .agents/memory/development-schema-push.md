---
name: Development schema push
description: A legacy database constraint mismatch can make the normal Drizzle push request a destructive users-table truncation.
---

Do not accept or force a schema-push prompt that offers to truncate the users table because of the users-email unique-constraint mismatch. Apply narrowly scoped additive development DDL instead when that is sufficient, while keeping the Drizzle schema as the source of truth.

**Why:** The normal non-interactive development push can detect the existing email constraint as missing and ask whether to truncate a populated users table. Forcing it risks deleting real project data.

**How to apply:** When an additive schema change is blocked by this prompt, refuse the destructive action, apply only the safe additive change to development, and let Publish compute and apply the production schema diff.