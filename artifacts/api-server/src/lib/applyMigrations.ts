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
      created_at timestamptz NOT NULL DEFAULT now()
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
