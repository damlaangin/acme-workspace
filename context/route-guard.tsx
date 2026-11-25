"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { normalizePath } from "@/lib/paths";

interface RouteGuardProps {
  children: React.ReactNode;
}

const ROUTE_PERMISSIONS: Record<string, string> = {
  '/dashboard/users': 'view_workspaceuser',
  '/dashboard/finance': 'view_expense',
  '/dashboard/forms': 'view_form',
  '/dashboard/bookings': 'view_reservation',
  '/dashboard/stats': 'view_reportdata',
  '/dashboard/cleaning-app/operations': 'view_task',
  '/dashboard/cleaning-app/forms': 'view_task',
  '/dashboard/cleaning-app': 'assign_others_task',
};

const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const { isAuthenticated, loading, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const normalizedPath = normalizePath(pathname);

  const publicRoutes = [
    "/",
    "/register",
    "/reset-password",
    "/set-password",
  ];

  const isPublicRoute = publicRoutes.includes(normalizedPath);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated && !isPublicRoute) {
      router.push("/");
      return;
    }

    if (isAuthenticated && normalizedPath === "/") {
      router.push("/dashboard");
      return;
    }

    // Check route permissions
    if (isAuthenticated) {
      const requiredPermission = Object.entries(ROUTE_PERMISSIONS).find(
        ([route]) => normalizedPath.startsWith(route)
      )?.[1];

      if (requiredPermission && !hasPermission(requiredPermission)) {
        router.replace('/dashboard');
        return;
      }
    }
  }, [isAuthenticated, loading, normalizedPath, router, isPublicRoute, hasPermission]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "16px",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!isAuthenticated && !isPublicRoute) {
    return null;
  }

  // Block render for unauthorized routes
  const requiredPermission = Object.entries(ROUTE_PERMISSIONS).find(
    ([route]) => normalizedPath.startsWith(route)
  )?.[1];

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return null;
  }

  return <>{children}</>;
};

export default RouteGuard;
