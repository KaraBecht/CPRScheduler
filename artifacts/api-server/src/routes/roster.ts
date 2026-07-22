import { Router, type IRouter } from "express";
import { parseId } from "../lib/errors";
import { db, classesTable, classRosterTable } from "@workspace/db";
import { eq, and, asc, desc, ne, sql } from "drizzle-orm";
import {
  SaveClassRosterBody,
  UpdateRosterEntryBody,
} from "@workspace/api-zod";
import { sendEmail, buildSigninNotificationEmail } from "../lib/sendgrid";

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
      result: r?.result ?? null,
      cardSent: r?.cardSent ?? false,
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
      result: classRosterTable.result,
      cardSent: classRosterTable.cardSent,
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
      position: r.position,
      result: r.result,
      cardSent: r.cardSent,
    })),
  );
});

router.patch("/classes/:classId/roster/:position", async (req, res) => {
  const classId = parseId(req.params.classId, "classId");
  const position = Number(req.params.position);
  if (!Number.isInteger(position) || position < 0) {
    res.status(400).json({ error: `Invalid position: ${req.params.position}` });
    return;
  }
  const body = UpdateRosterEntryBody.parse(req.body);
  const [cls] = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.id, classId));
  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  const [existing] = await db
    .select()
    .from(classRosterTable)
    .where(
      and(
        eq(classRosterTable.classId, classId),
        eq(classRosterTable.position, position),
      ),
    );
  const merged = {
    classId,
    position,
    name: body.name ?? existing?.name ?? "",
    email: body.email ?? existing?.email ?? "",
    phone: body.phone ?? existing?.phone ?? "",
    result: body.result !== undefined ? body.result : (existing?.result ?? null),
    cardSent:
      body.cardSent !== undefined ? body.cardSent : (existing?.cardSent ?? false),
  };
  let row;
  if (existing) {
    [row] = await db
      .update(classRosterTable)
      .set(merged)
      .where(
        and(
          eq(classRosterTable.classId, classId),
          eq(classRosterTable.position, position),
        ),
      )
      .returning();
  } else {
    [row] = await db.insert(classRosterTable).values(merged).returning();
  }
  res.json({
    position: row!.position,
    name: row!.name,
    email: row!.email,
    phone: row!.phone,
    result: row!.result,
    cardSent: row!.cardSent,
  });
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
      (e) =>
        e.name.trim() ||
        e.email.trim() ||
        e.phone.trim() ||
        e.result ||
        e.cardSent,
    );
    if (filled.length > 0) {
      await tx.insert(classRosterTable).values(
        filled.map((e) => ({
          classId,
          position: e.position,
          name: e.name,
          email: e.email,
          phone: e.phone,
          result: e.result ?? null,
          cardSent: e.cardSent,
        })),
      );
    }
  });
  res.json(await loadRoster(classId, cls.capacity));
});

router.post("/roster/import", async (req, res) => {
  const { classId, date, startTime, entries } = req.body as {
    classId?: number;
    date?: string;
    startTime?: string;
    entries: { name: string; email?: string; phone?: string }[];
  };

  if (!Array.isArray(entries) || entries.length === 0) {
    res.status(400).json({ error: "entries array is required" });
    return;
  }

  let cls: typeof classesTable.$inferSelect | undefined;

  if (classId) {
    [cls] = await db.select().from(classesTable).where(eq(classesTable.id, classId));
  } else if (date && startTime) {
    [cls] = await db
      .select()
      .from(classesTable)
      .where(and(eq(classesTable.date, date), eq(classesTable.startTime, startTime)));
  }

  if (!cls) {
    res.status(404).json({ error: "No matching class found for the provided date/time" });
    return;
  }

  const existing = await db
    .select({ position: classRosterTable.position, name: classRosterTable.name, email: classRosterTable.email })
    .from(classRosterTable)
    .where(eq(classRosterTable.classId, cls.id));

  const filledPositions = new Set(existing.map((r) => r.position));
  const existingNames = new Set(existing.map((r) => r.name.trim().toLowerCase()));
  const existingEmails = new Set(existing.filter((r) => r.email).map((r) => r.email!.trim().toLowerCase()));

  let nextSlot = 0;
  const findSlot = () => {
    while (nextSlot < cls!.capacity && filledPositions.has(nextSlot)) nextSlot++;
    return nextSlot < cls!.capacity ? nextSlot++ : -1;
  };

  let imported = 0;
  let skipped = 0;

  for (const entry of entries) {
    const name = entry.name?.trim();
    if (!name) { skipped++; continue; }
    const email = entry.email?.trim() ?? "";
    const phone = entry.phone?.trim() ?? "";

    const isDuplicate =
      existingNames.has(name.toLowerCase()) ||
      (email && existingEmails.has(email.toLowerCase()));
    if (isDuplicate) { skipped++; continue; }

    const slot = findSlot();
    if (slot === -1) { skipped++; continue; }

    await db.insert(classRosterTable).values({ classId: cls.id, position: slot, name, email, phone, result: null, cardSent: false });
    filledPositions.add(slot);
    existingNames.add(name.toLowerCase());
    if (email) existingEmails.add(email.toLowerCase());
    imported++;
  }

  res.json({ classId: cls.id, classTitle: cls.title, classDate: cls.date, imported, skipped });
});

