import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";

export function RoleGate({
  allow,
  children,
}: {
  allow: UserRole[];
  children: React.ReactNode;
}) {
  const { role } = useAuth();
  if (!allow.includes(role)) {
    return (
      <PageHeader
        title="Not available for your role"
        subtitle="Switch roles using the selector in the top right to access this page."
      />
    );
  }
  return <>{children}</>;
}
