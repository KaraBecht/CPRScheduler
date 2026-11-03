export const MERGE_FIELDS = [
  "name", "address", "contactName", "contactEmail", "contactPhone",
  "notes", "businessUnit", "timeZone",
] as const;
type Field = typeof MERGE_FIELDS[number];
type Details = Record<Field, string | null>;

export function resolveLocationMerge(
  target: Details, source: Details, choices: Record<string, string>,
): Details {
  const result = {} as Details;
  for (const field of MERGE_FIELDS) {
    const a = target[field]?.trim() || "";
    const b = source[field]?.trim() || "";
    if (!a || !b || a === b) {
      result[field] = a || b || null;
      continue;
    }
    const choice = choices[field];
    if (!["target", "source", "both"].includes(choice)) {
      throw new Error(`Choose which ${field} to keep, or keep both.`);
    }
    if (choice === "both" && field === "timeZone") {
      throw new Error("Choose one timezone for the merged location.");
    }
    result[field] = choice === "target" ? a : choice === "source" ? b : `${a}; ${b}`;
  }
  return result;
}
