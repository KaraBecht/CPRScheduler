import { Router, type IRouter } from "express";
import { parseId } from "../lib/errors";
import {
  db,
  classesTable,
  enrollmentsTable,
  usersTable,
  requestsTable,
  certificatesTable,
  classRosterTable,
  locationsTable,
} from "@workspace/db";
import { and, or, eq, gte, sql, desc, asc, ne, inArray } from "drizzle-orm";
import { autoCompletePastClasses } from "../lib/autoComplete";

const DEFAULT_CLASS_DURATION_MIN = 180;

function nowParts() {
  const d = new Date();
  const today = d.toISOString().split("T")[0]!;
  const nowMin = d.getHours() * 60 + d.getMinutes();
  return { today, nowMin };
}

function parseHHMM(t: string): number {
  const [h, m] = t.split(":").map((s) => parseInt(s, 10));
  return (h || 0) * 60 + (m || 0);
}

async function countActiveRosterStudents(): Promise<number> {
  const { today, nowMin } = nowParts();
  const todayClasses = await db
    .select()
    .from(classesTable)
    .where(and(eq(classesTable.date, today), eq(classesTable.status, "scheduled")));
  const activeIds = todayClasses
    .filter((c) => {
      const start = parseHHMM(c.startTime);
      const end = c.endTime
        ? parseHHMM(c.endTime)
        : start + DEFAULT_CLASS_DURATION_MIN;
      return start <= nowMin && nowMin < end;
    })
    .map((c) => c.id);
  if (activeIds.length === 0) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(classRosterTable)
    .where(
      and(
        inArray(classRosterTable.classId, activeIds),
        ne(sql`trim(${classRosterTable.name})`, ""),
      ),
    );
  return row?.n ?? 0;
}
import { serializeClass } from "./classes";
import { serializeRequest } from "./requests";
import { serializeUser } from "./users";

const router: IRouter = Router();

const certTypes = [
  "cpr_aed_first_aid",
  "stop_the_bleed",
  "cpr_aed_first_aid_stop_the_bleed",
] as const;

