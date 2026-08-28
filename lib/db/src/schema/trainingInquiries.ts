import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const trainingInquiriesTable = pgTable("training_inquiries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  division: text("division").notNull(),
  location: text("location").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TrainingInquiry = typeof trainingInquiriesTable.$inferSelect;
export type NewTrainingInquiry = typeof trainingInquiriesTable.$inferInsert;