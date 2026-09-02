import { readFirstWorksheetRows } from "./spreadsheet";

export type RosterImportRow = {
  name: string;
  email: string;
  phone: string;
};

type ImportFile = Pick<File, "name" | "arrayBuffer" | "text">;

const NAME_HINTS = ["name", "first", "last", "student", "attendee"];
const EMAIL_HINTS = ["email"];

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index++) {
    const character = text[index]!;
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index++;
      row.push(value);
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
  return rows;
}

function detectHeaderRow(rawRows: string[][]): number {
  for (let index = 0; index < Math.min(rawRows.length, 6); index++) {
    const row = rawRows[index]!.map((cell) => cell.toLowerCase().trim());
    const hasNameHint = row.some((cell) =>
      NAME_HINTS.some((hint) => cell.includes(hint)),
    );
    const hasEmailHint = row.some((cell) =>
      EMAIL_HINTS.some((hint) => cell.includes(hint)),
    );
    if (hasNameHint || hasEmailHint) return index;
  }
  return 0;
}

function parseRosterRows(rawRows: string[][]): RosterImportRow[] {
  if (rawRows.length === 0) return [];

  const headerIndex = detectHeaderRow(rawRows);
  const headers = (rawRows[headerIndex] ?? []).map((cell) => cell.trim());
  const dataRows = rawRows.slice(headerIndex + 1);

  const get = (row: string[], ...keywords: string[]): string => {
    for (let columnIndex = 0; columnIndex < headers.length; columnIndex++) {
      const header = (headers[columnIndex] ?? "").toLowerCase();
      if (keywords.some((keyword) => header.includes(keyword))) {
        return String(row[columnIndex] ?? "").trim();
      }
    }
    return "";
  };

  return dataRows
    .map((row) => {
      let name = "";
      for (let columnIndex = 0; columnIndex < headers.length; columnIndex++) {
        const header = (headers[columnIndex] ?? "").toLowerCase().trim();
        if (
          header === "name" ||
          header === "full name" ||
          header === "fullname" ||
          header === "student name" ||
          header === "attendee name"
        ) {
          name = String(row[columnIndex] ?? "").trim();
          if (name) break;
        }
      }

      if (!name) {
        const first = get(row, "first name", "firstname", "first");
        const last = get(row, "last name", "lastname", "surname", "last");
        name = `${first} ${last}`.trim();
      }

      return {
        name,
        email: get(row, "email"),
        phone: get(row, "phone", "mobile", "cell", "telephone"),
      };
    })
    .filter((row) => row.name.length > 0);
}

export async function parseRosterSpreadsheet(
  file: ImportFile,
): Promise<RosterImportRow[]> {
  const normalizedName = file.name.toLowerCase();
  if (normalizedName.endsWith(".xls") || normalizedName.endsWith(".xlsb")) {
    throw new Error(
      "Legacy .xls and .xlsb files are not supported. Save the file as .xlsx or CSV and try again.",
    );
  }

  const rawRows = normalizedName.endsWith(".csv")
    ? parseCsvRows(await file.text())
    : await readFirstWorksheetRows(await file.arrayBuffer());

  if (rawRows.length === 0) {
    throw new Error("Spreadsheet has no rows");
  }
  return parseRosterRows(rawRows);
}