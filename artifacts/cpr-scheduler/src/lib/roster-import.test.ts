import { Workbook } from "exceljs";
import { describe, expect, it } from "vitest";
import { parseRosterSpreadsheet } from "./roster-import";

describe("parseRosterSpreadsheet", () => {
  it("parses quoted CSV rows without invoking the Excel loader", async () => {
    const file = {
      name: "attendees.csv",
      text: async () =>
        'Report title\r\n"Full Name","Email","Phone"\r\n"Smith, Jane",jane@example.com,"(555) 123-4567"\r\n',
      arrayBuffer: async () => {
        throw new Error("CSV should not use the Excel loader");
      },
    };

    await expect(parseRosterSpreadsheet(file)).resolves.toEqual([
      {
        name: "Smith, Jane",
        email: "jane@example.com",
        phone: "(555) 123-4567",
      },
    ]);
  });

  it("parses XLSX rows and preserves zero/hash numeric masks", async () => {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet("Roster");
    worksheet.addRow(["First Name", "Last Name", "Email", "Phone"]);
    const hashMaskAttendee = worksheet.addRow([
      "Jane",
      "Smith",
      "jane@example.com",
      5551234567,
    ]);
    hashMaskAttendee.getCell(4).numFmt = "(###) ###-####";
    const leadingZeroAttendee = worksheet.addRow([
      "John",
      "Doe",
      "john@example.com",
      551234567,
    ]);
    leadingZeroAttendee.getCell(4).numFmt = "(000) 000-0000";
    const buffer = await workbook.xlsx.writeBuffer();
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;

    await expect(
      parseRosterSpreadsheet({
        name: "attendees.xlsx",
        text: async () => {
          throw new Error("XLSX should not use the CSV reader");
        },
        arrayBuffer: async () => arrayBuffer,
      }),
    ).resolves.toEqual([
      {
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "(555) 123-4567",
      },
      {
        name: "John Doe",
        email: "john@example.com",
        phone: "(055) 123-4567",
      },
    ]);
  });

  it.each(["attendees.xls", "attendees.xlsb"])(
    "rejects unsupported legacy workbook %s with migration guidance",
    async (name) => {
      await expect(
        parseRosterSpreadsheet({
          name,
          text: async () => "",
          arrayBuffer: async () => new ArrayBuffer(0),
        }),
      ).rejects.toThrow("Save the file as .xlsx or CSV");
    },
  );
});