import {
  pgTable,
  serial,
  integer,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { classesTable } from "./classes";
import { usersTable } from "./users";

export const instructorPreClassRemindersTable = pgTable(
  "instructor_pre_class_reminders",
  {
    id: serial("id").primaryKey(),
    classId: integer("class_id")
      .notNull()
      .references(() => classesTable.id, { onDelete: "cascade" }),
    instructorId: integer("instructor_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    claimedAt: timestamp("claimed_at"),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.classId, t.instructorId)],
);
