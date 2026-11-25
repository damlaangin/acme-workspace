"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import styles from "@/styles/ui/PageGreeting.module.scss";

interface PageGreetingProps {
  title?: ReactNode | null;
  subtitle?: ReactNode | null;
  className?: string;
  showGreetingTitle?: boolean;
  animateGreetingTitle?: boolean;
  greetingClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

export default function PageGreeting({
  title,
  subtitle,
  className,
  showGreetingTitle,
  animateGreetingTitle,
  greetingClassName,
  titleClassName,
  subtitleClassName,
}: PageGreetingProps) {
  const pathname = usePathname();
  const [isGreetingHidden, setIsGreetingHidden] = useState(false);
  const { user } = useAuth();
  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Morning"
      : now.getHours() < 18
        ? "Afternoon"
        : "Evening";
  const displayName = (user?.name || "Admin")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
  const shouldShowGreetingTitle = showGreetingTitle ?? pathname === "/dashboard";
  const shouldAnimateGreetingTitle =
    shouldShowGreetingTitle && Boolean(animateGreetingTitle);

  useEffect(() => {
    setIsGreetingHidden(false);

    if (!shouldAnimateGreetingTitle) {
      return;
    }

    const hideTimer = window.setTimeout(() => {
      setIsGreetingHidden(true);
    }, 2400);

    return () => window.clearTimeout(hideTimer);
  }, [shouldAnimateGreetingTitle]);

  return (
    <div className={[styles.pageGreeting, className].filter(Boolean).join(" ")}>
      {shouldShowGreetingTitle ? (
        <h1
          className={[
            styles.pageGreetingTitle,
            isGreetingHidden ? styles.pageGreetingTitleExit : "",
            greetingClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {greeting}, {displayName}.
        </h1>
      ) : null}
      {title ? (
        <p
          className={[styles.pageGreetingHeadline, titleClassName]
            .filter(Boolean)
            .join(" ")}
        >
          {title}
        </p>
      ) : null}
      {subtitle ? (
        <p
          className={[styles.pageGreetingSubtitle, subtitleClassName]
            .filter(Boolean)
            .join(" ")}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
