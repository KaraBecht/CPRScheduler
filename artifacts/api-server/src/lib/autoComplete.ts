import { db, classesTable } from "@workspace/db";
import { and, eq, lt } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Marks any "scheduled" class whose date is strictly before today as "completed".
 * Safe to call multiple times — only affects rows that still need updating.
 */
export async function autoCompletePastClasses(): Promise<number> {
  const today = new Date().toISOString().split("T")[0]!;
  const updated = await db
    .update(classesTable)
    .set({ status: "completed" })
    .where(
      and(
        eq(classesTable.status, "scheduled"),
        lt(classesTable.date, today),
      ),
    )
    .returning({ id: classesTable.id });

  if (updated.length > 0) {
    logger.info(
      { count: updated.length, ids: updated.map((r) => r.id) },
      "Auto-completed past classes",
    );
  }

  return updated.length;
}
