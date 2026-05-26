import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  pgEnum,
  date,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const certificationTypeEnum = pgEnum("certification_type", [
  "adult_cpr",
  "pediatric_cpr",
  "cpr_aed",
  "bls",
  "first_aid",
]);

export const classStatusEnum = pgEnum("class_status", [
  "scheduled",
  "completed",
  "cancelled",
]);

export const classesTable = pgTable("classes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  certificationType: certificationTypeEnum("certification_type").notNull(),
  date: date("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  location: text("location").notNull(),
  capacity: integer("capacity").notNull(),
  status: classStatusEnum("status").notNull().default("scheduled"),
  instructorId: integer("instructor_id").references(() => usersTable.id),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ClassRow = typeof classesTable.$inferSelect;
export type NewClassRow = typeof classesTable.$inferInsert;
