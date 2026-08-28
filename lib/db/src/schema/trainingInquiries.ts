import { pgTable, jsonb, serial, text, timestamp } from "drizzle-orm/pg-core";

export type TrainingInquiryPerson = {
  name: string;
  phone: string;
  email: string;
  status?: "interested" | "scheduled" | "completed" | "not_interested";
};

export const trainingInquiriesTable = pgTable("training_inquiries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  division: text("division").notNull(),
  location: text("location").notNull(),
  note: text("note").notNull().default(""),
  people: jsonb("people").$type<TrainingInquiryPerson[]>().notNull().default([]),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TrainingInquiry = typeof trainingInquiriesTable.$inferSelect;
export type NewTrainingInquiry = typeof trainingInquiriesTable.$inferInsert;