/** Escape a single CSV cell value. */
function escapeCell(value: string | null | undefined): string {
  const s = value ?? "";
  // Wrap in quotes if it contains a comma, quote, or newline
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Build a CSV string from a header row and data rows, then trigger a browser download.
 * @param filename  e.g. "certificates_2026-07-27.csv"
 * @param headers   Column header labels
 * @param rows      Each inner array maps 1-to-1 with headers
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | null | undefined)[][],
): void {
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ];
  const csv = lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** ISO date string → YYYY-MM-DD (safe to call with null/undefined). */
export function isoToDate(s: string | null | undefined): string {
  if (!s) return "";
  return s.slice(0, 10);
}
