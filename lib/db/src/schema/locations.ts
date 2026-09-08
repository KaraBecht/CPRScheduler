import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const DEFAULT_LOCATION_TIME_ZONE = "America/Los_Angeles";

export const locationsTable = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  timeZone: text("time_zone").notNull().default(DEFAULT_LOCATION_TIME_ZONE),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  notes: text("notes"),
  businessUnit: text("business_unit"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const locationNotesTable = pgTable("location_notes", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id")
    .notNull()
    .references(() => locationsTable.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type LocationRow = typeof locationsTable.$inferSelect;
export type NewLocationRow = typeof locationsTable.$inferInsert;
export type LocationNoteRow = typeof locationNotesTable.$inferSelect;
export type NewLocationNoteRow = typeof locationNotesTable.$inferInsert;
