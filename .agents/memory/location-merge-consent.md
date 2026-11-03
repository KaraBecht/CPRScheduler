---
name: Location merge consent
description: User requirements for combining duplicate location records without losing conflicting details.
---

When combining duplicate locations, show a review popup for differing populated information, allowing the user to choose either value or keep both. Do not automatically choose a contact or perform an unconfirmed merge.

**Why:** The user identified duplicate location cards with different contacts and different completed-training histories, and explicitly requested conflict choices rather than silent overwrites.

**How to apply:** Preserve historical class associations under both original location names, communication notes, and a record of pre-merge details. Keep the reviewed values stable while the popup is open. A location must have one active timezone; offer either timezone rather than an invalid combined value.
