import { describe, expect, it } from "vitest";
import {
  classStartInstant,
  isClassWithin24Hours,
} from "./instructorPreClassReminder";

describe("instructor pre-class reminder timing", () => {
  it("does not consider a class more than 24 hours away due", () => {
    const now = new Date("2026-01-15T17:00:00.000Z"); // 9:00 AM PST
    expect(
      isClassWithin24Hours(
        { date: "2026-01-16", startTime: "09:01" },
        now,
      ),
    ).toBe(false);
  });

  it("includes a class exactly 24 hours away", () => {
    const now = new Date("2026-01-15T17:00:00.000Z"); // 9:00 AM PST
    expect(
      isClassWithin24Hours(
        { date: "2026-01-16", startTime: "09:00" },
        now,
      ),
    ).toBe(true);
  });

  it("excludes a class that has already started", () => {
    const now = new Date("2026-01-15T17:01:00.000Z");
    expect(
      isClassWithin24Hours(
        { date: "2026-01-15", startTime: "09:00" },
        now,
      ),
    ).toBe(false);
  });

  it("converts summer class time using daylight-saving time", () => {
    expect(
      classStartInstant({
        date: "2026-07-15",
        startTime: "09:00",
      }).toISOString(),
    ).toBe("2026-07-15T16:00:00.000Z");
  });

  it("uses the real elapsed time across the spring DST transition", () => {
    const now = new Date("2026-03-07T18:00:00.000Z"); // 10:00 AM PST
    expect(
      isClassWithin24Hours(
        { date: "2026-03-08", startTime: "10:30" },
        now,
      ),
    ).toBe(true); // 23.5 elapsed hours because clocks spring forward
  });
});
