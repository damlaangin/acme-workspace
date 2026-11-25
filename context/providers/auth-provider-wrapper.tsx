"use client";

import { AuthProvider } from "@/context/auth-context";

export const AuthProviderWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <AuthProvider>{children}</AuthProvider>;
};
