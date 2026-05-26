import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  pgEnum,
  date,
  jsonb,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { classesTable } from "./classes";
import { certificationTypeEnum } from "./classes";

export const requestStatusEnum = pgEnum("request_status", [
  "pending",
  "approved",
  "rejected",
  "scheduled",
]);

export const requestsTable = pgTable("class_requests", {
  id: serial("id").primaryKey(),
  requestorId: integer("requestor_id")
    .notNull()
    .references(() => usersTable.id),
  organizationName: text("organization_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  certificationType: certificationTypeEnum("certification_type").notNull(),
  preferredDate: date("preferred_date").notNull(),
  preferredLocation: text("preferred_location"),
  address: text("address"),
  numberOfClasses: integer("number_of_classes").notNull().default(1),
  sessions: jsonb("sessions")
    .$type<{ date: string; startTime: string }[]>()
    .notNull()
    .default([]),
  attendeeCount: integer("attendee_count").notNull(),
  notes: text("notes"),
  status: requestStatusEnum("status").notNull().default("pending"),
  classId: integer("class_id").references(() => classesTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type RequestRow = typeof requestsTable.$inferSelect;
export type NewRequestRow = typeof requestsTable.$inferInsert;
