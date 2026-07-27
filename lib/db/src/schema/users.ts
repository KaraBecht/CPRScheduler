import { pgTable, serial, text, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "administrator",
  "instructor",
  "student",
  "requestor",
]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull(),
  phone: text("phone"),
  organization: text("organization"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
