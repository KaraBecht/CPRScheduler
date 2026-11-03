import { Router, type IRouter } from "express";
import {
  db,
  locationsTable,
  locationNotesTable,
  classesTable,
  certificatesTable,
  classRosterTable,
} from "@workspace/db";
import { eq, desc, ilike, lte, or, inArray, asc } from "drizzle-orm";
import {
  CreateLocationBody,
  UpdateLocationBody,
  CreateLocationNoteBody,
  MergeLocationsBody,
} from "@workspace/api-zod";
import { isValidTimeZone } from "../lib/timeZones";
import { locationClassCondition } from "../lib/locationMatching";
import { resolveLocationMerge } from "../lib/locationMerge";

const router: IRouter = Router();

async function buildDetail(loc: typeof locationsTable.$inferSelect) {
  const notes_log = await db
    .select()
    .from(locationNotesTable)
    .where(eq(locationNotesTable.locationId, loc.id))
    .orderBy(desc(locationNotesTable.createdAt));

  // Find classes whose location text OR title matches this location's name
  const matchedClasses = await db
    .select()
    .from(classesTable)
    .where(
      locationClassCondition([loc.name, ...loc.aliases])
    )
    .orderBy(desc(classesTable.date));

  // Upcoming/cancelled sessions must not replace the latest completed training.
  const lastClass = matchedClasses.find((c) => c.status === "completed") ?? null;

  // Expiring certificates: those tied to classes at this location, expiring within 6 months
  const classIds = matchedClasses.map((c) => c.id);
  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  const ninetyStr = sixMonths.toISOString().split("T")[0]!;
  const today = new Date().toISOString().split("T")[0]!;

  let expiringCertificates: object[] = [];
  if (classIds.length > 0) {
    const certs = await db.select().from(certificatesTable);
    expiringCertificates = certs.filter(
      (c) =>
        c.classId !== null &&
        classIds.includes(c.classId) &&
        c.expiryDate >= today &&
        c.expiryDate <= ninetyStr,
    );

    // Also include roster-based virtual certs
    const rosterRows = await db
      .select({ r: classRosterTable, c: classesTable })
      .from(classRosterTable)
      .innerJoin(classesTable, eq(classRosterTable.classId, classesTable.id))
      .where(eq(classRosterTable.cardSent, true));

    const virtualExpiring = rosterRows
      .filter(({ c }) => classIds.includes(c.id))
      .map(({ r, c }) => {
        const expiry = new Date(c.date);
        expiry.setFullYear(expiry.getFullYear() + 2);
        const expiryDate = expiry.toISOString().split("T")[0]!;
        if (expiryDate < today || expiryDate > ninetyStr) return null;
        return {
          id: -(c.id * 1000 + r.position + 1),
          studentId: 0,
          studentName: r.name,
          classId: c.id,
          classTitle: c.title,
          classLocation: c.location,
          certificationType: c.certificationType,
          certificateNumber: `ROSTER-${c.id}-${r.position}`,
          issuedDate: c.date,
          expiryDate,
        };
      })
      .filter(Boolean);

    expiringCertificates = [...expiringCertificates, ...virtualExpiring.filter((x): x is NonNullable<typeof x> => x !== null)];
  }

  return {
    id: loc.id,
    name: loc.name,
    address: loc.address,
    timeZone: loc.timeZone,
    contactName: loc.contactName,
    contactEmail: loc.contactEmail,
    contactPhone: loc.contactPhone,
    notes: loc.notes,
    businessUnit: loc.businessUnit,
    createdAt: loc.createdAt.toISOString(),
    updatedAt: loc.updatedAt.toISOString(),
    notes_log: notes_log.map((n) => ({
      id: n.id,
      locationId: n.locationId,
      body: n.body,
      createdAt: n.createdAt.toISOString(),
    })),
    lastClassDate: lastClass?.date ?? null,
    lastClassTitle: lastClass?.title ?? null,
    lastClassId: lastClass?.id ?? null,
    expiringCertificates,
  };
}

// GET /locations
router.get("/locations", async (req, res) => {
  const rows = await db
    .select()
    .from(locationsTable)
    .orderBy(locationsTable.name);
  const details = await Promise.all(rows.map(buildDetail));
  res.json(details);
});

// POST /locations
router.post("/locations", async (req, res) => {
  const body = CreateLocationBody.parse(req.body);
  if (body.timeZone !== undefined && !isValidTimeZone(body.timeZone)) {
    res.status(400).json({ error: "Invalid IANA time zone" });
    return;
  }
  const [row] = await db
    .insert(locationsTable)
    .values({
      name: body.name,
      address: body.address ?? null,
      timeZone: body.timeZone,
      contactName: body.contactName ?? null,
      contactEmail: body.contactEmail ?? null,
      contactPhone: body.contactPhone ?? null,
      notes: body.notes ?? null,
      businessUnit: body.businessUnit ?? null,
    })
    .returning();
  res.status(201).json(await buildDetail(row));
});

// GET /locations/:locationId
router.get("/locations/:locationId", async (req, res) => {
  const id = parseInt(req.params.locationId, 10);
  const [row] = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Location not found" });
    return;
  }
  res.json(await buildDetail(row));
});

