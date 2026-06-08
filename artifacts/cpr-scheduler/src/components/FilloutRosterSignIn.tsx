import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";

export function FilloutRosterSignIn() {
  const openPopup = () => {
    const container = document.getElementById("fillout-roster-popup");
    const btn = container?.querySelector<HTMLElement>("button");
    if (btn) {
      btn.click();
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      data-testid="button-open-roster"
      onClick={openPopup}
    >
      <ClipboardList className="h-4 w-4 mr-1.5" /> Roster sign-in
    </Button>
  );
}