router.get("/public/classes/:classId/signin-sheet", async (req, res) => {
  const classId = parseId(req.params.classId, "classId");
  const [cls] = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.id, classId));
  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  const rows = await db
    .select({
      position: classRosterTable.position,
      name: classRosterTable.name,
    })
    .from(classRosterTable)
    .where(eq(classRosterTable.classId, classId))
    .orderBy(asc(classRosterTable.position));

  const signedIn = rows.filter((r) => r.name?.trim());
  res.json({
    classId: cls.id,
    title: cls.title,
    date: cls.date,
    startTime: cls.startTime,
    endTime: cls.endTime,
    location: cls.location,
    capacity: cls.capacity,
    certificationType: cls.certificationType,
    signedInCount: signedIn.length,
    attendees: signedIn.map((r) => ({ position: r.position, name: r.name })),
  });
});

router.post("/public/classes/:classId/roster-signin", async (req, res) => {
  const classId = parseId(req.params.classId, "classId");
  const { name, email, phone } = req.body as {
    name?: string;
    email?: string;
    phone?: string;
  };
  if (!name?.trim()) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const [cls] = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.id, classId));
  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  const existing = await db
    .select({
      position: classRosterTable.position,
      name: classRosterTable.name,
      email: classRosterTable.email,
    })
    .from(classRosterTable)
    .where(eq(classRosterTable.classId, classId));

  const trimmedName = name.trim().toLowerCase();
  const trimmedEmail = email?.trim().toLowerCase() ?? "";
  const duplicate = existing.find((r) => {
    if (trimmedEmail && r.email?.toLowerCase() === trimmedEmail) return true;
    return r.name?.toLowerCase() === trimmedName;
  });
  if (duplicate) {
    res.status(409).json({ error: "You're already on the roster for this class." });
    return;
  }

  const filled = new Set(existing.map((r) => r.position));
  let slot = -1;
  for (let i = 0; i < cls.capacity; i++) {
    if (!filled.has(i)) {
      slot = i;
      break;
    }
  }
  if (slot === -1) {
    res.status(409).json({ error: "Class is full" });
    return;
  }
  await db.insert(classRosterTable).values({
    classId,
    position: slot,
    name: name.trim(),
    email: email?.trim() ?? "",
    phone: phone?.trim() ?? "",
    result: null,
    cardSent: false,
  });

  // Fire-and-forget: send notification email to admin
  const adminEmail =
    process.env["NOTIFY_ADMIN_EMAIL"] ?? "cprclassesfox@gmail.com";
  const totalSignedIn = existing.length + 1;
  const emailContent = buildSigninNotificationEmail({
    name: name.trim(),
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    classTitle: cls.title,
    classDate: cls.date,
    startTime: cls.startTime ?? null,
    location: cls.location ?? null,
    certificationType: cls.certificationType,
    capacity: cls.capacity,
    totalSignedIn,
  });
  sendEmail({ to: adminEmail, ...emailContent }, req.log).catch((err) => {
    req.log.error({ err }, "Sign-in notification email failed");
  });

  res.json({ ok: true });
});

export default router;