router.get("/dashboard/admin", async (_req, res) => {
  await autoCompletePastClasses();
  const today = new Date().toISOString().split("T")[0]!;
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startYear = new Date(now.getFullYear(), 0, 1);

  const [
    [{ totalClasses }],
    [{ upcomingClasses }],
    activeStudents,
    [{ totalInstructors }],
    [{ totalLocations }],
    [{ pendingRequests }],
    [{ certificatesIssued }],
    [{ certificatesThisMonthReal }],
    [{ certificatesYTDReal }],
    [{ certificatesThisMonthRoster }],
    [{ certificatesYTDRoster }],
    [{ enrollmentsThisMonth }],
    allLocations,
    allClassesByDate,
    classesByYear,
    realActiveByCert,
    rosterActiveByCert,
    [{ classesThisYear }],
    [{ locationsThisYear }],
  ] = await Promise.all([
    db.select({ totalClasses: sql<number>`count(*)::int` }).from(classesTable),
    db
      .select({ upcomingClasses: sql<number>`count(*)::int` })
      .from(classesTable)
      .where(
        and(gte(classesTable.date, today), inArray(classesTable.status, ["confirmed", "pending_schedule", "being_scheduled"])),
      ),
    countActiveRosterStudents(),
    db
      .select({ totalInstructors: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(eq(usersTable.role, "instructor")),
    db.select({ totalLocations: sql<number>`count(*)::int` }).from(locationsTable),
    db
      .select({ pendingRequests: sql<number>`count(*)::int` })
      .from(requestsTable)
      .leftJoin(classesTable, eq(classesTable.id, requestsTable.classId))
      .where(
        or(
          eq(requestsTable.status, "pending"),
          inArray(classesTable.status, ["pending_schedule", "being_scheduled"]),
        ),
      ),
    db
      .select({ certificatesIssued: sql<number>`count(*)::int` })
      .from(certificatesTable),
    // Real certs this month
    db
      .select({ certificatesThisMonthReal: sql<number>`count(*)::int` })
      .from(certificatesTable)
      .where(gte(certificatesTable.issuedDate, startMonth.toISOString().split("T")[0]!)),
    // Real certs YTD
    db
      .select({ certificatesYTDReal: sql<number>`count(*)::int` })
      .from(certificatesTable)
      .where(gte(certificatesTable.issuedDate, startYear.toISOString().split("T")[0]!)),
    // Roster (virtual) certs this month — class date falls in current month
    db
      .select({ certificatesThisMonthRoster: sql<number>`count(*)::int` })
      .from(classRosterTable)
      .innerJoin(classesTable, eq(classRosterTable.classId, classesTable.id))
      .where(
        and(
          eq(classRosterTable.cardSent, true),
          ne(sql`trim(${classRosterTable.name})`, ""),
          gte(classesTable.date, startMonth.toISOString().split("T")[0]!),
        ),
      ),
    // Roster (virtual) certs YTD — class date falls in current year
    db
      .select({ certificatesYTDRoster: sql<number>`count(*)::int` })
      .from(classRosterTable)
      .innerJoin(classesTable, eq(classRosterTable.classId, classesTable.id))
      .where(
        and(
          eq(classRosterTable.cardSent, true),
          ne(sql`trim(${classRosterTable.name})`, ""),
          gte(classesTable.date, startYear.toISOString().split("T")[0]!),
        ),
      ),
    db
      .select({ enrollmentsThisMonth: sql<number>`count(*)::int` })
      .from(enrollmentsTable)
      .where(gte(enrollmentsTable.enrolledAt, startMonth)),
    db.select({ id: locationsTable.id, name: locationsTable.name }).from(locationsTable),
    db
      .select({ location: classesTable.location, title: classesTable.title, date: classesTable.date })
      .from(classesTable)
      .orderBy(desc(classesTable.date)),
    db
      .select({
        year: sql<string>`extract(year from ${classesTable.date})::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(classesTable)
      .groupBy(sql`extract(year from ${classesTable.date})`)
      .orderBy(sql`extract(year from ${classesTable.date}) asc`),
    // Active real certs grouped by cert type
    db
      .select({
        certType: certificatesTable.certificationType,
        count: sql<number>`count(*)::int`,
      })
      .from(certificatesTable)
      .where(gte(certificatesTable.expiryDate, today))
      .groupBy(certificatesTable.certificationType),
    // Active virtual certs from class roster (cardSent = true, expiry = class date + 2 years)
    db
      .select({
        certType: classesTable.certificationType,
        count: sql<number>`count(*)::int`,
      })
      .from(classRosterTable)
      .innerJoin(classesTable, eq(classRosterTable.classId, classesTable.id))
      .where(
        and(
          eq(classRosterTable.cardSent, true),
          ne(sql`trim(${classRosterTable.name})`, ""),
          gte(sql`(${classesTable.date}::date + interval '2 years')::date`, today),
        ),
      )
      .groupBy(classesTable.certificationType),
    // Classes taught this year
    db
      .select({ classesThisYear: sql<number>`count(*)::int` })
      .from(classesTable)
      .where(gte(classesTable.date, startYear.toISOString().split("T")[0]!)),
    // Distinct locations active this year
    db
      .select({ locationsThisYear: sql<number>`count(distinct ${classesTable.location})::int` })
      .from(classesTable)
      .where(gte(classesTable.date, startYear.toISOString().split("T")[0]!)),
  ]);

  // Combine real + roster cert counts for this month and YTD
  const certificatesThisMonth = certificatesThisMonthReal + certificatesThisMonthRoster;
  const certificatesYTD = certificatesYTDReal + certificatesYTDRoster;

  // Combine real + virtual active cert counts per cert type
  const certTypeCountMap = new Map<string, number>();
  for (const { certType, count } of [...realActiveByCert, ...rosterActiveByCert]) {
    certTypeCountMap.set(certType, (certTypeCountMap.get(certType) ?? 0) + count);
  }
  const activeCertsByType = Array.from(certTypeCountMap.entries()).map(
    ([certType, count]) => ({ certType, count }),
  );
  const activeCertificates = activeCertsByType.reduce((s, r) => s + r.count, 0);
  const totalStudents = activeStudents;

  // Compute location-level cert status
  let locationsExpiring = 0;
  let locationsExpired = 0;
  const nowMs = now.getTime();
  for (const loc of allLocations) {
    const nameLower = loc.name.toLowerCase();
    const lastClass = allClassesByDate.find(
      (c) =>
        c.location?.toLowerCase().includes(nameLower) ||
        c.title?.toLowerCase().includes(nameLower),
    );
    if (lastClass) {
      const days = (nowMs - new Date(lastClass.date).getTime()) / 86_400_000;
      if (days > 730) locationsExpired++;
      else if (days > 548) locationsExpiring++;
    }
  }

  const classesByCertification = await Promise.all(
    certTypes.map(async (t) => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(classesTable)
        .where(eq(classesTable.certificationType, t));
      return { certificationType: t, count };
    }),
  );

  const upcomingRows = await db
    .select()
    .from(classesTable)
    .where(and(gte(classesTable.date, today), inArray(classesTable.status, ["confirmed", "pending_schedule", "being_scheduled"])))
    .orderBy(asc(classesTable.date), asc(classesTable.startTime))
    .limit(8);
  const upcomingSchedule = await Promise.all(upcomingRows.map(serializeClass));

  const recentReqRows = await db
    .select()
    .from(requestsTable)
    .orderBy(desc(requestsTable.createdAt))
    .limit(6);
  const recentRequests = await Promise.all(recentReqRows.map(serializeRequest));

  res.json({
    totalClasses,
    classesThisYear,
    locationsThisYear,
    upcomingClasses,
    totalStudents,
    totalInstructors,
    totalLocations,
    pendingRequests,
    certificatesIssued,
    activeCertificates,
    activeCertsByType,
    certificatesThisMonth,
    certificatesYTD,
    enrollmentsThisMonth,
    locationsExpiring,
    locationsExpired,
    classesByCertification,
    classesByYear,
    upcomingSchedule,
    recentRequests,
  });
});

router.get("/dashboard/instructor/:instructorId", async (req, res) => {
  const id = parseId(req.params.instructorId, "instructorId");
  const [instructor] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id));
  if (!instructor) { res.status(404).json({ error: "Not found" }); return; }
  const today = new Date().toISOString().split("T")[0]!;
  const allRows = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.instructorId, id))
    .orderBy(asc(classesTable.date));
  const upcomingRows = allRows.filter(
    (c) => c.date >= today && c.status === "scheduled",
  );
  const pastRows = allRows.filter(
    (c) => c.date < today || c.status === "completed",
  );
  const upcomingClasses = await Promise.all(upcomingRows.map(serializeClass));
  const pastClasses = await Promise.all(pastRows.map(serializeClass));

  const [studentsTaught] = await db
    .select({
      n: sql<number>`COUNT(DISTINCT ${enrollmentsTable.studentId})::int`,
    })
    .from(enrollmentsTable)
    .innerJoin(classesTable, eq(enrollmentsTable.classId, classesTable.id))
    .where(eq(classesTable.instructorId, id));

  const [certsIssued] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(certificatesTable)
    .innerJoin(classesTable, eq(certificatesTable.classId, classesTable.id))
    .where(eq(classesTable.instructorId, id));

  res.json({
    instructor: serializeUser(instructor),
    upcomingClasses,
    pastClasses,
    totalStudentsTaught: studentsTaught?.n ?? 0,
    totalCertificatesIssued: certsIssued?.n ?? 0,
    nextClass: upcomingClasses[0] ?? null,
  });
});

router.get("/dashboard/student/:studentId", async (req, res) => {
  const id = parseId(req.params.studentId, "studentId");
  const [student] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id));
  if (!student) { res.status(404).json({ error: "Not found" }); return; }
  const today = new Date().toISOString().split("T")[0]!;

  const enrollRows = await db
    .select({ e: enrollmentsTable, c: classesTable })
    .from(enrollmentsTable)
    .innerJoin(classesTable, eq(enrollmentsTable.classId, classesTable.id))
    .where(eq(enrollmentsTable.studentId, id))
    .orderBy(asc(classesTable.date));

  const upcoming = enrollRows.filter(
    ({ c }) => c.date >= today && c.status === "scheduled",
  );
  const past = enrollRows.filter(
    ({ c }) => c.date < today || c.status === "completed",
  );

  async function mapEnroll({ e, c }: (typeof enrollRows)[number]) {
    return {
      id: e.id,
      classId: e.classId,
      studentId: e.studentId,
      status: e.status,
      certificateIssued: e.certificateIssued,
      enrolledAt: e.enrolledAt.toISOString(),
      classSession: await serializeClass(c),
    };
  }
  const upcomingEnrollments = await Promise.all(upcoming.map(mapEnroll));
  const pastEnrollments = await Promise.all(past.map(mapEnroll));

  const certRows = await db
    .select()
    .from(certificatesTable)
    .where(eq(certificatesTable.studentId, id))
    .orderBy(desc(certificatesTable.issuedDate));
  const certificates = await Promise.all(
    certRows.map(async (row) => ({
      id: row.id,
      studentId: row.studentId,
      studentName: student.name,
      classId: row.classId,
      certificationType: row.certificationType,
      certificateNumber: row.certificateNumber,
      issuedDate: row.issuedDate,
      expiryDate: row.expiryDate,
    })),
  );

  const enrolledClassIds = new Set(enrollRows.map(({ c }) => c.id));
  const recommendedRows = await db
    .select()
    .from(classesTable)
    .where(and(gte(classesTable.date, today), eq(classesTable.status, "scheduled")))
    .orderBy(asc(classesTable.date))
    .limit(12);
  const recommendedFiltered = recommendedRows
    .filter((c) => !enrolledClassIds.has(c.id))
    .slice(0, 6);
  const recommendedClasses = await Promise.all(
    recommendedFiltered.map(serializeClass),
  );

  res.json({
    student: serializeUser(student),
    upcomingEnrollments,
    pastEnrollments,
    certificates,
    recommendedClasses,
  });
});

router.get("/dashboard/requestor/:requestorId", async (req, res) => {
  const id = parseId(req.params.requestorId, "requestorId");
  const [requestor] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id));
  if (!requestor) { res.status(404).json({ error: "Not found" }); return; }

  const reqRows = await db
    .select()
    .from(requestsTable)
    .where(eq(requestsTable.requestorId, id))
    .orderBy(desc(requestsTable.createdAt));
  const requests = await Promise.all(reqRows.map(serializeRequest));

  const scheduledIds = reqRows
    .map((r) => r.classId)
    .filter((x): x is number => x !== null);
  let scheduledClasses: Awaited<ReturnType<typeof serializeClass>>[] = [];
  if (scheduledIds.length) {
    const classRows = await db
      .select()
      .from(classesTable)
      .where(sql`${classesTable.id} = ANY(${scheduledIds})`);
    scheduledClasses = await Promise.all(classRows.map(serializeClass));
  }

  res.json({
    requestor: serializeUser(requestor),
    requests,
    scheduledClasses,
    pendingCount: requests.filter((r) => r.status === "pending").length,
    approvedCount: requests.filter(
      (r) => r.status === "approved" || r.status === "scheduled",
    ).length,
  });
});

router.get("/dashboard/activity", async (_req, res) => {
  const [classes, enrolls, reqs, certs] = await Promise.all([
    db
      .select({ c: classesTable, u: usersTable })
      .from(classesTable)
      .leftJoin(usersTable, eq(classesTable.instructorId, usersTable.id))
      .orderBy(desc(classesTable.createdAt))
      .limit(10),
    db
      .select({ e: enrollmentsTable, u: usersTable, c: classesTable })
      .from(enrollmentsTable)
      .leftJoin(usersTable, eq(enrollmentsTable.studentId, usersTable.id))
      .leftJoin(classesTable, eq(enrollmentsTable.classId, classesTable.id))
      .orderBy(desc(enrollmentsTable.enrolledAt))
      .limit(10),
    db
      .select({ r: requestsTable, u: usersTable })
      .from(requestsTable)
      .leftJoin(usersTable, eq(requestsTable.requestorId, usersTable.id))
      .orderBy(desc(requestsTable.createdAt))
      .limit(10),
    db
      .select({ c: certificatesTable, u: usersTable })
      .from(certificatesTable)
      .leftJoin(usersTable, eq(certificatesTable.studentId, usersTable.id))
      .orderBy(desc(certificatesTable.createdAt))
      .limit(10),
  ]);

  type Event = {
    id: string;
    type: string;
    message: string;
    timestamp: string;
    actorName: string | null;
    _t: number;
  };
  const events: Event[] = [];
  for (const { c, u } of classes) {
    events.push({
      id: `class-${c.id}`,
      type: c.status === "cancelled" ? "class_cancelled" : "class_created",
      message:
        c.status === "cancelled"
          ? `Class "${c.title}" was cancelled`
          : `New class "${c.title}" scheduled`,
      timestamp: c.createdAt.toISOString(),
      actorName: u?.name ?? null,
      _t: c.createdAt.getTime(),
    });
  }
  for (const { e, u, c } of enrolls) {
    events.push({
      id: `enroll-${e.id}`,
      type: "enrollment_created",
      message: `${u?.name ?? "A student"} enrolled in "${c?.title ?? "a class"}"`,
      timestamp: e.enrolledAt.toISOString(),
      actorName: u?.name ?? null,
      _t: e.enrolledAt.getTime(),
    });
  }
  for (const { r, u } of reqs) {
    events.push({
      id: `req-${r.id}`,
      type:
        r.status === "approved" || r.status === "scheduled"
          ? "request_approved"
          : "request_submitted",
      message:
        r.status === "approved" || r.status === "scheduled"
          ? `Request from ${r.organizationName} approved`
          : `${r.organizationName} requested ${r.certificationType.replace(/_/g, " ")} training`,
      timestamp: r.createdAt.toISOString(),
      actorName: u?.name ?? null,
      _t: r.createdAt.getTime(),
    });
  }
  for (const { c, u } of certs) {
    events.push({
      id: `cert-${c.id}`,
      type: "certificate_issued",
      message: `Certificate ${c.certificateNumber} issued to ${u?.name ?? "a student"}`,
      timestamp: c.createdAt.toISOString(),
      actorName: u?.name ?? null,
      _t: c.createdAt.getTime(),
    });
  }
  events.sort((a, b) => b._t - a._t);
  res.json(
    events.slice(0, 20).map(({ _t, ...rest }) => rest),
  );
});

export default router;
