/**
 * Unit tests for EHS routing in getStaffRecipients() (via sendClassNotifications).
 *
 * Regression guard: the original bug passed the class address (cls.location)
 * to the ilike location lookup instead of the class title, causing all EHS
 * users to receive confirmation emails regardless of business unit.
 *
 * The DB mock here inspects the actual value supplied to ilike() and returns a
 * matching location row only when that value equals the known location name —
 * not the street address. Reverting production code to use cls.location would
 * yield no location match, trigger the all-EHS fallback, and fail the tests
 * that assert Chelsea Ryan is excluded.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Logger } from "pino";

// ---------------------------------------------------------------------------
// Mocks — declared before any import of the module under test so that
// vi.mock hoisting works correctly.
// ---------------------------------------------------------------------------

vi.mock("@workspace/db", () => ({
  db:             { select: vi.fn() },
  usersTable:     { _tag: "usersTable" },
  locationsTable: { _tag: "locationsTable" },
}));

vi.mock("drizzle-orm", () => ({
  // Return a plain descriptor object so tests can inspect the lookup value.
  eq:    (_col: unknown, _val: unknown) => ({ op: "eq",    _col, _val }),
  ilike: (_col: unknown, _val: unknown) => ({ op: "ilike", _col, _val }),
}));

vi.mock("./sendgrid", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./calendarLinks", () => ({
  buildCalendarLinks: vi.fn().mockReturnValue({}),
  calendarHtml:       vi.fn().mockReturnValue(""),
  calendarText:       vi.fn().mockReturnValue(""),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are registered)
// ---------------------------------------------------------------------------

import { db, locationsTable } from "@workspace/db";
import { sendEmail } from "./sendgrid";
import { sendClassNotifications, type ClassInfo, type RequestorInfo } from "./classNotifications";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdminUser = {
  name: string;
  email: string | null;
  adminRole: string;
  organization: string | null;
};

type IlikeCond = { op: "ilike"; _col: unknown; _val: string };

// ---------------------------------------------------------------------------
// DB mock setup
// ---------------------------------------------------------------------------

/**
 * Wire db.select so that:
 *  - Users-table queries resolve to `adminUsers`.
 *  - Locations-table queries simulate an exact case-insensitive match:
 *    the row is returned only when the ilike predicate value equals
 *    `knownLocationName` (case-insensitive). This means passing the street
 *    address instead of the location name produces no match and triggers the
 *    all-EHS fallback — exactly the regression we guard against.
 */
function setupDbMock(
  adminUsers: AdminUser[],
  locationRow: { businessUnit: string | null } | null,
  /** The location name that the DB "knows about". Defaults to the Studio Lot name. */
  knownLocationName = "FOX Studio Lot",
) {
  const mockSelect = db.select as ReturnType<typeof vi.fn>;

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
          // equals the known location name (case-insensitive exact match).
          const ilikeCond = cond as IlikeCond | undefined;
          const lookupValue = ilikeCond?._val ?? "";
          const matched =
            lookupValue.toLowerCase() === knownLocationName.toLowerCase() &&
            locationRow !== null;

          return {
            limit: (_n: number) =>
              Promise.resolve(matched ? [locationRow!] : []),
          };
        }
        // Users table — resolve directly.
        return Promise.resolve(adminUsers);
      },
    };

    return builder;
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function silentLogger(): Logger {
  const noop = () => {};
  return {
    info:  noop,
    warn:  noop,
    error: noop,
    debug: noop,
    trace: noop,
    fatal: noop,
    child: () => silentLogger(),
  } as unknown as Logger;
}

