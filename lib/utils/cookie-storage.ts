import { AUTH_COOKIE_DOMAIN } from "@/lib/constants/auth";

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const getCookieDomain = () => {
  const envDomain =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_COOKIE_DOMAIN : undefined;
  const domainSource = envDomain?.trim() || AUTH_COOKIE_DOMAIN;

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || /^[\d.]+$/.test(hostname)) {
      return undefined;
    }
  }

  if (!domainSource) return undefined;

  return domainSource.startsWith(".") ? domainSource : `.${domainSource}`;
};

export const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;

  const prefix = `${name}=`;
  const match = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(prefix));

  if (!match) return null;

  return decodeURIComponent(match.substring(prefix.length));
};

export const setCookie = (
  name: string,
  value: string,
  maxAgeSeconds: number = DEFAULT_MAX_AGE_SECONDS
) => {
  if (typeof document === "undefined") return;

  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  const domain = getCookieDomain();

  let cookie = `${name}=${encodeURIComponent(
    value
  )}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax;`;

  if (domain) {
    cookie += ` Domain=${domain};`;
  }

  if (isSecure) {
    cookie += " Secure;";
  }

  document.cookie = cookie;
};

export const removeCookie = (name: string) => {
  if (typeof document === "undefined") return;

  const domain = getCookieDomain();
  let cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax;`;

  if (domain) {
    cookie += ` Domain=${domain};`;
  }

  document.cookie = cookie;
};
