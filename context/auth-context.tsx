"use client";

// Demo build: there is no login. A fixed dummy user is always "signed in".
import React, { createContext, useContext, ReactNode } from "react";
import { CURRENT_USER, PERMISSIONS } from "@/lib/dummy";

interface AuthContextType {
  loading: boolean;
  user: {
    id: number;
    name: string;
    email: string;
    userProfilePath: string;
    userType: string;
    permissions: string[];
    groups: { id: number; name: string }[];
  } | null;
  hasPermission: (codename: string) => boolean;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  updateUserFromWorkspace: (
    identifier?: string
  ) => Promise<{ success: boolean; unauthorized?: boolean; error?: string }>;
}

const demoUser: NonNullable<AuthContextType["user"]> = {
  id: CURRENT_USER.id,
  name: `${CURRENT_USER.first_name} ${CURRENT_USER.last_name}`,
  email: CURRENT_USER.email,
  userProfilePath: "/images/avatar.png",
  userType: "workspace_admin",
  permissions: PERMISSIONS.map((p) => p.codename),
  groups: [{ id: 1, name: "Administrators" }],
};

const value: AuthContextType = {
  loading: false,
  user: demoUser,
  hasPermission: () => true,
  logout: async () => {},
  isAuthenticated: true,
  updateUserFromWorkspace: async () => ({ success: true }),
};

const AuthContext = createContext<AuthContextType>(value);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
  <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
);

export const useAuth = (): AuthContextType => useContext(AuthContext);
