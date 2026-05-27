import { Router, type IRouter } from "express";
import { parseId } from "../lib/errors";
import { db, classesTable, classRosterTable } from "@workspace/db";
import { eq, asc, desc, ne, sql } from "drizzle-orm";
import { SaveClassRosterBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function loadRoster(classId: number, capacity: number) {
  const rows = await db
    .select()
    .from(classRosterTable)
    .where(eq(classRosterTable.classId, classId))
    .orderBy(asc(classRosterTable.position));
  const byPos = new Map(rows.map((r) => [r.position, r]));
  const entries = Array.from({ length: capacity }, (_, i) => {
    const r = byPos.get(i);
    return {
      position: i,
      name: r?.name ?? "",
      email: r?.email ?? "",
      phone: r?.phone ?? "",
    };
  });
  return { classId, capacity, entries };
}

router.get("/roster-attendees", async (_req, res) => {
  const rows = await db
    .select({
      classId: classesTable.id,
      classTitle: classesTable.title,
      classDate: classesTable.date,
      classLocation: classesTable.location,
      name: classRosterTable.name,
      position: classRosterTable.position,
    })
    .from(classRosterTable)
    .innerJoin(classesTable, eq(classRosterTable.classId, classesTable.id))
    .where(ne(sql`trim(${classRosterTable.name})`, ""))
    .orderBy(desc(classesTable.date), asc(classesTable.startTime), asc(classRosterTable.position));
  res.json(
    rows.map((r) => ({
      classId: r.classId,
      classTitle: r.classTitle,
      classDate: r.classDate,
      classLocation: r.classLocation,
      name: r.name,
    })),
  );
});

router.get("/classes/:classId/roster", async (req, res) => {
  const classId = parseId(req.params.classId, "classId");
  const [cls] = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.id, classId));
  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  res.json(await loadRoster(classId, cls.capacity));
});

router.put("/classes/:classId/roster", async (req, res) => {
  const classId = parseId(req.params.classId, "classId");
  const [cls] = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.id, classId));
  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  const body = SaveClassRosterBody.parse(req.body);
  await db.transaction(async (tx) => {
    await tx.delete(classRosterTable).where(eq(classRosterTable.classId, classId));
    const filled = body.entries.filter(
      (e) => e.name.trim() || e.email.trim() || e.phone.trim(),
    );
    if (filled.length > 0) {
      await tx.insert(classRosterTable).values(
        filled.map((e) => ({
          classId,
          position: e.position,
          name: e.name,
          email: e.email,
          phone: e.phone,
        })),
      );
    }
  });
  res.json(await loadRoster(classId, cls.capacity));
});

export default router;
