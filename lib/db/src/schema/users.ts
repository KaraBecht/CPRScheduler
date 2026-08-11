import { pgTable, serial, text, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "administrator",
  "instructor",
  "student",
  "requestor",
]);

/** Sub-role for administrator accounts — used to filter email notifications. */
export const adminRoleEnum = pgEnum("admin_role", ["admin", "coordinator", "ehs"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  role: userRoleEnum("role").notNull(),
  adminRole: adminRoleEnum("admin_role"),
  phone: text("phone"),
  organization: text("organization"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
