import React, { createContext, useContext, useEffect, useState } from "react";
import { UserRole } from "@workspace/api-client-react";

type AuthState = {
  role: UserRole;
  userId: number | null;
  setAuth: (role: UserRole, userId: number | null) => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>(() => {
    const savedRole = localStorage.getItem("pulsepoint_role");
    return (savedRole as UserRole) || "administrator";
  });

  const [userId, setUserId] = useState<number | null>(() => {
    const savedUserId = localStorage.getItem("pulsepoint_userId");
    return savedUserId ? parseInt(savedUserId, 10) : null;
  });

  const setAuth = (newRole: UserRole, newUserId: number | null) => {
    setRole(newRole);
    setUserId(newUserId);
    localStorage.setItem("pulsepoint_role", newRole);
    if (newUserId) {
      localStorage.setItem("pulsepoint_userId", newUserId.toString());
    } else {
      localStorage.removeItem("pulsepoint_userId");
    }
  };

  return (
    <AuthContext.Provider value={{ role, userId, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
