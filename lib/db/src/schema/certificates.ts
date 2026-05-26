import { pgTable, serial, text, integer, date, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { classesTable, certificationTypeEnum } from "./classes";

export const certificatesTable = pgTable("certificates", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => usersTable.id),
  classId: integer("class_id").references(() => classesTable.id),
  certificationType: certificationTypeEnum("certification_type").notNull(),
  certificateNumber: text("certificate_number").notNull().unique(),
  issuedDate: date("issued_date").notNull(),
  expiryDate: date("expiry_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Certificate = typeof certificatesTable.$inferSelect;
export type NewCertificate = typeof certificatesTable.$inferInsert;
