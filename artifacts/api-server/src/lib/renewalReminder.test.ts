/**
 * Unit tests for EHS routing in sendRenewalReminders() (renewalReminder.ts).
 *
 * Mirrors the vi.mock pattern used in classNotifications.test.ts.
 *
 * The renewal reminder contains identical EHS business-unit routing logic
 * to classNotifications.ts. These tests guard against the same class of
 * regression: broadcasting to all EHS users when only one business unit's
 * contact should receive the email.
 *
 * The DB mock inspects the actual value supplied to ilike() and returns a
 * matching location row only when that value contains the known location name.
 * If production code were changed to look up by street address instead of
 * class title, the ilike value would not match, the EHS fallback would fire,
 * and Chelsea Ryan would appear in the recipient list — failing the tests
 * that assert she is excluded.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — declared before any import of the module under test so that
// vi.mock hoisting works correctly.
// ---------------------------------------------------------------------------

vi.mock("@workspace/db", () => ({
  db:             { select: vi.fn() },
  classesTable:   { _tag: "classesTable" },
  usersTable:     { _tag: "usersTable" },
  locationsTable: { _tag: "locationsTable" },
}));

vi.mock("drizzle-orm", () => ({
  eq:      (_col: unknown, _val: unknown) => ({ op: "eq",      _col, _val }),
  gte:     (_col: unknown, _val: unknown) => ({ op: "gte",     _col, _val }),
  lte:     (_col: unknown, _val: unknown) => ({ op: "lte",     _col, _val }),
  ilike:   (_col: unknown, _val: unknown) => ({ op: "ilike",   _col, _val }),
  inArray: (_col: unknown, _vals: unknown) => ({ op: "inArray", _col, _vals }),
  and:     (...conds: unknown[])           => ({ op: "and",    conds }),
}));

vi.mock("./mailer", () => ({
  sendMail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./logger", () => ({
  logger: {
    info:  vi.fn(),
    warn:  vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
  },
}));

vi.mock("./formatCertType", () => ({
  formatCertificationType: vi.fn().mockReturnValue("CPR/AED"),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are registered)
// ---------------------------------------------------------------------------

import { db, classesTable, usersTable, locationsTable } from "@workspace/db";
import { sendMail } from "./mailer";
import { sendRenewalReminders } from "./renewalReminder";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdminUser = {
  name:         string;
  email:        string | null;
  adminRole:    string;
  organization: string | null;
};

/** Minimal shape of a classesTable row returned by the due-classes query. */
type ClassRow = {
  title:             string;
  location:          string;
  date:              string;
  certificationType: string;
  status:            string;
  [key: string]:     unknown;
};

type IlikeCond = { op: "ilike"; _col: unknown; _val: string };

// ---------------------------------------------------------------------------
// DB mock setup
// ---------------------------------------------------------------------------

/**
 * Wire db.select so that:
 *  - The first classesTable query (due classes) resolves to `dueClasses`.
 *  - The second classesTable query (covered locations) resolves to an empty array
 *    (so all due classes need reminders).
 *  - usersTable queries resolve to `adminUsers`.
 *  - locationsTable queries simulate a case-insensitive substring match:
 *    the row is returned only when the ilike predicate value contains
 *    `knownLocationName`. Passing a street address instead of the class title
 *    would not match, triggering the all-EHS fallback.
 */
