// dash-sidebar.tsx
"use client";
import React, { useMemo, useState } from "react";
import styles from "@/styles/ui/DashSidebar.module.scss";
import Link from "next/link";
import Image from "next/image";
import { mainMenuItems } from "./menu-items";
import { usePathname } from "next/navigation";
import acmeLogo from "@/public/images/logo-mark.png";
import { useWorkspace } from "@/context/workspace-context";
import { useAuth } from "@/context/auth-context";

const Sidebar: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isSidebarSticky, setIsSidebarSticky] = useState(false);
  const pathname = usePathname();
  const { currentWorkspace } = useWorkspace();
  const { hasPermission } = useAuth();

  const visibleMenuItems = useMemo(() => {
    return mainMenuItems.filter(
      item => !item.requiredPermission || hasPermission(item.requiredPermission)
    );
  }, [hasPermission]);

  const logoSrc = useMemo(() => {
    return acmeLogo;
  }, []);

  const handleMouseEnter = () => {
    if (!isSidebarSticky) {
      setIsSidebarCollapsed(false);
    }
  };

  const handleMouseLeave = () => {
    if (!isSidebarSticky) {
      setIsSidebarCollapsed(true);
    }
  };

  return (
    <div
      className={`${styles["layout-menu"]} ${styles["layout-menu--collapsed"]}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles["app-brand"]}>
        <Link
          href="/dashboard"
          className={styles["app-brand-logo"]}
          aria-label="Acme dashboard"
        >
          <Image
            src={logoSrc}
            alt={currentWorkspace?.name || "Acme logo"}
            className={styles["app-brand-image"]}
            priority
            unoptimized={typeof logoSrc === "string"}
            width={72}
            height={72}
          />
        </Link>
      </div>
      {/* Sidebar Menu */}
      <div className={styles["menu"]}>
        <ul className={styles["menu-inner"]}>
          {visibleMenuItems.map((item, index) => {
            const Icon = item.icon;
            const isRootDashboard = item.link === "/dashboard";
            const isAiDashboardItem = item.link === "/dashboard/ai";
            const isActive =
              pathname === item.link ||
              (isAiDashboardItem &&
                (pathname.startsWith("/dashboard/conversations") ||
                  pathname.startsWith("/dashboard/ai/"))) ||
              (!isRootDashboard && pathname.startsWith(`${item.link}/`));
            return (
              <li
                key={index}
                className={`${styles["menu-item"]} ${
                  isActive ? styles["menu-item--active"] : ""
                }`}
              >
                <Link href={item.link} className={styles["menu-link"]}>
                  <i className={styles["menu-icon"]}>
                    {Icon ? <Icon /> : null}
                  </i>
                  <div className={styles["menu-text"]}>{item.label}</div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
