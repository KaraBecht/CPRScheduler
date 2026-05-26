import { Router, type IRouter } from "express";
import { parseId } from "../lib/errors";
import {
  db,
  enrollmentsTable,
  usersTable,
  classesTable,
} from "@workspace/db";
import { eq, desc, and, count } from "drizzle-orm";
import {
  EnrollStudentBody,
  UpdateEnrollmentBody,
  ListEnrollmentsQueryParams,
} from "@workspace/api-zod";
import { serializeClass } from "./classes";

const router: IRouter = Router();

router.get("/classes/:classId/enrollments", async (req, res) => {
  const classId = parseId(req.params.classId, "classId");
  const rows = await db
    .select({ e: enrollmentsTable, u: usersTable })
    .from(enrollmentsTable)
    .leftJoin(usersTable, eq(enrollmentsTable.studentId, usersTable.id))
    .where(eq(enrollmentsTable.classId, classId))
    .orderBy(desc(enrollmentsTable.enrolledAt));
  res.json(
    rows.map(({ e, u }) => ({
      id: e.id,
      classId: e.classId,
      studentId: e.studentId,
      studentName: u?.name ?? "",
      studentEmail: u?.email ?? "",
      status: e.status,
      certificateIssued: e.certificateIssued,
      enrolledAt: e.enrolledAt.toISOString(),
    })),
  );
});

router.post("/classes/:classId/enrollments", async (req, res) => {
  const classId = parseId(req.params.classId, "classId");
  const body = EnrollStudentBody.parse(req.body);
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, classId));
  if (!cls) { res.status(404).json({ error: "Class not found" }); return; }
  if (cls.status === "cancelled") { res.status(400).json({ error: "Class is cancelled" }); return; }
  const [{ value: enrolledCount }] = await db
    .select({ value: count() })
    .from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.classId, classId), eq(enrollmentsTable.status, "registered")));
  if (enrolledCount >= cls.capacity) {
    res.status(409).json({ error: "Class is at capacity" });
    return;
  }
  const [existing] = await db
    .select()
    .from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.classId, classId), eq(enrollmentsTable.studentId, body.studentId)));
  if (existing) {
    res.status(409).json({ error: "Student already enrolled in this class" });
    return;
  }
  try {
    const [row] = await db
      .insert(enrollmentsTable)
      .values({ classId, studentId: body.studentId })
      .returning();
    const [u] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, row.studentId));
    res.status(201).json({
      id: row.id,
      classId: row.classId,
      studentId: row.studentId,
      studentName: u?.name ?? "",
      studentEmail: u?.email ?? "",
      status: row.status,
      certificateIssued: row.certificateIssued,
      enrolledAt: row.enrolledAt.toISOString(),
    });
  } catch (err) {
    req.log?.error({ err }, "Enrollment insert failed");
    res.status(500).json({ error: "Failed to enroll student" });
  }
});

router.patch("/enrollments/:enrollmentId", async (req, res) => {
  const id = parseId(req.params.enrollmentId, "enrollmentId");
  const body = UpdateEnrollmentBody.parse(req.body);
  const [row] = await db
    .update(enrollmentsTable)
    .set(body)
    .where(eq(enrollmentsTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Enrollment not found" }); return; }
  const [u] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, row.studentId));
  res.json({
    id: row.id,
    classId: row.classId,
    studentId: row.studentId,
    studentName: u?.name ?? "",
    studentEmail: u?.email ?? "",
    status: row.status,
    certificateIssued: row.certificateIssued,
    enrolledAt: row.enrolledAt.toISOString(),
  });
});

router.delete("/enrollments/:enrollmentId", async (req, res) => {
  const id = parseId(req.params.enrollmentId, "enrollmentId");
  await db.delete(enrollmentsTable).where(eq(enrollmentsTable.id, id));
  res.status(204).end();
});

router.get("/enrollments", async (req, res) => {
  const params = ListEnrollmentsQueryParams.parse(req.query);
  const rows = await db
    .select({ e: enrollmentsTable, c: classesTable })
    .from(enrollmentsTable)
    .leftJoin(classesTable, eq(enrollmentsTable.classId, classesTable.id))
    .where(
      params.studentId
        ? eq(enrollmentsTable.studentId, params.studentId)
        : undefined,
    )
    .orderBy(desc(enrollmentsTable.enrolledAt));
  const out = await Promise.all(
    rows.map(async ({ e, c }) => ({
      id: e.id,
      classId: e.classId,
      studentId: e.studentId,
      status: e.status,
      certificateIssued: e.certificateIssued,
      enrolledAt: e.enrolledAt.toISOString(),
      classSession: c ? await serializeClass(c) : null,
    })),
  );
  res.json(out);
});

export default router;
