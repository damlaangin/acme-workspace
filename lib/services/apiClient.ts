import { API_CONFIG } from "@/lib/config/api-config";

export type ApiFetchInit = {
  body?: BodyInit | null;
  method?: string;
  headers?: HeadersInit;
  cache?: RequestCache;
  signal?: AbortSignal;
  authToken?: string | null;
  json?: unknown;
};

export type ApiFetchResponse = {
  statusCode: number;
  headers: Headers;
  body: string | null;
  url: string;
};

export type ApiJsonResponse<T> = ApiFetchResponse & {
  data: T | null;
};

const resolveInternalBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    return "";
  }

  const explicitBase =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL;

  if (explicitBase) {
    return explicitBase.replace(/\/?$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  const port = process.env.PORT ?? 3000;
  return `http://localhost:${port}`;
};

const buildUrl = (endpoint: string) => {
  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  return `${resolveInternalBaseUrl()}${API_CONFIG.PROXY_BASE_PATH}${normalizedEndpoint}`;
};

const serializeJsonBody = (init: ApiFetchInit, headers: Headers) => {
  if (init.json === undefined) {
    return { body: init.body ?? null, method: init.method };
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return {
    method: init.method ?? "POST",
    body: JSON.stringify(init.json),
  };
};

export const fetchFromAPI = async (
  endpoint: string,
  init?: ApiFetchInit
): Promise<ApiFetchResponse> => {
  const headers = new Headers(init?.headers);

  if (init?.authToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Token ${init.authToken}`);
  }

  const { body, method } = serializeJsonBody(init ?? {}, headers);

  const requestInit: RequestInit = {
    method: method ?? "GET",
    headers,
    body,
    cache: init?.cache,
    signal: init?.signal,
  };

  const url = buildUrl(endpoint);

  try {
    const response = await fetch(url, requestInit);
    const textBody = await response.text().catch(() => null);

    return {
      statusCode: response.status,
      headers: response.headers,
      body: textBody?.length ? textBody : null,
      url,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`Failed to fetch from ${url}`, error);
    }

    return {
      statusCode: 500,
      headers: new Headers(),
      body: null,
      url,
    };
  }
};

export const fetchJson = async <T>(
  endpoint: string,
  init?: ApiFetchInit
): Promise<ApiJsonResponse<T>> => {
  const response = await fetchFromAPI(endpoint, init);

  if (!response.body) {
    return { ...response, data: null };
  }

  try {
    return { ...response, data: JSON.parse(response.body) as T };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`Failed to parse JSON from ${response.url}`, error);
    }

    return { ...response, data: null };
  }
};
