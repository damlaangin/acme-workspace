"use client";

import { ThemeProvider } from "@/context/theme-context";

export const ThemeProviderWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <ThemeProvider>{children}</ThemeProvider>;
};