/** Collect every `to` address that received a staff email (excludes requestor). */
function staffEmailsSent(requestorEmail: string): string[] {
  const calls = (sendEmail as ReturnType<typeof vi.fn>).mock
    .calls as [{ to: string }, unknown][];
  return calls
    .map(([{ to }]) => to)
    .filter(to => to !== requestorEmail);
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

const COORDINATOR: AdminUser = {
  name:         "Carmen Reyes",
  email:        "carmen@fox.com",
  adminRole:    "coordinator",
  organization: null,
};

/** Class whose title matches the "FOX Studio Lot" location card. */
const STUDIO_LOT_CLASS: ClassInfo = {
  id:                1,
  title:             "FOX Studio Lot",
  location:          "10201 W Pico Blvd, Los Angeles, CA 90064",
  certificationType: "cpr_aed",
  date:              "2099-06-15",
  startTime:         "09:00",
};

const REQUESTOR: RequestorInfo = {
  name:             "Test Requestor",
  email:            "requestor@example.com",
  organizationName: "Test Org",
};

const ALL_USERS = [ADMIN, COORDINATOR, STUDIO_LOT_EHS, FTV_EHS];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EHS routing — getStaffRecipients() via sendClassNotifications()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // Primary routing assertion
  // -------------------------------------------------------------------------

  it("routes a Studio Lot class only to the FOX Studio Lot EHS contact, not Chelsea Ryan (FOX Television Stations)", async () => {
    // The mock returns the location row only when ilike receives "FOX Studio Lot"
    // (the class title), not the street address. This directly guards the bug.
    setupDbMock(ALL_USERS, { businessUnit: "FOX Studio Lot" });

    await sendClassNotifications(STUDIO_LOT_CLASS, REQUESTOR, "confirmation", silentLogger());

    const staff = staffEmailsSent(REQUESTOR.email);

    expect(staff).toContain(STUDIO_LOT_EHS.email);   // Jordan Ellis — correct EHS
    expect(staff).not.toContain(FTV_EHS.email);       // Chelsea Ryan — wrong BU, excluded

    expect(staff).toContain(ADMIN.email);             // admin always notified
    expect(staff).toContain(COORDINATOR.email);       // coordinator always notified
  });

  // -------------------------------------------------------------------------
  // Regression guard: title vs address lookup
  // -------------------------------------------------------------------------

  it("uses cls.title (location name) for the ilike lookup — not cls.location (street address)", async () => {
    // The mock only returns the Studio Lot card when queried by title.
    // If production code reverts to cls.location (the street address), ilike
    // receives "10201 W Pico Blvd…", which does NOT equal "FOX Studio Lot",
    // so the mock returns no location, EHS routing falls back to everyone, and
    // Chelsea Ryan appears in the recipient list — making this test fail.
    setupDbMock(ALL_USERS, { businessUnit: "FOX Studio Lot" });

    await sendClassNotifications(STUDIO_LOT_CLASS, REQUESTOR, "confirmation", silentLogger());

    const staff = staffEmailsSent(REQUESTOR.email);

    // Chelsea Ryan must be absent — her presence would prove the address was used.
    expect(staff).not.toContain(FTV_EHS.email);
    // Jordan Ellis must be present — proves the title lookup returned the right BU.
    expect(staff).toContain(STUDIO_LOT_EHS.email);
  });

  // -------------------------------------------------------------------------
  // Fallback: null business unit → broadcast to all EHS (intentional)
  // -------------------------------------------------------------------------

  it("broadcasts to ALL EHS users when the location card has no business unit set", async () => {
    setupDbMock(ALL_USERS, { businessUnit: null });

    await sendClassNotifications(STUDIO_LOT_CLASS, REQUESTOR, "confirmation", silentLogger());

    const staff = staffEmailsSent(REQUESTOR.email);

    // Both EHS contacts receive the email — safe broadcast when BU is unknown.
    expect(staff).toContain(STUDIO_LOT_EHS.email);
    expect(staff).toContain(FTV_EHS.email);
  });

  // -------------------------------------------------------------------------
  // Fallback: no matching location card → broadcast to all EHS (intentional)
  // -------------------------------------------------------------------------

  it("broadcasts to ALL EHS users when no location card matches the class title", async () => {
    setupDbMock(ALL_USERS, null /* no matching location */);

    await sendClassNotifications(STUDIO_LOT_CLASS, REQUESTOR, "confirmation", silentLogger());

    const staff = staffEmailsSent(REQUESTOR.email);

    expect(staff).toContain(STUDIO_LOT_EHS.email);
    expect(staff).toContain(FTV_EHS.email);
  });

  // -------------------------------------------------------------------------
  // Explicit classBusinessUnit override
  // -------------------------------------------------------------------------

  it("respects an explicit classBusinessUnit override and routes to Studio Lot EHS only", async () => {
    // Even if the location card would give a different BU, the explicit override wins.
    setupDbMock(ALL_USERS, { businessUnit: "FOX Television Stations" });

    await sendClassNotifications(
      STUDIO_LOT_CLASS,
      REQUESTOR,
      "confirmation",
      silentLogger(),
      "FOX Studio Lot", // explicit override takes precedence
    );

    const staff = staffEmailsSent(REQUESTOR.email);

    expect(staff).toContain(STUDIO_LOT_EHS.email);
    expect(staff).not.toContain(FTV_EHS.email);
  });

  // -------------------------------------------------------------------------
  // Requestor always receives their own email
  // -------------------------------------------------------------------------

  it("always emails the requestor regardless of EHS routing outcome", async () => {
    setupDbMock(ALL_USERS, { businessUnit: "FOX Studio Lot" });

    await sendClassNotifications(STUDIO_LOT_CLASS, REQUESTOR, "confirmation", silentLogger());

    const all = (sendEmail as ReturnType<typeof vi.fn>).mock.calls
      .map(([{ to }]: [{ to: string }, unknown]) => to);

    expect(all).toContain(REQUESTOR.email);
  });
});
