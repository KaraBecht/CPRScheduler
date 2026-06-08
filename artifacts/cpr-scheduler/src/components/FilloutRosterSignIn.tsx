import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";

export function FilloutRosterSignIn({ classId }: { classId: number }) {
  return (
    <Link href={`/classes/${classId}/roster-signin`}>
      <Button variant="outline" size="sm" data-testid="button-open-roster">
        <ClipboardList className="h-4 w-4 mr-1.5" /> Roster sign-in
      </Button>
    </Link>
  );
}
