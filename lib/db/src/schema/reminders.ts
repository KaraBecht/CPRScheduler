import {
  pgTable,
  serial,
  integer,
  date,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { classesTable } from "./classes";

export const reminderStatusEnum = pgEnum("reminder_status", [
  "pending",
  "sent",
  "dismissed",
]);

export const remindersTable = pgTable("reminders", {
  id: serial("id").primaryKey(),
  classId: integer("class_id")
    .notNull()
    .references(() => classesTable.id, { onDelete: "cascade" }),
  triggerDate: date("trigger_date").notNull(),
  status: reminderStatusEnum("status").notNull().default("pending"),
  emailSubject: text("email_subject").notNull(),
  emailBody: text("email_body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  sentAt: timestamp("sent_at"),
});

export type ReminderRow = typeof remindersTable.$inferSelect;
export type NewReminderRow = typeof remindersTable.$inferInsert;
