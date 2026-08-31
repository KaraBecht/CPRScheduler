import { describe, expect, it } from "vitest";
import { CreateInquiryBody, DeleteInquiryBody, UpdateInquiryBody } from "@workspace/api-zod";

describe("training interest API contracts", () => {
  it("accepts legacy person input without a lifecycle status", () => {
    const result = CreateInquiryBody.safeParse({
      name: "Legacy Contact",
      phone: "555-0100",
      division: "FOX Sports",
      location: "Studio Lot",
      people: [
        {
          name: "Legacy Contact",
          phone: "555-0100",
          email: "legacy@example.com",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts a new interest person without a phone number", () => {
    const result = CreateInquiryBody.safeParse({
      name: "Email Only Contact",
      division: "FOX Sports",
      location: "Studio Lot",
      people: [
        {
          name: "Email Only Contact",
          email: "email-only@example.com",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("requires explicit confirmation before permanent deletion", () => {
    expect(DeleteInquiryBody.safeParse({}).success).toBe(false);
    expect(DeleteInquiryBody.safeParse({ confirm: "delete" }).success).toBe(false);
    expect(DeleteInquiryBody.safeParse({ confirm: "DELETE" }).success).toBe(true);
  });

  it("accepts a people update without requiring archive state", () => {
    const result = UpdateInquiryBody.safeParse({
      people: [
        {
          name: "Added Contact",
          phone: "",
          email: "added@example.com",
          status: "interested",
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});