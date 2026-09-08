import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "./logger";

/**
 * Idempotent schema migrations run on every startup.
 * Each statement uses IF NOT EXISTS / DO NOTHING so it is safe to re-run.
 */
const MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: "add_locations_business_unit",
    sql: `ALTER TABLE locations ADD COLUMN IF NOT EXISTS business_unit text`,
  },
  {
    name: "add_classes_contact_fields",
    sql: `ALTER TABLE classes
          ADD COLUMN IF NOT EXISTS contact_name  text,
          ADD COLUMN IF NOT EXISTS contact_phone text,
          ADD COLUMN IF NOT EXISTS contact_email text`,
  },
  {
    name: "add_location_time_zones",
    sql: `ALTER TABLE locations
          ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'America/Los_Angeles'`,
  },
  {
    name: "add_class_time_zones",
    sql: `ALTER TABLE classes
          ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'America/Los_Angeles'`,
  },
  {
    name: "backfill_locations_business_unit_from_notes",
    sql: `UPDATE locations
          SET business_unit = (regexp_match(notes, 'Business Unit:\\s*(.+)'))[1]
          WHERE business_unit IS NULL AND notes LIKE '%Business Unit:%'`,
  },
  {
    name: "create_training_inquiries",
    sql: `CREATE TABLE IF NOT EXISTS training_inquiries (
      id serial PRIMARY KEY,
      name text NOT NULL,
      phone text NOT NULL,
      division text NOT NULL,
      location text NOT NULL,
      people jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
  },
  {
    name: "add_training_inquiries_people",
    sql: `ALTER TABLE training_inquiries
          ADD COLUMN IF NOT EXISTS people jsonb NOT NULL DEFAULT '[]'::jsonb`,
  },
  {
    name: "add_training_inquiries_note",
    sql: `ALTER TABLE training_inquiries
          ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT ''`,
  },
  {
    name: "add_training_inquiries_archived_at",
    sql: `ALTER TABLE training_inquiries
          ADD COLUMN IF NOT EXISTS archived_at timestamptz`,
  },
  {
    name: "create_instructor_pre_class_reminders",
    sql: `CREATE TABLE IF NOT EXISTS instructor_pre_class_reminders (
      id serial PRIMARY KEY,
      class_id integer NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      instructor_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      claimed_at timestamp,
      sent_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      UNIQUE (class_id, instructor_id)
    )`,
  },
];

export async function applyMigrations(): Promise<void> {
  for (const migration of MIGRATIONS) {
    try {
      await db.execute(sql.raw(migration.sql));
      logger.debug({ migration: migration.name }, "Migration applied");
    } catch (e) {
      logger.error({ err: e, migration: migration.name }, "Migration failed");
      throw e;
    }
  }
}
