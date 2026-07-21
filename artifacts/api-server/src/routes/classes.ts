import { Router, type IRouter } from "express";
import { parseId } from "../lib/errors";
import {
  db,
  classesTable,
  enrollmentsTable,
  classRosterTable,
  usersTable,
  certificatesTable,
} from "@workspace/db";
import { and, eq, gte, ne, sql, desc, asc, isNotNull } from "drizzle-orm";
import {
  CreateClassBody,
  UpdateClassBody,
  ListClassesQueryParams,
} from "@workspace/api-zod";
import { serializeUser } from "./users";

const router: IRouter = Router();

async function serializeClass(row: typeof classesTable.$inferSelect) {
  const [[enrollCounts], [rosterCounts]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(enrollmentsTable)
      .where(
        and(
          eq(enrollmentsTable.classId, row.id),
          sql`${enrollmentsTable.status} <> 'cancelled'`,
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(classRosterTable)
      .where(
        and(
          eq(classRosterTable.classId, row.id),
          ne(sql`trim(${classRosterTable.name})`, ""),
        ),
      ),
  ]);
  const enrolledCount = Math.max(
    enrollCounts?.count ?? 0,
    rosterCounts?.count ?? 0,
  );
  let instructorName: string | null = null;
  if (row.instructorId) {
    const [u] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, row.instructorId));
    instructorName = u?.name ?? null;
  }
  return {
    id: row.id,
    title: row.title,
    certificationType: row.certificationType,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    location: row.location,
    capacity: row.capacity,
    enrolledCount,
    status: row.status,
    instructorId: row.instructorId,
    instructorName,
    description: row.description,
  };
}

router.get("/classes", async (req, res) => {
  const params = ListClassesQueryParams.parse(req.query);
  const conditions = [];
  if (params.status) conditions.push(eq(classesTable.status, params.status));
  if (params.instructorId)
    conditions.push(eq(classesTable.instructorId, params.instructorId));
  if (params.upcoming) {
    const today = new Date().toISOString().split("T")[0]!;
    conditions.push(gte(classesTable.date, today));
  }
  const rows = await db
    .select()
    .from(classesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(classesTable.date), asc(classesTable.startTime));
  const out = await Promise.all(rows.map(serializeClass));
  res.json(out);
});

router.post("/classes", async (req, res) => {
  const body = CreateClassBody.parse(req.body);
  const [row] = await db.insert(classesTable).values(body).returning();
  res.status(201).json(await serializeClass(row));
});

router.get("/classes/:classId", async (req, res) => {
  const classId = parseId(req.params.classId, "classId");
  const [row] = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.id, classId));
  if (!row) { res.status(404).json({ error: "Class not found" }); return; }
  const base = await serializeClass(row);
  const enrolls = await db
    .select({
      e: enrollmentsTable,
      u: usersTable,
    })
    .from(enrollmentsTable)
    .leftJoin(usersTable, eq(enrollmentsTable.studentId, usersTable.id))
    .where(eq(enrollmentsTable.classId, classId))
    .orderBy(desc(enrollmentsTable.enrolledAt));
  res.json({
    ...base,
    enrollments: enrolls.map(({ e, u }) => ({
      id: e.id,
      classId: e.classId,
      studentId: e.studentId,
      studentName: u?.name ?? "",
      studentEmail: u?.email ?? "",
      status: e.status,
      certificateIssued: e.certificateIssued,
      enrolledAt: e.enrolledAt.toISOString(),
    })),
  });
});

router.patch("/classes/:classId", async (req, res) => {
  const classId = parseId(req.params.classId, "classId");
  const body = UpdateClassBody.parse(req.body);
  const [row] = await db
    .update(classesTable)
    .set(body)
    .where(eq(classesTable.id, classId))
    .returning();
  if (!row) { res.status(404).json({ error: "Class not found" }); return; }
  res.json(await serializeClass(row));
});

router.delete("/classes/:classId", async (req, res) => {
  const classId = parseId(req.params.classId, "classId");
  await db.transaction(async (tx) => {
    // Null out classId on certificates (no cascade FK — preserves cert records)
    await tx
      .update(certificatesTable)
      .set({ classId: null })
      .where(and(isNotNull(certificatesTable.classId), eq(certificatesTable.classId, classId)));
    // Cascade-delete class (roster + enrollments cascade via FK)
    await tx.delete(classesTable).where(eq(classesTable.id, classId));
  });
  res.status(204).end();
});

export { serializeClass };
export default router;
