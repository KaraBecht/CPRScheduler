/**
 * Integration tests for POST /api/roster/import
 *
 * Verifies that the guard which prevents a result-less import entry from
 * blanking out a previously-set result/cardSent works correctly.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";
import { db, classesTable, classRosterTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

let testClassId: number;

/** Fetch the result field for a named attendee in the test class. */
async function getAttendee(name: string) {
  const [row] = await db
    .select()
    .from(classRosterTable)
    .where(
      and(
        eq(classRosterTable.classId, testClassId),
        eq(classRosterTable.name, name),
      ),
    );
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  const [cls] = await db
    .insert(classesTable)
    .values({
      title: "Test Class – Roster Import Guard",
      certificationType: "cpr_aed_first_aid",
      date: "2099-01-15",
      startTime: "09:00",
      location: "Test Location",
      capacity: 20,
      status: "completed",
    })
    .returning({ id: classesTable.id });
  testClassId = cls!.id;
});

afterAll(async () => {
  // Cascade deletes roster entries too.
  await db.delete(classesTable).where(eq(classesTable.id, testClassId));
});

beforeEach(async () => {
  // Start each test with a clean roster.
  await db
    .delete(classRosterTable)
    .where(eq(classRosterTable.classId, testClassId));
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/roster/import – result-preservation guard", () => {
  it("preserves an existing 'pass' when the import entry carries no result field", async () => {
    // Seed: Alice has already been marked as passing.
    await db.insert(classRosterTable).values({
      classId: testClassId,
      position: 0,
      name: "Alice Smith",
      email: "alice@example.com",
      phone: "",
      result: "pass",
      cardSent: false,
    });

    // Import the same attendee without any result data.
    const res = await request(app)
      .post("/api/roster/import")
      .send({
        classId: testClassId,
        entries: [{ name: "Alice Smith", email: "alice@example.com" }],
      });

    expect(res.status).toBe(200);
    // The row should have been skipped (not updated) because no result was supplied.
    expect(res.body.skipped).toBe(1);
    expect(res.body.updated).toBe(0);

    // The stored result must still be "pass".
    const alice = await getAttendee("Alice Smith");
    expect(alice).not.toBeNull();
    expect(alice!.result).toBe("pass");
  });

  it("updates an existing attendee's result when the import entry carries result='fail'", async () => {
    // Seed: Alice previously passed.
    await db.insert(classRosterTable).values({
      classId: testClassId,
      position: 0,
      name: "Alice Smith",
      email: "alice@example.com",
      phone: "",
      result: "pass",
      cardSent: false,
    });

    // Import the same attendee with an explicit result="fail".
    const res = await request(app)
      .post("/api/roster/import")
      .send({
        classId: testClassId,
        entries: [
          { name: "Alice Smith", email: "alice@example.com", result: "fail" },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(1);
    expect(res.body.imported).toBe(0);

    // The stored result should now be "fail".
    const alice = await getAttendee("Alice Smith");
    expect(alice!.result).toBe("fail");
  });

  it("adds a brand-new attendee normally in the same payload as a result-less existing attendee", async () => {
    // Seed: Alice already has a result.
    await db.insert(classRosterTable).values({
      classId: testClassId,
      position: 0,
      name: "Alice Smith",
      email: "alice@example.com",
      phone: "",
      result: "pass",
      cardSent: false,
    });

    // Import: existing attendee (no result) + entirely new attendee.
    const res = await request(app)
      .post("/api/roster/import")
      .send({
        classId: testClassId,
        entries: [
          { name: "Alice Smith", email: "alice@example.com" }, // existing, no result → skip
          { name: "Bob Jones", email: "bob@example.com" },     // brand new → import
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(1); // Bob added
    expect(res.body.skipped).toBe(1);  // Alice skipped (guard fired)
    expect(res.body.updated).toBe(0);

    // Alice's "pass" is untouched.
    const alice = await getAttendee("Alice Smith");
    expect(alice!.result).toBe("pass");

    // Bob was created with no result yet.
    const bob = await getAttendee("Bob Jones");
    expect(bob).not.toBeNull();
    expect(bob!.result).toBeNull();
  });
});
