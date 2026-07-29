import { useAuth } from "@/lib/auth-context";
import {
  useListUsers,
  type User,
  type UserRole,
} from "@workspace/api-client-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  administrator: "Administrator",
  instructor: "Instructor",
  student: "Student",
};

export function RoleSwitcher() {
  const { role, userId, setAuth } = useAuth();
  const { data: users = [] } = useListUsers();

  const usersByRole = useMemo(() => {
    const byRole: Record<UserRole, User[]> = {
      administrator: [],
      instructor: [],
      student: [],
      requestor: [], // kept for data grouping, not shown in UI
    };
    for (const u of users) byRole[u.role].push(u);
    return byRole;
  }, [users]);

  const currentUser = useMemo(
    () => users.find((u) => u.id === userId),
    [users, userId],
  );

  useEffect(() => {
    if (!users.length) return;
    const list = usersByRole[role];
    if (!list.length) return;
    if (!userId || !list.find((u) => u.id === userId)) {
      setAuth(role, list[0]!.id);
    }
  }, [users, role, userId, usersByRole, setAuth]);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {currentUser?.name
              ?.split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("") ?? "?"}
          </AvatarFallback>
        </Avatar>
        <Select
          value={role}
          onValueChange={(v) => {
            const newRole = v as UserRole;
            const first = usersByRole[newRole][0];
            setAuth(newRole, first?.id ?? null);
          }}
        >
          <SelectTrigger
            className="h-7 border-0 bg-transparent px-1 text-xs font-medium shadow-none focus:ring-0"
            data-testid="select-role"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
              <SelectItem key={r} value={r} data-testid={`option-role-${r}`}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {usersByRole[role].length > 1 && (
          <Select
            value={userId?.toString() ?? ""}
            onValueChange={(v) => setAuth(role, parseInt(v, 10))}
          >
            <SelectTrigger
              className="h-7 w-[140px] border-0 bg-transparent px-1 text-xs shadow-none focus:ring-0"
              data-testid="select-user"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {usersByRole[role].map((u) => (
                <SelectItem key={u.id} value={u.id.toString()}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