// PATCH /locations/:locationId
router.patch("/locations/:locationId", async (req, res) => {
  const id = parseInt(req.params.locationId, 10);
  const body = UpdateLocationBody.parse(req.body);
  if (body.timeZone !== undefined && !isValidTimeZone(body.timeZone)) {
    res.status(400).json({ error: "Invalid IANA time zone" });
    return;
  }
  const [existing] = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Location not found" });
    return;
  }
  const [row] = await db
    .update(locationsTable)
    .set({
      name: body.name ?? existing.name,
      aliases: body.name && body.name !== existing.name
        ? [...new Set([...existing.aliases, existing.name])]
        : existing.aliases,
      address: body.address !== undefined ? body.address : existing.address,
      timeZone: body.timeZone !== undefined ? body.timeZone : existing.timeZone,
      contactName:
        body.contactName !== undefined ? body.contactName : existing.contactName,
      contactEmail:
        body.contactEmail !== undefined
          ? body.contactEmail
          : existing.contactEmail,
      contactPhone:
        body.contactPhone !== undefined
          ? body.contactPhone
          : existing.contactPhone,
      notes: body.notes !== undefined ? body.notes : existing.notes,
      businessUnit: body.businessUnit !== undefined ? body.businessUnit : existing.businessUnit,
      updatedAt: new Date(),
    })
    .where(eq(locationsTable.id, id))
    .returning();
  res.json(await buildDetail(row));
});

// Confirmed merges are atomic. Original details are retained in the note log.
router.post("/locations/:locationId/merge", async (req, res): Promise<void> => {
  const targetId = Number(req.params.locationId);
  const parsed = MergeLocationsBody.safeParse(req.body);
  if (!Number.isSafeInteger(targetId) || targetId < 1 || !parsed.success ||
      parsed.data.sourceId === targetId || parsed.data.sourceId < 1) {
    res.status(400).json({ error: "Select two different valid locations." });
    return;
  }
  const body = parsed.data;
  const result = await db.transaction(async (tx) => {
    const rows = await tx.select().from(locationsTable)
      .where(inArray(locationsTable.id, [targetId, body.sourceId]))
      .orderBy(asc(locationsTable.id)).for("update");
    const target = rows.find((r) => r.id === targetId);
    const source = rows.find((r) => r.id === body.sourceId);
    if (!target || !source) return { error: "A location no longer exists. Reload and review again.", status: 409 } as const;
    if (target.updatedAt.toISOString() !== body.targetUpdatedAt ||
        source.updatedAt.toISOString() !== body.sourceUpdatedAt) {
      return { error: "Location details changed. Reload and review the merge again.", status: 409 } as const;
    }
    let values;
    try {
      values = resolveLocationMerge(target, source, body.choices);
    } catch (error) {
      return { error: (error as Error).message, status: 400 } as const;
    }
    const aliases = [...new Set([
      ...target.aliases, ...source.aliases, target.name, source.name,
    ])].filter((name) => name !== values.name);
    const [merged] = await tx.update(locationsTable).set({
      ...values, name: values.name!, timeZone: values.timeZone!,
      aliases, updatedAt: new Date(),
    }).where(eq(locationsTable.id, targetId)).returning();
    await tx.update(locationNotesTable).set({ locationId: targetId })
      .where(eq(locationNotesTable.locationId, source.id));
    await tx.insert(locationNotesTable).values({
      locationId: targetId,
      body: `Merged "${source.name}" (location ${source.id}) into "${target.name}" (location ${target.id}). Resulting name: "${merged!.name}". Original location details (before merge):\n${JSON.stringify({ target, source }, null, 2)}`,
    });
    await tx.delete(locationsTable).where(eq(locationsTable.id, source.id));
    return { row: merged! } as const;
  });
  if (result.status !== undefined) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json(await buildDetail(result.row));
});

// DELETE /locations/:locationId
router.delete("/locations/:locationId", async (req, res) => {
  const id = parseInt(req.params.locationId, 10);
  const [existing] = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Location not found" });
    return;
  }
  await db.delete(locationsTable).where(eq(locationsTable.id, id));
  res.status(204).send();
});

// POST /locations/:locationId/notes
router.post("/locations/:locationId/notes", async (req, res) => {
  const locationId = parseInt(req.params.locationId, 10);
  const [loc] = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.id, locationId));
  if (!loc) {
    res.status(404).json({ error: "Location not found" });
    return;
  }
  const body = CreateLocationNoteBody.parse(req.body);
  const [note] = await db
    .insert(locationNotesTable)
    .values({ locationId, body: body.body })
    .returning();
  res.status(201).json({
    id: note.id,
    locationId: note.locationId,
    body: note.body,
    createdAt: note.createdAt.toISOString(),
  });
});

// DELETE /locations/:locationId/notes/:noteId
router.delete("/locations/:locationId/notes/:noteId", async (req, res) => {
  const locationId = parseInt(req.params.locationId, 10);
  const noteId = parseInt(req.params.noteId, 10);
  const [note] = await db
    .select()
    .from(locationNotesTable)
    .where(eq(locationNotesTable.id, noteId));
  if (!note || note.locationId !== locationId) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  await db.delete(locationNotesTable).where(eq(locationNotesTable.id, noteId));
  res.status(204).send();
});

export default router;
