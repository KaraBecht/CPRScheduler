import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";

declare global {
  interface Window {
    FilloutPopups?: {
      open: (id: string, params?: Record<string, unknown>) => void;
    };
  }
}

const FILLOUT_ID = "6UE94HLWqBus";

export function FilloutRosterSignIn() {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = divRef.current;
    if (!el) return;

    if (typeof window.FilloutPopups !== "undefined") {
      return;
    }

    const existing = document.querySelector(
      `script[src="https://server.fillout.com/embed/v1/"]`,
    );
    if (!existing) {
      const s = document.createElement("script");
      s.src = "https://server.fillout.com/embed/v1/";
      document.head.appendChild(s);
    }
  }, []);

  const openPopup = () => {
    if (window.FilloutPopups?.open) {
      window.FilloutPopups.open(FILLOUT_ID);
      return;
    }
    const btn = divRef.current?.querySelector<HTMLElement>("button, [role='button']");
    if (btn) {
      btn.click();
    }
  };

  return (
    <>
      <div
        ref={divRef}
        style={{ position: "fixed", top: "-9999px", left: "-9999px", width: 0, height: 0, overflow: "hidden" }}
      >
        <div
          data-fillout-id={FILLOUT_ID}
          data-fillout-embed-type="popup"
          data-fillout-dynamic-resize=""
          data-fillout-inherit-parameters=""
          data-fillout-domain="www.forms.fox"
          data-fillout-popup-size="medium"
        />
      </div>

      <Button
        variant="outline"
        size="sm"
        data-testid="button-open-roster"
        onClick={openPopup}
      >
        <ClipboardList className="h-4 w-4 mr-1.5" /> Roster sign-in
      </Button>
    </>
  );
}
