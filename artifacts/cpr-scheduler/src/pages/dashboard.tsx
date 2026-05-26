import { useAuth } from "@/lib/auth-context";
import { AdminDashboardPage } from "@/pages/dashboards/admin";
import { InstructorDashboardPage } from "@/pages/dashboards/instructor";
import { StudentDashboardPage } from "@/pages/dashboards/student";
import { RequestorDashboardPage } from "@/pages/dashboards/requestor";

export default function Dashboard() {
  const { role } = useAuth();
  if (role === "administrator") return <AdminDashboardPage />;
  if (role === "instructor") return <InstructorDashboardPage />;
  if (role === "student") return <StudentDashboardPage />;
  return <RequestorDashboardPage />;
}
