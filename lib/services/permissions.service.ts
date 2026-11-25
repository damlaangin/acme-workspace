// API service for permissions management
import { ApiResponse } from "@/types/api";
import { proxyAuthService } from "./proxy-auth.service";

export interface Permission {
  id: number;
  name: string;
  codename: string;
}

export type AllowedUserType = "workspace_admin" | "property_owner" | "staff" | "app_user";

export interface WorkspaceAllowedPermission {
  id: number;
  permissions: Permission[];
  user_type: AllowedUserType;
}

export interface AllowedPermissionsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: WorkspaceAllowedPermission[];
}

class PermissionsService {
  private baseURL = "/api/proxy";

  private getAuthHeaders(): HeadersInit {
    const token = proxyAuthService.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Token ${token}`;
    }

    return headers;
  }

  private buildQuery(params?: {
    name?: string;
    ordering?: string;
    page?: number;
    page_size?: number;
    search?: string;
    user_type?: AllowedUserType;
  }) {
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

  // GET /allowed_permissions/?user_type=property_owner
  async getAllowedPermissions(params?: {
    name?: string;
    ordering?: string;
    page?: number;
    page_size?: number;
    search?: string;
    user_type?: AllowedUserType;
  }): Promise<ApiResponse<AllowedPermissionsResponse>> {
    try {
      const response = await fetch(
        `${this.baseURL}/allowed_permissions${this.buildQuery(params)}`,
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
            message:
              data.message || data.error || "Failed to fetch allowed permissions",
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error fetching allowed permissions:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  // GET /allowed_permissions/{user_type}/
  async getAllowedPermissionsByUserType(
    userType: AllowedUserType
  ): Promise<ApiResponse<WorkspaceAllowedPermission>> {
    try {
      const response = await fetch(
        `${this.baseURL}/allowed_permissions/${userType}`,
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
            message:
              data.message ||
              data.error ||
              `Failed to fetch allowed permissions for ${userType}`,
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      console.error(
        `Error fetching allowed permissions for ${userType}:`,
        error
      );
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  // Get all permissions from all user types (flattened)
  async getAllPermissions(): Promise<ApiResponse<Permission[]>> {
    const response = await this.getAllowedPermissions();
    if (!response.success || !response.data) {
      return response as unknown as ApiResponse<Permission[]>;
    }

    const allPermissions: Permission[] = [];
    const seenPermissions = new Set<number>();

    response.data.results.forEach((userTypePermissions) => {
      userTypePermissions.permissions.forEach((permission) => {
        if (!seenPermissions.has(permission.id)) {
          seenPermissions.add(permission.id);
          allPermissions.push(permission);
        }
      });
    });

    return { success: true, data: allPermissions };
  }
}

export const permissionsService = new PermissionsService();
