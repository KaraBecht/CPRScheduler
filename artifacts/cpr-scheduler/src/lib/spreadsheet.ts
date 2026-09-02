import { Workbook, type Cell } from "exceljs";

function applyNumericMask(value: number, numberFormat: string): string | null {
  const mask = numberFormat.split(";")[0] ?? "";
  if (!/^[()0#+\-. /\\"']+$/.test(mask)) return null;

  const placeholders = [...mask].filter(
    (character) => character === "0" || character === "#",
  );
  const placeholderCount = placeholders.length;
  const digits = Math.trunc(Math.abs(value)).toString();
  if (placeholderCount === 0 || digits.length > placeholderCount) return null;
  if (digits.length < placeholderCount && placeholders.includes("#")) {
    return null;
  }

  const paddedDigits = digits.padStart(placeholderCount, "0");
  let digitIndex = 0;
  let formatted = "";
  for (const character of mask) {
    if (character === "0" || character === "#") {
      formatted += paddedDigits[digitIndex++]!;
    } else if (!['"', "'", "\\"].includes(character)) {
      formatted += character;
    }
  }
  return value < 0 ? `-${formatted}` : formatted;
}

function getFormattedCellText(cell: Cell): string {
  if (cell.value instanceof Date) {
    return cell.value.toISOString().slice(0, 10);
  }
  if (typeof cell.value === "number") {
    return applyNumericMask(cell.value, cell.numFmt) ?? cell.text;
  }
  return cell.text;
}

/**
 * Read the first worksheet as formatted strings. ExcelJS is used instead of
 * the unmaintained xlsx npm package so uploaded workbooks are parsed by a
 * dependency with maintained security releases.
 */
export async function readFirstWorksheetRows(
  buffer: ArrayBuffer,
): Promise<string[][]> {
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const rows: string[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      values[columnNumber - 1] = getFormattedCellText(cell);
    });
    rows[rowNumber - 1] = values;
  });

  return rows;
}