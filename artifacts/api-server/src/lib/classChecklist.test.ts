import { describe, expect, it } from "vitest";
import { getChecklistRecipients } from "./classChecklist";

/**
 * Recipient selection is deliberately kept pure and is tested without a
 * database or mail connector. Delivery/claim integration tests can exercise
 * launchClassChecklist with the same isolated database fixture in deployments
 * that provide DATABASE_URL; this test must never send real mail.
 */
describe("class checklist recipients", () => {
  it("includes only Kara, Sharon, and assigned trainers, deduplicated", () => {
    expect(getChecklistRecipients([
      "trainer@example.com", "TRAINER@example.com", "kara.becht@fox.com",
    ])).toEqual([
      "kara.becht@fox.com", "sharon.anctil@fox.com", "trainer@example.com",
    ]);
  });
});