import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  pgEnum,
  date,
  unique,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const DEFAULT_TIME_ZONE = "America/Los_Angeles";

export const certificationTypeEnum = pgEnum("certification_type", [
  "cpr_aed_first_aid",
  "stop_the_bleed",
  "cpr_aed_first_aid_stop_the_bleed",
]);

export const classStatusEnum = pgEnum("class_status", [
  "being_scheduled",
  "pending_schedule",
  "confirmed",
  "completed",
  "cancelled",
  "scheduled", // legacy — kept for backward compat, not shown in UI
]);

export const classesTable = pgTable("classes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  certificationType: certificationTypeEnum("certification_type").notNull(),
  date: date("date").notNull(),
  startTime: text("start_time").notNull(),
  timeZone: text("time_zone").notNull().default(DEFAULT_TIME_ZONE),
  endTime: text("end_time"),
  location: text("location").notNull(),
  capacity: integer("capacity").notNull(),
  status: classStatusEnum("status").notNull().default("scheduled"),
  instructorId: integer("instructor_id").references(() => usersTable.id),
  description: text("description"),
  businessUnit: text("business_unit"),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completionEmailSentAt: timestamp("completion_email_sent_at"),
  sevenDayReminderClaimedAt: timestamp("seven_day_reminder_claimed_at"),
  sevenDayReminderSentAt: timestamp("seven_day_reminder_sent_at"),
});

export type ClassRow = typeof classesTable.$inferSelect;
export type NewClassRow = typeof classesTable.$inferInsert;

export const classInstructorsTable = pgTable(
  "class_instructors",
  {
    id: serial("id").primaryKey(),
    classId: integer("class_id")
      .notNull()
      .references(() => classesTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
  },
  (t) => [unique().on(t.classId, t.userId)],
);
