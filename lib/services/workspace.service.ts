// API services for workspace management using proxy
import {
  Workspace,
  WorkspaceListResponse,
  WorkspaceUser,
  WorkspaceUserListResponse,
  WorkspaceUserCreate,
  WorkspaceUserUpdate,
  WorkspaceUserPatch,
  WorkspacePatch,
  CurrencyListResponse,
  ApiResponse,
} from "@/types/api";
import { proxyAuthService } from "./proxy-auth.service";
import { formatApiErrors } from "@/lib/utils/format-api-errors";

import { Currency, City } from "@/types/location";

interface UserFilters {
  page?: number;
  page_size?: number;
  search?: string;
  name?: string;
  email?: string;
  is_active?: boolean;
  user_type?: "workspace_admin" | "property_owner" | "staff" | "app_user";
  ordering?: string;
  group?: number;
  workspace_id?: number;
}

class WorkspaceService {
  private baseURL = "/api/proxy";

  async createWorkspace(
    workspaceData: Partial<Workspace>
  ): Promise<ApiResponse<Workspace>> {
    try {
      const token = this.getToken();
      const response = await fetch(`${this.baseURL}/workspaces`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(workspaceData),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || "Failed to create workspace",
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

  async getWorkspace(workspaceId: number): Promise<ApiResponse<Workspace>> {
    try {
      const token = this.getToken();
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || "Failed to get workspace",
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

  async listWorkspaces(): Promise<ApiResponse<WorkspaceListResponse>> {
    try {
      const token = this.getToken();
      const response = await fetch(`${this.baseURL}/workspaces`, {
        method: "GET",
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || "Failed to list workspaces",
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

  async updateWorkspace(
    workspaceId: number,
    workspaceData: Partial<Workspace>
  ): Promise<ApiResponse<Workspace>> {
    try {
      const token = this.getToken();
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify(workspaceData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || "Failed to update workspace",
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

  async patchWorkspace(
    workspaceId: number,
    workspaceData: WorkspacePatch
  ): Promise<ApiResponse<Workspace>> {
    try {
      const token = this.getToken();
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify(workspaceData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || "Failed to update workspace",
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

  async patchWorkspaceFormData(
    workspaceId: number,
    workspaceData: FormData
  ): Promise<ApiResponse<Workspace>> {
    try {
      const token = this.getToken();
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Token ${token}`,
          },
          body: workspaceData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || "Failed to update workspace",
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

  async deleteWorkspace(workspaceId: number): Promise<ApiResponse<any>> {
    try {
      const token = this.getToken();
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || "Failed to delete workspace",
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

  private getToken(): string | null {
    return proxyAuthService.getToken();
  }

  async getWorkspaceUsers(
    workspaceId: number,
    filters?: UserFilters
  ): Promise<ApiResponse<WorkspaceUserListResponse>> {
    try {
      const token = this.getToken();

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            queryParams.append(key, value.toString());
          }
        });
      }

      const queryString = queryParams.toString();
      const url = `${this.baseURL}/workspaces/${workspaceId}/users${
        queryString ? `?${queryString}` : ""
      }`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              data.message || data.error || "Failed to get workspace users",
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

  async getWorkspaceUser(
    workspaceId: number,
    userId: number
  ): Promise<ApiResponse<WorkspaceUser>> {
    try {
      const token = this.getToken();
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/users/${userId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              data.message || data.error || "Failed to get workspace user",
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

  async createWorkspaceUser(
    workspaceId: number,
    userData: WorkspaceUserCreate
  ): Promise<ApiResponse<WorkspaceUser>> {
    try {
      const token = this.getToken();
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify(userData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              formatApiErrors(data) || "Failed to create workspace user",
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

  async updateWorkspaceUser(
    workspaceId: number,
    userId: number,
    userData: WorkspaceUserUpdate
  ): Promise<ApiResponse<WorkspaceUser>> {
    try {
      const token = this.getToken();
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/users/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify(userData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              formatApiErrors(data) || "Failed to update workspace user",
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

  async patchWorkspaceUser(
    workspaceId: number,
    userId: number,
    userData: WorkspaceUserPatch
  ): Promise<ApiResponse<WorkspaceUser>> {
    try {
      const token = this.getToken();
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/users/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify(userData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              formatApiErrors(data) || "Failed to update workspace user",
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

  async deleteWorkspaceUser(
    workspaceId: number,
    userId: number
  ): Promise<ApiResponse<any>> {
    try {
      const token = this.getToken();
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          success: false,
          error: {
            message:
              formatApiErrors(data) || "Failed to delete workspace user",
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data: null };
    } catch (error) {
      console.error("Delete request error:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  async resendInvitation(
    workspaceId: number,
    userId: number
  ): Promise<ApiResponse<{ detail: string }>> {
    try {
      const token = this.getToken();
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/users/${userId}/resend-invitation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              formatApiErrors(data) || "Failed to resend invitation",
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

  async generateSetupLink(
    workspaceId: number,
    userId: number
  ): Promise<ApiResponse<{ setup_url: string }>> {
    try {
      const token = this.getToken();
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/users/${userId}/generate-setup-link/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              formatApiErrors(data) || "Failed to generate setup link",
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

class AddressService {
  private baseURL = "/api/proxy";

  async getCurrencies(
    page?: number,
    pageSize?: number
  ): Promise<ApiResponse<CurrencyListResponse>> {
    try {
      const token = this.getToken();
      let endpoint = "/address/currencies/";
      const params = new URLSearchParams();

      if (page) params.append("page", page.toString());
      if (pageSize) params.append("page_size", pageSize.toString());

      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: "GET",
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || "Failed to get currencies",
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

  async getCity(cityId: number): Promise<ApiResponse<City>> {
    try {
      const token = this.getToken();
      const response = await fetch(`${this.baseURL}/address/cities/${cityId}`, {
        method: "GET",
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || "Failed to get city",
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

  private getToken(): string | null {
    return proxyAuthService.getToken();
  }
}

export const workspaceService = new WorkspaceService();
export const addressService = new AddressService();
export type { UserFilters };
