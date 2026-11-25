import { ApiResponse } from "@/types/api";
import { proxyAuthService } from "./proxy-auth.service";

export interface GroupIcon {
  id: number;
  name: string;
  icon: string;
}

export interface GroupIconListResponse {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: GroupIcon[];
}

export interface GroupIconListParams {
  ordering?: string;
  page?: number;
  page_size?: number;
  search?: string;
}

class GroupIconsService {
  private baseURL = "/api/proxy";

  private getAuthHeaders(): HeadersInit {
    const token = proxyAuthService.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Token ${token}`;
    }

    return headers;
  }

  private buildQuery(params?: GroupIconListParams) {
    if (!params) return "";
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.append(key, value.toString());
      }
    });
    const queryString = query.toString();
    return queryString ? `?${queryString}` : "";
  }

  // GET /group-icons/
  async getGroupIcons(
    params?: GroupIconListParams
  ): Promise<ApiResponse<GroupIconListResponse>> {
    try {
      const response = await fetch(
        `${this.baseURL}/group-icons${this.buildQuery(params)}`,
        {
          method: "GET",
          headers: {
            ...this.getAuthHeaders(),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || "Failed to fetch group icons",
            code: response.status.toString(),
            details: data,
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

  // GET /group-icons/{id}/
  async getGroupIcon(id: number | string): Promise<ApiResponse<GroupIcon>> {
    try {
      const response = await fetch(`${this.baseURL}/group-icons/${id}`, {
        method: "GET",
        headers: {
          ...this.getAuthHeaders(),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || "Failed to fetch group icon",
            code: response.status.toString(),
            details: data,
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
}

export const groupIconsService = new GroupIconsService();
