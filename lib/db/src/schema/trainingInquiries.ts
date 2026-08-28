import { pgTable, jsonb, serial, text, timestamp } from "drizzle-orm/pg-core";

export type TrainingInquiryPerson = {
  name: string;
  phone: string;
  email: string;
};

export const trainingInquiriesTable = pgTable("training_inquiries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  division: text("division").notNull(),
  location: text("location").notNull(),
  people: jsonb("people").$type<TrainingInquiryPerson[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TrainingInquiry = typeof trainingInquiriesTable.$inferSelect;
export type NewTrainingInquiry = typeof trainingInquiriesTable.$inferInsert;