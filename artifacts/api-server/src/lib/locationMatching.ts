import { classesTable, locationsTable } from "@workspace/db";
import { ilike, or, sql } from "drizzle-orm";

/** Names remain aliases after a merge so class records need not be rewritten. */
export function locationClassCondition(names: string[]) {
  return or(...names.filter(Boolean).flatMap((name) => {
    const literal = name.replace(/[\\%_]/g, "\\$&");
    return [
      ilike(classesTable.location, `%${literal}%`),
      ilike(classesTable.title, `%${literal}%`),
    ];
  }));
}

export function locationNameCondition(name: string) {
  return sql`(lower(${locationsTable.name}) = lower(${name})
    OR EXISTS (SELECT 1 FROM unnest(${locationsTable.aliases}) AS alias
      WHERE lower(alias) = lower(${name})))`;
}
