export const DEFAULT_TIME_ZONE = "America/Los_Angeles";

export const TIME_ZONE_OPTIONS = [
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { value: "America/Denver", label: "Mountain Time (Denver)" },
  { value: "America/Chicago", label: "Central Time (Chicago)" },
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "America/Anchorage", label: "Alaska Time (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (Honolulu)" },
] as const;

/**
 * Keep timezone labels readable wherever a class schedule is shown.
 * Older class responses may omit timeZone, so they intentionally use the
 * same Pacific default as the API and existing edit forms.
 */
export function formatTimeZone(timeZone?: string | null): string {
  const value = timeZone || DEFAULT_TIME_ZONE;
  const option = TIME_ZONE_OPTIONS.find((candidate) => candidate.value === value);
  return option?.label ?? value;
}