import {
  db,
  usersTable,
  classesTable,
  enrollmentsTable,
  requestsTable,
  certificatesTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`TRUNCATE TABLE certificates, enrollments, class_requests, classes, users RESTART IDENTITY CASCADE`);

  const users = await db
    .insert(usersTable)
    .values([
      { name: "Dana Rivera", email: "dana@pulsepoint.dev", role: "administrator", phone: "555-0100", bio: "Operations lead at PulsePoint." },
      { name: "Marcus Chen", email: "marcus@pulsepoint.dev", role: "instructor", phone: "555-0101", bio: "Certified BLS & ACLS instructor with 12 years on the ambulance.", avatarUrl: "https://i.pravatar.cc/100?img=12" },
      { name: "Priya Sharma", email: "priya@pulsepoint.dev", role: "instructor", phone: "555-0102", bio: "Pediatric specialist and AHA training faculty.", avatarUrl: "https://i.pravatar.cc/100?img=47" },
      { name: "Alex Johnson", email: "alex@example.com", role: "student", phone: "555-0201", organization: "Lincoln High School" },
      { name: "Sam Patel", email: "sam@example.com", role: "student", phone: "555-0202", organization: "Bright Star Daycare" },
      { name: "Jordan Lee", email: "jordan@example.com", role: "student", phone: "555-0203", organization: "Riverside Clinic" },
      { name: "Taylor Wong", email: "taylor@example.com", role: "student", phone: "555-0204" },
      { name: "Morgan Reyes", email: "morgan@example.com", role: "student", phone: "555-0205" },
      { name: "Bright Star Daycare", email: "ops@brightstar.example", role: "requestor", phone: "555-0301", organization: "Bright Star Daycare" },
      { name: "Riverside Clinic", email: "training@riverside.example", role: "requestor", phone: "555-0302", organization: "Riverside Family Clinic" },
    ])
    .returning();

  const [admin, marcus, priya, alex, sam, jordan, taylor, morgan, bright, riverside] = users;

  const today = new Date();
  const d = (offset: number) => {
    const x = new Date(today);
    x.setDate(x.getDate() + offset);
    return x.toISOString().split("T")[0]!;
  };

  const classes = await db
    .insert(classesTable)
    .values([
      { title: "Adult CPR & AED — Saturday Morning", certificationType: "cpr_aed", date: d(3), startTime: "09:00", endTime: "12:00", location: "PulsePoint HQ — Studio A", capacity: 16, status: "scheduled", priceCents: 8500, instructorId: marcus.id, description: "Hands-on adult CPR with AED practice. Includes 2-year certification card." },
      { title: "Pediatric CPR for Childcare Staff", certificationType: "pediatric_cpr", date: d(5), startTime: "13:00", endTime: "16:30", location: "Bright Star Daycare", capacity: 12, status: "scheduled", priceCents: 9500, instructorId: priya.id, description: "Designed for daycare and after-school staff. Choking, CPR, and emergency response for infants and children." },
      { title: "BLS for Healthcare Providers", certificationType: "bls", date: d(8), startTime: "08:00", endTime: "12:00", location: "Riverside Clinic — Training Room", capacity: 10, status: "scheduled", priceCents: 12500, instructorId: marcus.id, description: "AHA-aligned BLS for clinical staff. Includes team dynamics and high-quality CPR." },
      { title: "First Aid Essentials", certificationType: "first_aid", date: d(12), startTime: "10:00", endTime: "14:00", location: "PulsePoint HQ — Studio B", capacity: 18, status: "scheduled", priceCents: 6500, instructorId: priya.id, description: "Bleeding control, burns, sprains, and how to be useful before EMS arrives." },
      { title: "Adult CPR Refresher", certificationType: "adult_cpr", date: d(15), startTime: "18:00", endTime: "20:30", location: "PulsePoint HQ — Studio A", capacity: 14, status: "scheduled", priceCents: 5500, instructorId: marcus.id, description: "Evening refresher for already-certified providers nearing expiration." },
      { title: "CPR & AED — Community Class", certificationType: "cpr_aed", date: d(-14), startTime: "09:00", endTime: "12:00", location: "PulsePoint HQ — Studio A", capacity: 16, status: "completed", priceCents: 8500, instructorId: marcus.id, description: "Past community class." },
      { title: "Pediatric CPR — Bright Star Onsite", certificationType: "pediatric_cpr", date: d(-21), startTime: "13:00", endTime: "16:30", location: "Bright Star Daycare", capacity: 12, status: "completed", priceCents: 9500, instructorId: priya.id, description: "Onsite training for childcare team." },
    ])
    .returning();

  const enrolls = await db
    .insert(enrollmentsTable)
    .values([
      { classId: classes[0].id, studentId: alex.id, status: "registered" },
      { classId: classes[0].id, studentId: taylor.id, status: "registered" },
      { classId: classes[0].id, studentId: morgan.id, status: "registered" },
      { classId: classes[1].id, studentId: sam.id, status: "registered" },
      { classId: classes[1].id, studentId: alex.id, status: "registered" },
      { classId: classes[2].id, studentId: jordan.id, status: "registered" },
      { classId: classes[3].id, studentId: taylor.id, status: "registered" },
      { classId: classes[3].id, studentId: morgan.id, status: "registered" },
      { classId: classes[5].id, studentId: alex.id, status: "attended", certificateIssued: true },
      { classId: classes[5].id, studentId: taylor.id, status: "attended", certificateIssued: true },
      { classId: classes[6].id, studentId: sam.id, status: "attended", certificateIssued: true },
    ])
    .returning();

  await db.insert(requestsTable).values([
    { requestorId: bright.id, organizationName: "Bright Star Daycare", contactEmail: "ops@brightstar.example", contactPhone: "555-0301", certificationType: "pediatric_cpr", preferredDate: d(20), preferredLocation: "Bright Star Daycare", attendeeCount: 14, notes: "Need certification for new hires before spring intake.", status: "pending" },
    { requestorId: riverside.id, organizationName: "Riverside Family Clinic", contactEmail: "training@riverside.example", contactPhone: "555-0302", certificationType: "bls", preferredDate: d(25), preferredLocation: "Riverside Clinic", attendeeCount: 8, notes: "Annual BLS renewal for clinical staff.", status: "approved", classId: classes[2].id },
    { requestorId: bright.id, organizationName: "Bright Star Daycare", contactEmail: "ops@brightstar.example", contactPhone: "555-0301", certificationType: "first_aid", preferredDate: d(40), preferredLocation: "Onsite", attendeeCount: 10, notes: "Half-day first aid for the toddler-room team.", status: "pending" },
    { requestorId: riverside.id, organizationName: "Riverside Family Clinic", contactEmail: "training@riverside.example", contactPhone: "555-0302", certificationType: "cpr_aed", preferredDate: d(-30), preferredLocation: "Riverside Clinic", attendeeCount: 6, notes: "Completed onsite refresher.", status: "scheduled" },
  ]);

  await db.insert(certificatesTable).values([
    { studentId: alex.id, classId: classes[5].id, certificationType: "cpr_aed", certificateNumber: "PP-CPR-AED-A1B2C3", issuedDate: d(-14), expiryDate: d(716) },
    { studentId: taylor.id, classId: classes[5].id, certificationType: "cpr_aed", certificateNumber: "PP-CPR-AED-D4E5F6", issuedDate: d(-14), expiryDate: d(716) },
    { studentId: sam.id, classId: classes[6].id, certificationType: "pediatric_cpr", certificateNumber: "PP-PED-CPR-G7H8I9", issuedDate: d(-21), expiryDate: d(709) },
  ]);

  console.log(`Seeded ${users.length} users, ${classes.length} classes, ${enrolls.length} enrollments.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
