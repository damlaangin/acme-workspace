import { DEMO_TOKEN } from "@/lib/constants/auth";

// Demo build: no real tokens. A constant dummy token keeps the service layer's
// "is there a token?" checks happy; the mock API ignores it.
class ProxyAuthService {
  saveToken(_token: string): void {}
  setToken(_token: string): void {}
  getToken(): string | null {
    return DEMO_TOKEN;
  }
  removeToken(): void {}
  isAuthenticated(): boolean {
    return true;
  }
}

export const proxyAuthService = new ProxyAuthService();
