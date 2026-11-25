"use server";

import { cookies } from "next/headers";

import {
  AUTH_TOKEN_COOKIE,
  AUTH_COOKIE_DOMAIN,
  AUTH_TOKEN_MAX_AGE_SECONDS,
} from "@/lib/constants/auth";

export const getAuthToken = async (): Promise<string | null> => {
  const cookieStore = await cookies();

  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value ?? null;
};

export const setAuthToken = async (token: string) => {
  const cookieStore = await cookies();

  cookieStore.set({
    name: AUTH_TOKEN_COOKIE,
    value: token,
    httpOnly: false,
    sameSite: "lax",
    maxAge: AUTH_TOKEN_MAX_AGE_SECONDS,
    path: "/",
    domain: AUTH_COOKIE_DOMAIN,
  });
};

export const clearAuthToken = async () => {
  const cookieStore = await cookies();

  cookieStore.delete(AUTH_TOKEN_COOKIE);
};

export const isUserAuthenticated = async (): Promise<boolean> => {
  return Boolean(await getAuthToken());
};
