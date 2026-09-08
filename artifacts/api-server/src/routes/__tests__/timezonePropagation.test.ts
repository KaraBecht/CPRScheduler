import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  classesTable,
  locationsTable,
  requestsTable,
  usersTable,
} from "@workspace/db";
import app from "../../app";
import { isClassWithin24Hours } from "../../lib/instructorPreClassReminder";

const locationName = "Timezone Propagation Regression Venue";
const requestorEmail = "timezone-propagation-regression@example.com";
const classIds: number[] = [];
let locationId: number;
let requestorId: number;
let requestId: number;

beforeAll(async () => {
  const previousRequests = await db
    .select({ id: requestsTable.id })
    .from(requestsTable)
    .where(eq(requestsTable.organizationName, locationName));
  if (previousRequests.length > 0) {
    const previousRequestIds = previousRequests.map((row) => row.id);
    await db
      .update(requestsTable)
      .set({ classId: null })
      .where(inArray(requestsTable.id, previousRequestIds));
    await db
      .delete(requestsTable)
      .where(inArray(requestsTable.id, previousRequestIds));
  }
  await db.delete(classesTable).where(eq(classesTable.title, locationName));
  await db.delete(locationsTable).where(eq(locationsTable.name, locationName));
  await db.delete(usersTable).where(eq(usersTable.email, requestorEmail));

  const [location] = await db
    .insert(locationsTable)
    .values({
      name: locationName,
      timeZone: "America/New_York",
    })
    .returning({ id: locationsTable.id });
  locationId = location!.id;

  const [user] = await db
    .insert(usersTable)
    .values({
      name: "Timezone Propagation Tester",
      email: requestorEmail,
      role: "requestor",
    })
    .returning({ id: usersTable.id });
  requestorId = user!.id;

  const [trainingRequest] = await db
    .insert(requestsTable)
    .values({
      requestorId,
      organizationName: locationName,
      contactEmail: requestorEmail,
      certificationType: "cpr_aed_first_aid",
      preferredDate: "2030-06-10",
      preferredLocation: locationName,
      numberOfClasses: 1,
      sessions: [{ date: "2030-06-10", startTime: "09:00" }],
      attendeeCount: 10,
    })
    .returning({ id: requestsTable.id });
  requestId = trainingRequest!.id;
});

afterAll(async () => {
  await db
    .update(requestsTable)
    .set({ classId: null })
    .where(eq(requestsTable.id, requestId));
  if (classIds.length > 0) {
    await db.delete(classesTable).where(inArray(classesTable.id, classIds));
  }
  await db.delete(requestsTable).where(eq(requestsTable.id, requestId));
  await db.delete(locationsTable).where(eq(locationsTable.id, locationId));
  await db.delete(usersTable).where(eq(usersTable.id, requestorId));
});

describe("class timezone propagation", () => {
  it("inherits a matching location timezone for direct class creation", async () => {
    const response = await request(app)
      .post("/api/classes")
      .send({
        title: locationName,
        certificationType: "cpr_aed_first_aid",
        date: "2030-06-11",
        startTime: "09:00",
        location: "123 Main St, New York, NY",
        capacity: 10,
        status: "confirmed",
      });

    expect(response.status).toBe(201);
    expect(response.body.timeZone).toBe("America/New_York");
    const [createdClass] = await db
      .select()
      .from(classesTable)
      .where(eq(classesTable.id, response.body.id));
    expect(
      isClassWithin24Hours(
        createdClass!,
        new Date("2030-06-10T13:00:00.000Z"),
      ),
    ).toBe(true);
    classIds.push(response.body.id);
  });

  it("inherits a matching location timezone when approving a request", async () => {
    const response = await request(app)
      .patch(`/api/requests/${requestId}`)
      .send({ status: "approved" });

    expect(response.status).toBe(200);
    expect(response.body.createdClasses).toHaveLength(1);
    expect(response.body.createdClasses[0].timeZone).toBe("America/New_York");
    const [createdClass] = await db
      .select()
      .from(classesTable)
      .where(eq(classesTable.id, response.body.createdClasses[0].id));
    expect(
      isClassWithin24Hours(
        createdClass!,
        new Date("2030-06-09T13:00:00.000Z"),
      ),
    ).toBe(true);
    classIds.push(response.body.createdClasses[0].id);
  });
});