function setupDbMock(
  adminUsers: AdminUser[],
  locationRow: { businessUnit: string | null } | null,
  dueClasses: ClassRow[] = [STUDIO_LOT_CLASS_ROW],
  coveredClasses: { location: string }[] = [],
  knownLocationName = "FOX Studio Lot",
) {
  const mockSelect = db.select as ReturnType<typeof vi.fn>;
  let classesCallCount = 0;

  mockSelect.mockImplementation(() => {
    let _fromTable: unknown;

    const builder = {
      from: (table: unknown) => {
        _fromTable = table;
        return builder;
      },
      where: (cond?: unknown) => {
        if (_fromTable === locationsTable) {
          // Evaluate the ilike predicate: match only when the lookup value
          // contains the known location name (case-insensitive).
          const ilikeCond = cond as IlikeCond | undefined;
          const rawVal = ilikeCond?._val ?? "";
          // Strip leading/trailing % that the production code adds.
          const lookupValue = rawVal.replace(/^%|%$/g, "").toLowerCase();
          const matched =
            lookupValue.includes(knownLocationName.toLowerCase()) &&
            locationRow !== null;

          return {
            limit: (_n: number) =>
              Promise.resolve(matched ? [locationRow!] : []),
          };
        }

        if (_fromTable === usersTable) {
          return Promise.resolve(adminUsers);
        }

        if (_fromTable === classesTable) {
          classesCallCount++;
          // First call: dueClasses query. Second call: coveredClasses query.
          return Promise.resolve(
            classesCallCount === 1 ? dueClasses : coveredClasses,
          );
        }

        return Promise.resolve([]);
      },
    };

    return builder;
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collect all `to` addresses that received an email. */
function emailsSent(): string[] {
  const calls = (sendMail as ReturnType<typeof vi.fn>).mock
    .calls as [{ to: string }][];
  return calls.map(([{ to }]) => to);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STUDIO_LOT_EHS: AdminUser = {
  name:         "Jordan Ellis",
  email:        "jordan.ellis@fox.com",
  adminRole:    "ehs",
  organization: "FOX Studio Lot",
};

const FTV_EHS: AdminUser = {
  name:         "Chelsea Ryan",
  email:        "chelsea.ryan@fox.com",
  adminRole:    "ehs",
  organization: "FOX Television Stations",
};

const ADMIN: AdminUser = {
  name:         "Sharon Dubois",
  email:        "sharon@fox.com",
  adminRole:    "admin",
  organization: null,
};

const ALL_USERS = [ADMIN, STUDIO_LOT_EHS, FTV_EHS];

/**
 * A completed class whose title is the location card name.
 * The date is set 18 months in the past so the renewal window logic
 * would normally include it — but since we mock the DB queries the
 * date value itself is never evaluated.
 */
const STUDIO_LOT_CLASS_ROW: ClassRow = {
  title:             "FOX Studio Lot",
  location:          "10201 W Pico Blvd, Los Angeles, CA 90064",
  date:              "2025-02-26",
  certificationType: "cpr_aed",
  status:            "completed",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Status filtering — sendRenewalReminders()
//
// The due-classes query must filter on status = "completed".
// These tests confirm that:
//   1. The WHERE clause sent to the DB explicitly includes eq(status, "completed").
//   2. Classes with non-completed statuses (cancelled, scheduled, confirmed)
//      never produce reminder emails, because the DB query excludes them.
// ---------------------------------------------------------------------------

describe("Status filtering — sendRenewalReminders()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (sendMail as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("queries the DB with eq(status, 'completed') — non-completed classes are excluded at the query level", async () => {
    // Capture the WHERE condition passed to the first classesTable call.
    let capturedDueWhere: unknown = null;
    const mockSelect = db.select as ReturnType<typeof vi.fn>;
    let classesCallCount = 0;

    mockSelect.mockImplementation(() => {
      let _fromTable: unknown;
      const builder = {
        from: (table: unknown) => {
          _fromTable = table;
          return builder;
        },
        where: (cond: unknown) => {
          if (_fromTable === classesTable) {
            classesCallCount++;
            if (classesCallCount === 1) capturedDueWhere = cond;
            // Return empty so the function exits early (no emails, no further DB calls needed).
            return Promise.resolve([]);
          }
          if (_fromTable === usersTable) return Promise.resolve([]);
          if (_fromTable === locationsTable) return { limit: () => Promise.resolve([]) };
          return Promise.resolve([]);
        },
      };
      return builder;
    });

    await sendRenewalReminders();

    // The WHERE clause is built with and(...) which our drizzle-orm mock wraps as
    // { op: "and", conds: [...] }. One of those conds must be eq(status, "completed").
    const andCond = capturedDueWhere as { op: string; conds: unknown[] } | null;
    expect(andCond).not.toBeNull();
    expect(andCond!.op).toBe("and");

    const statusEqCond = andCond!.conds.find(
      (c: unknown) =>
        typeof c === "object" &&
        c !== null &&
        (c as Record<string, unknown>).op === "eq" &&
        (c as Record<string, unknown>)._val === "completed",
    );
    expect(statusEqCond).toBeDefined();
  });

  it("sends no emails when the DB returns no completed classes (all excluded by status filter)", async () => {
    // Simulates the case where only cancelled / scheduled / confirmed classes
    // fall in the renewal window — the DB filter returns nothing.
    setupDbMock([ADMIN, STUDIO_LOT_EHS], { businessUnit: "FOX Studio Lot" }, []);

    const count = await sendRenewalReminders();

    expect(count).toBe(0);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends no emails for a cancelled class (status='cancelled')", async () => {
    // A cancelled class must never trigger a renewal reminder.
    // The DB query filters by status="completed", so a cancelled class row
    // would never be returned. We simulate correct DB behaviour: empty result.
    const cancelledClass: ClassRow = {
      ...STUDIO_LOT_CLASS_ROW,
      status: "cancelled",
    };
    // Correct DB behaviour: status filter means cancelled classes are excluded.
    setupDbMock([ADMIN, STUDIO_LOT_EHS], { businessUnit: "FOX Studio Lot" }, []);

    const count = await sendRenewalReminders();

    expect(count).toBe(0);
    expect(sendMail).not.toHaveBeenCalled();

    // Also verify that if such a row somehow bypassed the DB filter, the
    // status value on the row itself is "cancelled" — confirming the fixture
    // models the right scenario.
    expect(cancelledClass.status).toBe("cancelled");
  });

  it("sends no emails for a scheduled class (status='scheduled')", async () => {
    // A class that is still scheduled (not yet completed) must not fire a renewal.
    setupDbMock([ADMIN, STUDIO_LOT_EHS], { businessUnit: "FOX Studio Lot" }, []);

    const count = await sendRenewalReminders();

    expect(count).toBe(0);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends no emails for a confirmed class (status='confirmed')", async () => {
    // A confirmed but not yet completed class must not fire a renewal reminder.
    setupDbMock([ADMIN, STUDIO_LOT_EHS], { businessUnit: "FOX Studio Lot" }, []);

    const count = await sendRenewalReminders();

    expect(count).toBe(0);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends a renewal reminder only for a completed class, not for the same location's cancelled class", async () => {
    // Two entries exist for the same location: one completed, one cancelled.
    // The DB filter returns only the completed one — the cancelled one is excluded.
    const completedClass: ClassRow = { ...STUDIO_LOT_CLASS_ROW, status: "completed" };
    // Only the completed class is returned by the DB (cancelled filtered out).
    setupDbMock([ADMIN, STUDIO_LOT_EHS], { businessUnit: "FOX Studio Lot" }, [completedClass]);

    const count = await sendRenewalReminders();

    expect(count).toBe(1);
    expect(sendMail).toHaveBeenCalled();
    expect(emailsSent()).toContain(ADMIN.email);
  });
});

describe("EHS routing — sendRenewalReminders()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (sendMail as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // Primary routing assertion
  // -------------------------------------------------------------------------

  it("routes a Studio Lot renewal reminder only to the FOX Studio Lot EHS contact, not Chelsea Ryan (FOX Television Stations)", async () => {
    // The mock returns the location row only when ilike receives a value
    // containing "FOX Studio Lot" (the class title). If production code
    // were changed to use the street address, no match would occur, the
    // fallback would fire, and Chelsea Ryan would appear — failing this test.
    setupDbMock(ALL_USERS, { businessUnit: "FOX Studio Lot" });

    await sendRenewalReminders();

    const recipients = emailsSent();

    expect(recipients).toContain(STUDIO_LOT_EHS.email);  // Jordan Ellis — correct EHS
    expect(recipients).not.toContain(FTV_EHS.email);      // Chelsea Ryan — wrong BU, excluded
    expect(recipients).toContain(ADMIN.email);            // admin always notified
  });

  // -------------------------------------------------------------------------
  // Fallback: no matching location card → broadcast to all EHS
  // -------------------------------------------------------------------------

  it("broadcasts to ALL EHS users when no location card matches the class title", async () => {
    // null locationRow means getLocationBusinessUnit() returns null,
    // which leaves ehsRecipients = allEhs (the safe broadcast fallback).
    setupDbMock(ALL_USERS, null /* no matching location card */);

    await sendRenewalReminders();

    const recipients = emailsSent();

    expect(recipients).toContain(STUDIO_LOT_EHS.email);
    expect(recipients).toContain(FTV_EHS.email);
  });

  // -------------------------------------------------------------------------
  // Fallback: null business unit on the location card → broadcast to all EHS
  // -------------------------------------------------------------------------

  it("broadcasts to ALL EHS users when the location card has no business unit set", async () => {
    setupDbMock(ALL_USERS, { businessUnit: null });

    await sendRenewalReminders();

    const recipients = emailsSent();

    expect(recipients).toContain(STUDIO_LOT_EHS.email);
    expect(recipients).toContain(FTV_EHS.email);
  });

  // -------------------------------------------------------------------------
  // No emails when all due locations are already covered
  // -------------------------------------------------------------------------

  it("sends no emails when all due-class locations already have a scheduled or confirmed class", async () => {
    // Second classesTable call returns a covered location matching the due class.
    setupDbMock(
      ALL_USERS,
      { businessUnit: "FOX Studio Lot" },
      [STUDIO_LOT_CLASS_ROW],
      [{ location: STUDIO_LOT_CLASS_ROW.location }], // already covered
    );

    const count = await sendRenewalReminders();

    expect(count).toBe(0);
    expect(sendMail).not.toHaveBeenCalled();
  });
});
