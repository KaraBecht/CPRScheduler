import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";

import { classesTable } from "./classes";

export const rosterResultEnum = pgEnum("roster_result", ["pass", "fail"]);

export const classRosterTable = pgTable(
  "class_roster_entries",
  {
    id: serial("id").primaryKey(),
    classId: integer("class_id")
      .notNull()
      .references(() => classesTable.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    name: text("name").notNull().default(""),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    result: rosterResultEnum("result"),
    cardSent: boolean("card_sent").notNull().default(false),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("class_roster_class_position_idx").on(t.classId, t.position)],
);

export type ClassRosterRow = typeof classRosterTable.$inferSelect;
