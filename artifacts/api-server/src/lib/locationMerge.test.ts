import { afterAll, expect, it, vi, beforeAll } from "vitest";
import request from "supertest";
import { db, classesTable, locationsTable, locationNotesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import app from "../app";
import { applyMigrations } from "./applyMigrations";
import { resolveLocationMerge } from "./locationMerge";

vi.mock("./completionRoster", () => ({ sendCompletionRoster: vi.fn().mockResolvedValue(undefined) }));
vi.mock("./classNotifications", () => ({ sendClassNotifications: vi.fn().mockResolvedValue(undefined) }));
vi.mock("./trainerNotifications", () => ({ sendTrainerInvitations: vi.fn().mockResolvedValue(undefined) }));
vi.mock("./classChecklist", () => ({ launchClassChecklist: vi.fn().mockResolvedValue(undefined) }));
const prefix = `Merge test ${Date.now()}`;
const locations: number[] = [];
const classes: number[] = [];
beforeAll(applyMigrations);
afterAll(async () => {
  if (classes.length) await db.delete(classesTable).where(inArray(classesTable.id, classes));
  if (locations.length) await db.delete(locationsTable).where(inArray(locationsTable.id, locations));
});

it("requires every conflict and supports keeping both without dropping empty-field values", () => {
  const a = { name: "WTXF", address: null, contactName: "Person A", contactEmail: null,
    contactPhone: null, notes: null, businessUnit: null, timeZone: "America/New_York" };
  const b = { ...a, name: "WTXF Philadelphia", address: "330 Market Street", contactName: "Person B" };
  expect(() => resolveLocationMerge(a, b, {})).toThrow();
  const merged = resolveLocationMerge(a, b, { name: "source", contactName: "both" });
  expect(merged.contactName).toBe("Person A; Person B");
  expect(merged.address).toBe("330 Market Street");
  expect(() => resolveLocationMerge(a, { ...a, timeZone: "America/Los_Angeles" }, { timeZone: "both" })).toThrow();
});

it("merges atomically, retains history and resolves completed classes by either alias", async () => {
  const rows = await db.insert(locationsTable).values([
    { name: `${prefix} A`, contactName: "Person A" },
    { name: `${prefix} B`, contactName: "Person B", address: "123 Test Street" },
  ]).returning();
  const [target, source] = rows;
  locations.push(...rows.map((r) => r.id));
  await db.insert(locationNotesTable).values({ locationId: source!.id, body: "Keep this note" });
  for (const [index, loc] of rows.entries()) {
    const [cls] = await db.insert(classesTable).values({
      title: loc.name, location: "123 Test Street", status: "completed",
      date: index ? "2026-10-01" : "2024-01-01",
      startTime: "10:00", capacity: 10, certificationType: "cpr_aed_first_aid",
    }).returning();
    classes.push(cls!.id);
  }
  const body = {
    sourceId: source!.id, targetUpdatedAt: target!.updatedAt.toISOString(),
    sourceUpdatedAt: source!.updatedAt.toISOString(),
    choices: { name: "source", contactName: "both" },
  };
  const url = `/api/locations/${target!.id}/merge`;
  await request(app).post(url).send({ ...body, choices: {} }).expect(400);
  await request(app).post(url).send({ ...body, sourceUpdatedAt: "stale" }).expect(409);
  expect(await db.select().from(locationsTable).where(eq(locationsTable.id, source!.id))).toHaveLength(1);
  const response = await request(app).post(url).send(body).expect(200);
  expect(response.body.contactName).toBe("Person A; Person B");
  expect(response.body.name).toBe(source!.name);
  expect(response.body.address).toBe("123 Test Street");
  expect(response.body.lastClassDate).toBe("2026-10-01");
  expect(response.body.notes_log.some((n: { body: string }) => n.body === "Keep this note")).toBe(true);
  expect(response.body.notes_log.some((n: { body: string }) => n.body.includes("Original location details"))).toBe(true);
  expect(response.body.notes_log.some((n: { body: string }) =>
    n.body.includes(`into "${target!.name}" (location ${target!.id})`))).toBe(true);
  expect(await db.select().from(locationsTable).where(eq(locationsTable.id, source!.id))).toHaveLength(0);
  for (const name of [target!.name, source!.name]) {
    const history = await request(app).get("/api/classes").query({ location: name }).expect(200);
    expect(history.body.map((c: { id: number }) => c.id).sort()).toEqual([...classes].sort());
  }
  // Re-saving a completed class under the old name must not recreate the duplicate.
  await request(app).patch(`/api/classes/${classes[1]}`).send({ status: "completed" }).expect(200);
  expect(await db.select().from(locationsTable).where(eq(locationsTable.name, source!.name))).toHaveLength(1);
  await request(app).post(url).send(body).expect(409);
});
