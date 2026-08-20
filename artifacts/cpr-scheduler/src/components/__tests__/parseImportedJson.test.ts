import { describe, it, expect, vi, afterEach } from "vitest";
import { parseImportedJson, isValidImportDate } from "../ImportRequestModal";

// ---------------------------------------------------------------------------
// isValidImportDate helper
// ---------------------------------------------------------------------------
describe("isValidImportDate", () => {
  it("accepts a real calendar date", () => {
    expect(isValidImportDate("2026-03-15")).toBe(true);
  });

  it("rejects wrong format (MM/DD/YYYY)", () => {
    expect(isValidImportDate("03/15/2026")).toBe(false);
  });

  it("rejects an impossible month", () => {
    expect(isValidImportDate("2026-13-01")).toBe(false);
  });

  it("rejects an impossible day", () => {
    expect(isValidImportDate("2026-02-30")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidImportDate("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseImportedJson – valid file
// ---------------------------------------------------------------------------
describe("parseImportedJson – valid file", () => {
  const validFile = {
    locationName: "Main Office",
    requestorName: "Jane Smith",
    requestorEmail: "jane@example.com",
    certificationType: "cpr_aed_first_aid",
    sessions: [
      { date: "2099-06-15", startTime: "09:00" },
      { date: "2099-07-20", startTime: "14:30" },
    ],
  };

  it("returns no blocking errors and no warnings for a clean file", () => {
    const result = parseImportedJson(validFile);
    expect(result.blockingErrors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("passes location and requestor fields through", () => {
    const result = parseImportedJson(validFile);
    expect(result.data.locationName).toBe("Main Office");
    expect(result.data.requestorName).toBe("Jane Smith");
    expect(result.data.requestorEmail).toBe("jane@example.com");
  });

  it("passes the certificationType through", () => {
    const result = parseImportedJson(validFile);
    expect(result.data.certificationType).toBe("cpr_aed_first_aid");
  });

  it("passes sessions through intact", () => {
    const result = parseImportedJson(validFile);
    expect(result.data.sessions).toEqual([
      { date: "2099-06-15", startTime: "09:00" },
      { date: "2099-07-20", startTime: "14:30" },
    ]);
  });
});

// ---------------------------------------------------------------------------
// parseImportedJson – missing required fields (individual)
// ---------------------------------------------------------------------------
describe("parseImportedJson – missing required fields", () => {
  const base = {
    locationName: "Main Office",
    requestorName: "Jane Smith",
    requestorEmail: "jane@example.com",
    sessions: [{ date: "2099-06-15", startTime: "09:00" }],
  };

  it("blocks when locationName is missing", () => {
    const { locationName: _, ...rest } = base;
    const result = parseImportedJson(rest);
    expect(result.blockingErrors.some((e) => /location name/i.test(e))).toBe(true);
  });

  it("blocks when locationName is empty string", () => {
    const result = parseImportedJson({ ...base, locationName: "   " });
    expect(result.blockingErrors.some((e) => /location name/i.test(e))).toBe(true);
  });

  it("blocks when requestorName is missing", () => {
    const { requestorName: _, ...rest } = base;
    const result = parseImportedJson(rest);
    expect(result.blockingErrors.some((e) => /requestor name/i.test(e))).toBe(true);
  });

  it("blocks when requestorEmail is missing", () => {
    const { requestorEmail: _, ...rest } = base;
    const result = parseImportedJson(rest);
    expect(result.blockingErrors.some((e) => /requestor email/i.test(e))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// parseImportedJson – empty / missing sessions
// ---------------------------------------------------------------------------
describe("parseImportedJson – empty sessions", () => {
  const base = {
    locationName: "Main Office",
    requestorName: "Jane Smith",
    requestorEmail: "jane@example.com",
  };

  it("blocks when sessions array is absent", () => {
    const result = parseImportedJson(base);
    expect(result.blockingErrors.some((e) => /no sessions/i.test(e))).toBe(true);
  });

  it("blocks when sessions array is empty", () => {
    const result = parseImportedJson({ ...base, sessions: [] });
    expect(result.blockingErrors.some((e) => /no sessions/i.test(e))).toBe(true);
  });

  it("does not advance data.sessions when sessions are empty", () => {
    const result = parseImportedJson({ ...base, sessions: [] });
    expect(result.data.sessions).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// parseImportedJson – all-invalid sessions
// ---------------------------------------------------------------------------
describe("parseImportedJson – all-invalid sessions", () => {
  const base = {
    locationName: "Main Office",
    requestorName: "Jane Smith",
    requestorEmail: "jane@example.com",
  };

  it("blocks when every session has a bad date", () => {
    const result = parseImportedJson({
      ...base,
      sessions: [
        { date: "not-a-date", startTime: "09:00" },
        { date: "99-99-99", startTime: "10:00" },
      ],
    });
    expect(result.blockingErrors.length).toBeGreaterThan(0);
    expect(result.data.sessions).toBeUndefined();
  });

  it("blocks when every session entry is a non-object primitive", () => {
    const result = parseImportedJson({
      ...base,
      sessions: [null, 42, "string-session"],
    });
    expect(result.blockingErrors.length).toBeGreaterThan(0);
    expect(result.data.sessions).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// parseImportedJson – mixed valid/invalid sessions
// ---------------------------------------------------------------------------
describe("parseImportedJson – mixed sessions", () => {
  const base = {
    locationName: "Main Office",
    requestorName: "Jane Smith",
    requestorEmail: "jane@example.com",
  };

  it("passes only valid sessions through", () => {
    const result = parseImportedJson({
      ...base,
      sessions: [
        { date: "2099-06-15", startTime: "09:00" }, // valid
        { date: "bad-date", startTime: "09:00" },    // invalid
        { date: "2099-08-20", startTime: "14:00" },  // valid
      ],
    });
    expect(result.blockingErrors.some((e) => /session 2/i.test(e))).toBe(true);
    expect(result.data.sessions).toHaveLength(2);
    expect(result.data.sessions?.[0].date).toBe("2099-06-15");
    expect(result.data.sessions?.[1].date).toBe("2099-08-20");
  });

  it("keeps the valid session in data even though the bad session generates a blocking error", () => {
    const result = parseImportedJson({
      ...base,
      sessions: [
        { date: "2099-06-15", startTime: "09:00" },
        { date: "bad-date", startTime: "09:00" },
      ],
    });
    // The bad date is a blocking error
    expect(result.blockingErrors.some((e) => /session 2/i.test(e))).toBe(true);
    // The valid session still makes it into data
    expect(result.data.sessions).toBeDefined();
    expect(result.data.sessions).toHaveLength(1);
    expect(result.data.sessions?.[0].date).toBe("2099-06-15");
  });

  it("issues a warning (not a blocking error) for a malformed start time", () => {
    const result = parseImportedJson({
      ...base,
      sessions: [{ date: "2099-06-15", startTime: "9am" }],
    });
    expect(result.blockingErrors).toHaveLength(0);
    expect(result.warnings.some((w) => /start time/i.test(w))).toBe(true);
    // Defaults to 09:00
    expect(result.data.sessions?.[0].startTime).toBe("09:00");
  });

  it("uses 09:00 as default when startTime is absent", () => {
    const result = parseImportedJson({
      ...base,
      sessions: [{ date: "2099-06-15" }],
    });
    expect(result.blockingErrors).toHaveLength(0);
    expect(result.data.sessions?.[0].startTime).toBe("09:00");
  });
});

// ---------------------------------------------------------------------------
// parseImportedJson – past-dated sessions (warnings, not blocking errors)
// ---------------------------------------------------------------------------
describe("parseImportedJson – past-dated sessions", () => {
  const base = {
    locationName: "Main Office",
    requestorName: "Jane Smith",
    requestorEmail: "jane@example.com",
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits a warning (not a blocking error) when a single session is in the past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T12:00:00Z"));

    const result = parseImportedJson({
      ...base,
      sessions: [{ date: "2026-03-01", startTime: "09:00" }],
    });

    expect(result.blockingErrors).toHaveLength(0);
    expect(result.data.sessions).toHaveLength(1);
    // At least one warning mentions the past date
    expect(result.warnings.some((w) => /past/i.test(w))).toBe(true);
  });

  it("emits a singular warning message for exactly one past session", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T12:00:00Z"));

    const result = parseImportedJson({
      ...base,
      sessions: [
        { date: "2026-01-10", startTime: "09:00" }, // past
        { date: "2099-12-01", startTime: "09:00" }, // future
      ],
    });

    expect(result.blockingErrors).toHaveLength(0);
    // Aggregate warning says "1 session"
    const aggregateWarning = result.warnings.find((w) => /1 session is in the past/i.test(w));
    expect(aggregateWarning).toBeDefined();
  });

  it("emits a plural aggregate warning when multiple sessions are in the past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T12:00:00Z"));

    const result = parseImportedJson({
      ...base,
      sessions: [
        { date: "2026-01-10", startTime: "09:00" }, // past
        { date: "2026-02-14", startTime: "14:00" }, // past
        { date: "2099-12-01", startTime: "09:00" }, // future
      ],
    });

    expect(result.blockingErrors).toHaveLength(0);
    const aggregateWarning = result.warnings.find((w) => /2 sessions are in the past/i.test(w));
    expect(aggregateWarning).toBeDefined();
  });

  it("emits no past-date warnings when all sessions are in the future", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T12:00:00Z"));

    const result = parseImportedJson({
      ...base,
      sessions: [
        { date: "2099-06-15", startTime: "09:00" },
        { date: "2099-07-20", startTime: "14:00" },
      ],
    });

    expect(result.blockingErrors).toHaveLength(0);
    expect(result.warnings.some((w) => /past/i.test(w))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseImportedJson – unknown certificationType
// ---------------------------------------------------------------------------
describe("parseImportedJson – certificationType", () => {
  const base = {
    locationName: "Main Office",
    requestorName: "Jane Smith",
    requestorEmail: "jane@example.com",
    sessions: [{ date: "2099-06-15", startTime: "09:00" }],
  };

  it("blocks on an unknown certification type", () => {
    const result = parseImportedJson({ ...base, certificationType: "unknown_cert" });
    expect(result.blockingErrors.some((e) => /unrecogni/i.test(e))).toBe(true);
  });

  it("accepts all known certification types without errors", () => {
    const knownTypes = ["cpr_aed_first_aid", "stop_the_bleed", "cpr_aed_first_aid_stop_the_bleed"];
    for (const certType of knownTypes) {
      const result = parseImportedJson({ ...base, certificationType: certType });
      expect(result.blockingErrors).toHaveLength(0);
      expect(result.data.certificationType).toBe(certType);
    }
  });

  it("leaves certificationType undefined when absent (lets the form choose)", () => {
    const result = parseImportedJson(base);
    expect(result.data.certificationType).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// parseImportedJson – unrecognized file shape
// ---------------------------------------------------------------------------
describe("parseImportedJson – unrecognized file shape", () => {
  it("emits a 'doesn't look like a CPR file' message when none of the three required fields are present", () => {
    const result = parseImportedJson({ foo: "bar", someRandomKey: 42 });
    expect(result.blockingErrors).toHaveLength(1);
    expect(result.blockingErrors[0]).toMatch(/doesn't look like a CPR/i);
  });

  it("includes a sample of the unrecognized field names in the message", () => {
    const result = parseImportedJson({ unknownField: "x", anotherField: "y" });
    expect(result.blockingErrors[0]).toMatch(/unrecognized fields/i);
  });

  it("reports an empty-file message when the object has no keys at all", () => {
    const result = parseImportedJson({});
    expect(result.blockingErrors[0]).toMatch(/doesn't look like a CPR/i);
    expect(result.blockingErrors[0]).toMatch(/empty/i);
  });

  it("returns early with no data fields populated", () => {
    const result = parseImportedJson({ mystery: true });
    expect(result.data).toEqual({});
    expect(result.submittedAt).toBeNull();
  });

  it("throws when the argument is not an object at all", () => {
    expect(() => parseImportedJson(null)).toThrow();
    expect(() => parseImportedJson("a string")).toThrow();
    expect(() => parseImportedJson(42)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// parseImportedJson – optional fields and extras
// ---------------------------------------------------------------------------
describe("parseImportedJson – optional fields", () => {
  const base = {
    locationName: "Main Office",
    requestorName: "Jane Smith",
    requestorEmail: "jane@example.com",
    sessions: [{ date: "2099-06-15", startTime: "09:00" }],
  };

  it("captures submittedAt when present", () => {
    const result = parseImportedJson({ ...base, submittedAt: "2026-01-10T08:00:00.000Z" });
    expect(result.submittedAt).toBe("2026-01-10T08:00:00.000Z");
  });

  it("returns null for submittedAt when absent", () => {
    const result = parseImportedJson(base);
    expect(result.submittedAt).toBeNull();
  });

  it("extracts businessUnit from a leading 'Business Unit:' line in notes", () => {
    const result = parseImportedJson({
      ...base,
      notes: "Business Unit: EHS\nSome extra notes here.",
    });
    expect(result.data.businessUnit).toBe("EHS");
    expect(result.data.notes).toBe("Some extra notes here.");
  });

  it("prefers explicit businessUnit field over notes extraction", () => {
    const result = parseImportedJson({
      ...base,
      businessUnit: "Safety",
      notes: "Business Unit: EHS\nSome extra notes here.",
    });
    expect(result.data.businessUnit).toBe("Safety");
  });
});
