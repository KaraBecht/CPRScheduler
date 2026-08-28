---
name: Training interest records
description: Product distinction between lightweight interest contacts and complete class requests.
---

Display preliminary records as training “interests,” while retaining the existing inquiry API and storage identifiers for compatibility. One interest may group multiple people, each with a name, phone number, and email, while division and location are shared. Do not require certification, dates, or attendee counts until the interest becomes a full request.

**Why:** Admins need to capture calls and early interest before enough scheduling information exists to create a complete training request, and several contacts from the same division and location may be involved.

**How to apply:** Use “interest” in user-facing copy. Preserve grouped contacts with individual email/phone details and shared division/location, separate from the approval and scheduling workflow.

The multi-person interest dialog must constrain itself to the viewport and scroll its form body independently, leaving the save/cancel actions reachable.

**Why:** Adding several contacts makes the form taller than common browser viewports.

**How to apply:** Keep the dialog height viewport-limited, use an internal scroll region for the people and shared fields, and keep the footer from shrinking away.