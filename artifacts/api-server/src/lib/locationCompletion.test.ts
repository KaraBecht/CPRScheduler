import { afterAll, expect, it, vi } from "vitest";
import request from "supertest";
import { db, classesTable, locationsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import app from "../app";

vi.mock("./completionRoster", () => ({
  sendCompletionRoster: vi.fn().mockResolvedValue(undefined),
}));

const name = `Location completion regression ${Date.now()}`;
const ids: number[] = [];

afterAll(async () => {
  if (ids.length) await db.delete(classesTable).where(inArray(classesTable.id, ids));
  await db.delete(locationsTable).where(eq(locationsTable.name, name));
});

it("creates a location on completion and uses completed training, not newer upcoming/cancelled sessions", async () => {
  for (const [status, date] of [
    ["confirmed", "2026-10-01"],
    ["confirmed", "2027-01-01"],
    ["cancelled", "2027-02-01"],
  ] as const) {
    const [row] = await db.insert(classesTable).values({
      title: name, location: name, status, date,
      startTime: "09:00", capacity: 10, certificationType: "cpr_aed_first_aid",
    }).returning();
    ids.push(row!.id);
  }
  await request(app).patch(`/api/classes/${ids[0]}`)
    .send({ status: "completed" }).expect(200);
  const [loc] = await db.select().from(locationsTable).where(eq(locationsTable.name, name));
  expect(loc).toBeDefined();
  const response = await request(app).get(`/api/locations/${loc!.id}`).expect(200);
  expect(response.body.lastClassId).toBe(ids[0]);
  expect(response.body.lastClassDate).toBe("2026-10-01");
  const history = await request(app).get("/api/classes").query({ location: name }).expect(200);
  expect(history.body.find((c: { id: number }) => c.id === ids[0]).status).toBe("completed");
  await request(app).patch(`/api/classes/${ids[0]}`)
    .send({ status: "cancelled" }).expect(200);
  const reverted = await request(app).get(`/api/locations/${loc!.id}`).expect(200);
  expect(reverted.body.lastClassDate).toBeNull();
});
