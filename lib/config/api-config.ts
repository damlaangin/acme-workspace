export const API_CONFIG = {
  BASE_URL:
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    "https://api.example.com",
  API_VERSION: "/api/v1",
  PROXY_BASE_PATH: "/api/proxy",
  ENDPOINTS: {
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
    REGISTRATION: "/registration",
    USER: "/auth/user",
    WORKSPACES: "/workspaces",
    CURRENCIES: "/address/currencies",
    CITIES: "/address/cities",
    ALLOWED_PERMISSIONS: "/allowed_permissions",
  },
} as const;

export const getApiUrl = (endpoint: string) => {
  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  return `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}${normalizedEndpoint}`;
};
