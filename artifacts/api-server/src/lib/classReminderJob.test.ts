/**
 * Regression tests for the database-backed seven-day reminder claim.
 *
 * These tests intentionally use the real database. The behavior under test is
 * the atomic UPDATE ... RETURNING claim, which cannot be meaningfully verified
 * with a JavaScript-only mock of the database.
 */

import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { and, eq } from "drizzle-orm";
import { db, classesTable } from "@workspace/db";
import app from "../app";

vi.mock("./classNotifications", () => ({
  sendClassNotifications: vi.fn().mockResolvedValue(undefined),
}));

import { sendClassNotifications } from "./classNotifications";
import { sendSevenDayReminders } from "./classReminderJob";

const sendNotificationsMock = vi.mocked(sendClassNotifications);

function dateInDays(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0]!;
}

function dateAfter(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().split("T")[0]!;
}

let testClassId: number;
const reminderDate = dateInDays(7);

async function getTestClass() {
  const [row] = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.id, testClassId));
  return row!;
}

async function resetReminderState() {
  await db
    .update(classesTable)
    .set({
      date: reminderDate,
      status: "confirmed",
      sevenDayReminderClaimedAt: null,
      sevenDayReminderSentAt: null,
    })
    .where(eq(classesTable.id, testClassId));
  sendNotificationsMock.mockReset();
  sendNotificationsMock.mockResolvedValue(undefined);
}

beforeAll(async () => {
  const [row] = await db
    .insert(classesTable)
    .values({
      title: "Test Class – Seven-Day Reminder Claim",
      certificationType: "cpr_aed_first_aid",
      date: reminderDate,
      startTime: "09:00",
      location: "Test Location",
      capacity: 20,
      status: "confirmed",
    })
    .returning({ id: classesTable.id });
  testClassId = row!.id;
});

afterAll(async () => {
  await db.delete(classesTable).where(eq(classesTable.id, testClassId));
});

beforeEach(async () => {
  await resetReminderState();
});

describe("sendSevenDayReminders", () => {
  it("allows only one overlapping run to send, and keeps a sent class skipped after restart", async () => {
    let releaseSend!: () => void;
    const sendFinished = new Promise<void>((resolve) => {
      releaseSend = resolve;
    });
    let firstSendStarted!: () => void;
    const firstSendStartedPromise = new Promise<void>((resolve) => {
      firstSendStarted = resolve;
    });

    sendNotificationsMock.mockImplementationOnce(async () => {
      firstSendStarted();
      await sendFinished;
    });

    const firstRun = sendSevenDayReminders();
    await firstSendStartedPromise;

    const overlappingRun = sendSevenDayReminders();
    await overlappingRun;
    expect(sendNotificationsMock).toHaveBeenCalledTimes(1);

    releaseSend();
    await firstRun;

    const sentClass = await getTestClass();
    expect(sentClass.sevenDayReminderSentAt).not.toBeNull();
    expect(sentClass.sevenDayReminderClaimedAt).toBeNull();

    // A new process run sees the durable sent marker and does not send again.
    await sendSevenDayReminders();
    expect(sendNotificationsMock).toHaveBeenCalledTimes(1);
  });

  it("resets reminder eligibility when the class moves to a different date", async () => {
    await sendSevenDayReminders();
    expect(sendNotificationsMock).toHaveBeenCalledTimes(1);

    const movedDate = dateAfter(reminderDate, 1);
    const response = await request(app)
      .patch(`/api/classes/${testClassId}`)
      .send({ date: movedDate });

    expect(response.status).toBe(200);
    const movedClass = await getTestClass();
    expect(movedClass.date).toBe(movedDate);
    expect(movedClass.sevenDayReminderSentAt).toBeNull();
    expect(movedClass.sevenDayReminderClaimedAt).toBeNull();

    // Moving it back into the seven-day window makes it eligible again.
    const resetResponse = await request(app)
      .patch(`/api/classes/${testClassId}`)
      .send({ date: reminderDate });
    expect(resetResponse.status).toBe(200);

    await sendSevenDayReminders();
    expect(sendNotificationsMock).toHaveBeenCalledTimes(2);
  });

  it("retries a failed send and recovers a stale claim without duplicating a sent reminder", async () => {
    sendNotificationsMock.mockRejectedValueOnce(new Error("temporary mail failure"));

    await sendSevenDayReminders();
    let failedClass = await getTestClass();
    expect(sendNotificationsMock).toHaveBeenCalledTimes(1);
    expect(failedClass.sevenDayReminderClaimedAt).toBeNull();
    expect(failedClass.sevenDayReminderSentAt).toBeNull();

    await sendSevenDayReminders();
    expect(sendNotificationsMock).toHaveBeenCalledTimes(2);
    failedClass = await getTestClass();
    expect(failedClass.sevenDayReminderSentAt).not.toBeNull();
    expect(failedClass.sevenDayReminderClaimedAt).toBeNull();

    // A claim older than the one-hour lease is retryable, but a sent marker
    // still wins and prevents a second delivery.
    await db
      .update(classesTable)
      .set({ sevenDayReminderClaimedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) })
      .where(
        and(
          eq(classesTable.id, testClassId),
          eq(classesTable.sevenDayReminderSentAt, failedClass.sevenDayReminderSentAt!),
        ),
      );
    await sendSevenDayReminders();
    expect(sendNotificationsMock).toHaveBeenCalledTimes(2);

    // A stale unsent claim is safe to retry.
    await db
      .update(classesTable)
      .set({
        sevenDayReminderClaimedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        sevenDayReminderSentAt: null,
      })
      .where(eq(classesTable.id, testClassId));
    await sendSevenDayReminders();
    expect(sendNotificationsMock).toHaveBeenCalledTimes(3);
    const retriedClass = await getTestClass();
    expect(retriedClass.sevenDayReminderSentAt).not.toBeNull();
    expect(retriedClass.sevenDayReminderClaimedAt).toBeNull();
  });
});