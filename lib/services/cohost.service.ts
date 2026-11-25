import { ApiResponse } from "@/types/api";
import { proxyAuthService } from "./proxy-auth.service";

interface ErrorResponse {
  message?: string;
  error?: string;
  detail?: string;
  [key: string]: any;
}

export type CohostProfile = Record<string, any>;
export type CohostProfilePayload = Record<string, any>;
export type CohostProfileResponse = CohostProfile | CohostProfile[] | null;

class CohostService {
  private baseURL = "/api/proxy";

  private buildHeaders(): Record<string, string> {
    const token = proxyAuthService.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Token ${token}`;
    }

    return headers;
  }

  private async parseResponse(response: Response): Promise<any | null> {
    const text = await response.text();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async getCohostProfiles(
    workspaceId: number
  ): Promise<ApiResponse<CohostProfileResponse>> {
    try {
      const headers = this.buildHeaders();
      const url = `${this.baseURL}/workspaces/${workspaceId}/cohost-profiles/`;

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      const data = await this.parseResponse(response);

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        return {
          success: false,
          error: {
            message:
              errorData?.message ||
              errorData?.error ||
              errorData?.detail ||
              "Failed to fetch co-host profiles",
            code: response.status.toString(),
            details: data ?? undefined,
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  async createCohostProfile(
    workspaceId: number,
    payload?: CohostProfilePayload
  ): Promise<ApiResponse<CohostProfileResponse>> {
    try {
      const headers = this.buildHeaders();
      const url = `${this.baseURL}/workspaces/${workspaceId}/cohost-profiles/`;

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: payload ? JSON.stringify(payload) : undefined,
      });

      const data = await this.parseResponse(response);

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        return {
          success: false,
          error: {
            message:
              errorData?.message ||
              errorData?.error ||
              errorData?.detail ||
              "Failed to create co-host profile",
            code: response.status.toString(),
            details: data ?? undefined,
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  async getCohostProfile(
    workspaceId: number,
    profileId: string
  ): Promise<ApiResponse<CohostProfileResponse>> {
    try {
      const headers = this.buildHeaders();
      const url = `${this.baseURL}/workspaces/${workspaceId}/cohost-profiles/${profileId}/`;

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      const data = await this.parseResponse(response);

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        return {
          success: false,
          error: {
            message:
              errorData?.message ||
              errorData?.error ||
              errorData?.detail ||
              "Failed to fetch co-host profile",
            code: response.status.toString(),
            details: data ?? undefined,
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  async updateCohostProfile(
    workspaceId: number,
    profileId: string,
    payload: CohostProfilePayload
  ): Promise<ApiResponse<CohostProfileResponse>> {
    try {
      const headers = this.buildHeaders();
      const url = `${this.baseURL}/workspaces/${workspaceId}/cohost-profiles/${profileId}/`;

      const response = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await this.parseResponse(response);

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        return {
          success: false,
          error: {
            message:
              errorData?.message ||
              errorData?.error ||
              errorData?.detail ||
              "Failed to update co-host profile",
            code: response.status.toString(),
            details: data ?? undefined,
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  async partialUpdateCohostProfile(
    workspaceId: number,
    profileId: string,
    payload: CohostProfilePayload
  ): Promise<ApiResponse<CohostProfileResponse>> {
    try {
      const headers = this.buildHeaders();
      const url = `${this.baseURL}/workspaces/${workspaceId}/cohost-profiles/${profileId}/`;

      const response = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await this.parseResponse(response);

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        return {
          success: false,
          error: {
            message:
              errorData?.message ||
              errorData?.error ||
              errorData?.detail ||
              "Failed to update co-host profile",
            code: response.status.toString(),
            details: data ?? undefined,
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  async deleteCohostProfile(
    workspaceId: number,
    profileId: string
  ): Promise<ApiResponse<null>> {
    try {
      const headers = this.buildHeaders();
      const url = `${this.baseURL}/workspaces/${workspaceId}/cohost-profiles/${profileId}/`;

      const response = await fetch(url, {
        method: "DELETE",
        headers,
      });

      const data = await this.parseResponse(response);

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        return {
          success: false,
          error: {
            message:
              errorData?.message ||
              errorData?.error ||
              errorData?.detail ||
              "Failed to delete co-host profile",
            code: response.status.toString(),
            details: data ?? undefined,
          },
        };
      }

      return { success: true, data: null };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }
}

export const cohostService = new CohostService();
