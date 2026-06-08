import { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useGetClass } from "@workspace/api-client-react";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export default function RosterSignIn() {
  const [, params] = useRoute("/classes/:id/roster-signin");
  const classId = parseInt(params?.id ?? "0", 10);
  const { data: cls } = useGetClass(classId);

  useEffect(() => {
    delete (window as any).__filloutStandardInitialized;

    const old = document.querySelector(
      'script[src="https://server.fillout.com/embed/v1/"]',
    );
    if (old) old.remove();

    const script = document.createElement("script");
    script.src = "https://server.fillout.com/embed/v1/";
    document.head.appendChild(script);
  }, []);

  return (
    <>
      <Link
        href={`/classes/${classId}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        data-testid="link-back-to-class"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to class
      </Link>
      <PageHeader
        title={cls ? `${cls.title} — Roster Sign-In` : "Roster Sign-In"}
        subtitle={cls ? `${cls.location} · ${cls.date}` : undefined}
      />
      <div
        style={{ width: "100%", height: "500px" }}
        data-fillout-id="6UE94HLWqBus"
        data-fillout-embed-type="standard"
        data-fillout-inherit-parameters=""
        data-fillout-dynamic-resize=""
        data-fillout-domain="www.forms.fox"
      />
    </>
  );
}
