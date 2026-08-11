import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { classesTable } from "./classes";
import { usersTable } from "./users";

export const trainerInviteStatusEnum = pgEnum("trainer_invite_status", [
  "pending",
  "accepted",
  "declined",
]);

export const trainerInvitationsTable = pgTable(
  "trainer_invitations",
  {
    id: serial("id").primaryKey(),
    classId: integer("class_id")
      .notNull()
      .references(() => classesTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    status: trainerInviteStatusEnum("status").notNull().default("pending"),
    respondedAt: timestamp("responded_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("trainer_invitations_class_user_unique").on(t.classId, t.userId)],
);

export type TrainerInvitationRow = typeof trainerInvitationsTable.$inferSelect;
export type NewTrainerInvitationRow = typeof trainerInvitationsTable.$inferInsert;
