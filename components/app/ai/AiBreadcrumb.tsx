"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/styles/AiInsights.module.scss";

const navigationLinks = [
  { label: "Overview", link: "/dashboard/ai" },
  { label: "Inbox", link: "/dashboard/conversations" },
  { label: "Agents", link: "/dashboard/ai/ai-agents" },
];

const isActiveLink = (pathname: string, link: string) => {
  if (link === "/dashboard/ai") return pathname === link;
  return pathname === link || pathname.startsWith(`${link}/`);
};

export default function AiBreadcrumb() {
  const pathname = usePathname();

  return (
    <div className={styles["ai__nav"]}>
      {navigationLinks.map((item) => (
        <Link
          key={item.label}
          href={item.link}
          className={`${styles["ai__nav-link"]} ${
            isActiveLink(pathname, item.link)
              ? styles["ai__nav-link--active"]
              : ""
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
