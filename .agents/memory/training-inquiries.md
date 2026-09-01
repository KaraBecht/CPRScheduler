---
name: Training interest records
description: Product distinction between lightweight interest contacts and complete class requests.
---

Display preliminary records as training “interests,” while retaining the existing inquiry API and storage identifiers for compatibility. One interest may group multiple people, each with a name and email plus an optional phone number and person-specific note, while division and location are shared. Do not require certification, dates, or attendee counts until the interest becomes a full request.

**Why:** Admins need to capture calls and early interest before enough scheduling information exists to create a complete training request, and several contacts from the same division and location may be involved.

**How to apply:** Use “interest” in user-facing copy. Preserve grouped contacts with individual email, optional phone, and optional note details plus shared division/location, separate from the approval and scheduling workflow.

The multi-person interest dialog must constrain itself to the viewport and scroll its form body independently, leaving the save/cancel actions reachable.

**Why:** Adding several contacts makes the form taller than common browser viewports.

**How to apply:** Keep the dialog height viewport-limited, use an internal scroll region for the people and shared fields, and keep the footer from shrinking away.

Saved training interests can be reopened from their cards and exported as CSV, either individually or as a complete list. Each exported row represents one person and repeats the shared interest details, including the optional shared note.

**Why:** Admins need to review submitted contact groups later and move the collected information into other workflows.

**How to apply:** Preserve the grouped-person CSV shape when extending interest exports, and keep both per-interest and all-interest exports available to administrators.

Each interest may also include an optional shared note for follow-up context.

**Why:** Early contacts often need context that does not belong to a specific person.

**How to apply:** Keep the note optional, show it on list/detail views when present, and include it in exports.

Training interests retain people instead of deleting them when their follow-up outcome changes. Each person has an independent Interested, Scheduled, Completed, or No longer interested status. Whole interests can be archived and restored.

**Why:** People grouped on one interest can reach different outcomes, and administrators need historical context without cluttering the active list.

**How to apply:** Hide archived interests from the default Active view, provide an explicit Archived filter, require confirmation for permanent deletion, and include lifecycle state in exports.

Administrators can reopen an interest and edit its people list, including adding contacts later. Existing lifecycle statuses must remain attached to their people; newly added people start as Interested.

**Why:** Interest groups often grow after the first contact is saved, so the initial record should not become a dead end.

**How to apply:** Prefill existing contacts in edit mode, keep phone and person notes optional, require name and email, preserve statuses on save, insert new people at the top, allow shared location/note edits, allow removing people while requiring at least one, and keep division read-only.

People forms display a live tally that updates immediately as contacts are added or removed.

**Why:** When several person cards are in a scrollable dialog, admins need an immediate count without counting cards manually.

**How to apply:** Show the current form-state count at the top of both the new-interest and edit-interest dialogs, not only the last saved count.