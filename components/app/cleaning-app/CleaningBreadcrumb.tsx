"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/styles/app/cleaning-app/CleaningBreadcrumb.module.scss";

const cleaningPages = [
  { label: "Dashboard", href: "/dashboard/cleaning-app" },
  { label: "Schedule", href: "/dashboard/cleaning-app/operations" },
  { label: "Quality", href: "/dashboard/cleaning-app/forms" },
];

const isActiveLink = (pathname: string, href: string) => {
  if (href === "/dashboard/cleaning-app") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
};

export default function CleaningBreadcrumb() {
  const pathname = usePathname();

  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      {cleaningPages.map((page) => (
        <Link
          key={page.href}
          href={page.href}
          className={`${styles.breadcrumb__link} ${
            isActiveLink(pathname, page.href)
              ? styles.breadcrumb__linkActive
              : ""
          }`}
        >
          {page.label}
        </Link>
      ))}
    </nav>
  );
}
