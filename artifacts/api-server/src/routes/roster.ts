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
    const result = (entry as { result?: string }).result?.trim() || null;
    const cardSent = Boolean((entry as { cardSent?: boolean }).cardSent);

    const isDuplicate =
      existingNames.has(name.toLowerCase()) ||
      (email && existingEmails.has(email.toLowerCase()));
    if (isDuplicate) { skipped++; continue; }

    const slot = findSlot();
    if (slot === -1) { skipped++; continue; }

    await db.insert(classRosterTable).values({ classId: cls.id, position: slot, name, email, phone, result: result as "pass" | "fail" | null, cardSent });
    filledPositions.add(slot);
    existingNames.add(name.toLowerCase());
    if (email) existingEmails.add(email.toLowerCase());
    imported++;
  }

  res.json({ classId: cls.id, classTitle: cls.title, classDate: cls.date, imported, skipped });
});

router.get("/public/classes/:classId/calendar.ics", async (req, res) => {
  const classId = parseId(req.params.classId, "classId");
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, classId));
  if (!cls) { res.status(404).send("Not found"); return; }

  const pad = (n: number) => String(n).padStart(2, "0");
  const toIcsDt = (date: string, time: string) =>
    date.replace(/-/g, "") + "T" + time.replace(":", "") + "00";

  const [hh, mm] = (cls.startTime ?? "09:00").split(":").map(Number);
  const endTotal = hh! * 60 + mm! + 240; // default +4 hours
  const defaultEnd = `${pad(Math.floor(endTotal / 60) % 24)}:${pad(endTotal % 60)}`;

  const dtStart = toIcsDt(cls.date, cls.startTime ?? "09:00");
  const dtEnd   = toIcsDt(cls.date, cls.endTime ?? defaultEnd);
  const now     = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";

  const certLabels: Record<string, string> = {
    cpr_aed: "CPR/AED", cpr_aed_first_aid: "CPR/AED + First Aid",
    first_aid: "First Aid", bls: "BLS (Basic Life Support)",
    stop_the_bleed: "Stop the Bleed",
    cpr_aed_first_aid_stop_the_bleed: "CPR + Stop the Bleed",
  };
  const cert = certLabels[cls.certificationType] ?? cls.certificationType;
  const summary  = `CPR Training — ${cls.title} (${cert})`;
  const location = cls.location ?? "";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PulsePoint CPR Hub//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:class-${cls.id}@pulsepoint.fox.com`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    location ? `LOCATION:${location.replace(/\n/g, "\\n")}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="class-${cls.id}.ics"`);
  res.send(ics);
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
    status: cls.status,
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

  // Reject sign-ins for completed classes or classes whose date has passed
  const today = new Date().toISOString().slice(0, 10);
  if (cls.status === "completed" || cls.date < today) {
    res.status(409).json({ error: "Sign-in is closed for this class." });
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
