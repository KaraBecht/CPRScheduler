import { Router, type IRouter } from "express";
import {
  db,
  certificatesTable,
  usersTable,
  enrollmentsTable,
  classesTable,
  classRosterTable,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import {
  CreateCertificateBody,
  ListCertificatesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function serialize(row: typeof certificatesTable.$inferSelect) {
  const [u] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, row.studentId));
  let classTitle: string | null = null;
  let classLocation: string | null = null;
  if (row.classId) {
    const [c] = await db
      .select()
      .from(classesTable)
      .where(eq(classesTable.id, row.classId));
    classTitle = c?.title ?? null;
    classLocation = c?.location ?? null;
  }
  return {
    id: row.id,
    studentId: row.studentId,
    studentName: u?.name ?? "",
    studentOrganization: u?.organization ?? null,
    classId: row.classId,
    classTitle,
    classLocation,
    certificationType: row.certificationType,
    certificateNumber: row.certificateNumber,
    issuedDate: row.issuedDate,
    expiryDate: row.expiryDate,
  };
}

router.get("/certificates", async (req, res) => {
  const params = ListCertificatesQueryParams.parse(req.query);
  const rows = await db
    .select()
    .from(certificatesTable)
    .where(
      params.studentId
        ? eq(certificatesTable.studentId, params.studentId)
        : undefined,
    )
    .orderBy(desc(certificatesTable.issuedDate));
  const real = await Promise.all(rows.map(serialize));

  let virtuals: Awaited<ReturnType<typeof serialize>>[] = [];
  if (!params.studentId) {
    const rosterRows = await db
      .select({ r: classRosterTable, c: classesTable })
      .from(classRosterTable)
      .innerJoin(classesTable, eq(classRosterTable.classId, classesTable.id))
      .where(eq(classRosterTable.cardSent, true));
    virtuals = rosterRows
      .filter(({ r }) => r.name.trim() !== "")
      .map(({ r, c }) => {
        const issued = c.date;
        const expiry = new Date(c.date);
        expiry.setFullYear(expiry.getFullYear() + 2);
        return {
          id: -(c.id * 1000 + r.position + 1),
          studentId: 0,
          studentName: r.name,
          studentOrganization: null,
          classId: c.id,
          classTitle: c.title,
          classLocation: c.location,
          certificationType: c.certificationType,
          certificateNumber: `ROSTER-${c.id}-${r.position}`,
          issuedDate: issued,
          expiryDate: expiry.toISOString().split("T")[0]!,
        };
      });
  }

  const combined = [...real, ...virtuals].sort((a, b) =>
    a.issuedDate < b.issuedDate ? 1 : a.issuedDate > b.issuedDate ? -1 : 0,
  );
  res.json(combined);
});

router.post("/certificates", async (req, res) => {
  const body = CreateCertificateBody.parse(req.body);
  const [enrollment] = await db
    .select()
    .from(enrollmentsTable)
    .where(
      and(
        eq(enrollmentsTable.classId, body.classId),
        eq(enrollmentsTable.studentId, body.studentId),
      ),
    );
  if (!enrollment) {
    res.status(404).json({ error: "Enrollment not found for this student/class" });
    return;
  }
  if (enrollment.status !== "attended") {
    res.status(400).json({ error: "Student must be marked attended before issuing a certificate" });
    return;
  }
  if (enrollment.certificateIssued) {
    res.status(409).json({ error: "Certificate already issued for this enrollment" });
    return;
  }
  const issuedDate = new Date();
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 2);
  const certificateNumber = `PP-${body.certificationType.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const [row] = await db
    .insert(certificatesTable)
    .values({
      studentId: body.studentId,
      classId: body.classId,
      certificationType: body.certificationType,
      certificateNumber,
      issuedDate: issuedDate.toISOString().split("T")[0]!,
      expiryDate: expiryDate.toISOString().split("T")[0]!,
    })
    .returning();
  // mark enrollment certificate_issued
  await db
    .update(enrollmentsTable)
    .set({ certificateIssued: true })
    .where(
      and(
        eq(enrollmentsTable.classId, body.classId),
        eq(enrollmentsTable.studentId, body.studentId),
      ),
    );
  res.status(201).json(await serialize(row));
});

export default router;
