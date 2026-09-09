import { describe, expect, it } from "vitest";
import { getChecklistRecipients, renderChecklistEmail } from "./classChecklist";
import { STANDARD_CHECKLIST } from "./checklistDefaults";

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
  it("locks the standard checklist order and wording", () => {
    expect([...STANDARD_CHECKLIST]).toEqual([
      "4 Adult Manikins", "4 Infant Manikins", "10 CPR Valves", "4 AED Trainers",
      "10 Face Shields", "4 Rescue Kits", "2 EpiPen Trainers", "2 Narcan Trainers",
      "Extra Lung Bags (Adult and Infant)", "Extra AA Batteries", "Alcohol Wipes",
      "Size Medium Gloves", "Paperwork: 1 Paper Roster plus 1 Tablet", "10 Trifolds",
      "10 QR-Coded Handouts on How to Claim Your CPR Card", "10 Evaluations",
      "Check all supplies for functionality before packing and sending",
      "Confirm the tablet is charged",
      "Confirm the Manikin Adapter for AED Use (metallic tape on manikin) has good adhesion and functions correctly",
      "Confirm AED trainer pads are removed from ziplock bags and added to trainer units",
    ]);
  });
  it("renders representative supplies, final checks, and a direct class link", () => {
    const email = renderChecklistEmail("Studio Lot", "2030-01-02", "09:00", 42,
      STANDARD_CHECKLIST.map(title => ({ title })));
    expect(email.text).toContain("4 Adult Manikins");
    expect(email.html).toContain("Confirm the tablet is charged");
    expect(email.html).toContain("/classes/42");
  });
});