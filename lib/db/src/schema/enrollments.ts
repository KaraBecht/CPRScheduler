import {
  pgTable,
  serial,
  integer,
  timestamp,
  pgEnum,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { classesTable } from "./classes";

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "registered",
  "attended",
  "no_show",
  "cancelled",
]);

export const enrollmentsTable = pgTable(
  "enrollments",
  {
    id: serial("id").primaryKey(),
    classId: integer("class_id")
      .notNull()
      .references(() => classesTable.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => usersTable.id),
    status: enrollmentStatusEnum("status").notNull().default("registered"),
    certificateIssued: boolean("certificate_issued").notNull().default(false),
    enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  },
  (table) => ({
    classStudentIdx: uniqueIndex("class_student_idx").on(
      table.classId,
      table.studentId,
    ),
  }),
);

export type Enrollment = typeof enrollmentsTable.$inferSelect;
export type NewEnrollment = typeof enrollmentsTable.$inferInsert;
