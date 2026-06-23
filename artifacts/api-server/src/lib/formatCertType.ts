export function formatCertificationType(type: string): string {
  const map: Record<string, string> = {
    cpr_aed_first_aid: "CPR / AED / First Aid",
    stop_the_bleed: "Stop the Bleed",
    cpr_aed_first_aid_stop_the_bleed: "CPR / AED / First Aid + Stop the Bleed",
  };
  return map[type] ?? type;
}
