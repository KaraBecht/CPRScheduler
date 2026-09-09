import { pgTable, serial, integer, text, timestamp, pgEnum, jsonb, unique } from "drizzle-orm/pg-core";
import { classesTable } from "./classes";
import { usersTable } from "./users";

export const checklistStatusEnum = pgEnum("checklist_status", ["pending", "accepted", "completed"]);

export const classChecklistItemsTable = pgTable("class_checklist_items", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  assigneeId: integer("assignee_id").references(() => usersTable.id),
  assignedBy: integer("assigned_by").references(() => usersTable.id),
  status: checklistStatusEnum("status").notNull().default("pending"),
  acceptedAt: timestamp("accepted_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const classChecklistHistoryTable = pgTable("class_checklist_history", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => classChecklistItemsTable.id, { onDelete: "cascade" }),
  fromUserId: integer("from_user_id").references(() => usersTable.id),
  toUserId: integer("to_user_id").references(() => usersTable.id),
  action: text("action").notNull(),
  actorId: integer("actor_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const checklistEmailDeliveriesTable = pgTable("checklist_email_deliveries", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classesTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  claimedAt: timestamp("claimed_at"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [unique().on(t.classId, t.email)]);