// API services for workspace groups management
import { proxyAuthService } from "./proxy-auth.service";
import { ApiResponse } from "@/types/api";

export interface WorkspaceGroup {
  id: number;
  name: string;
  permissions: number[];
  icon?: string | number | { id?: number; name?: string; icon?: string } | null;
  workspace?: number;
  created_at?: string;
  updated_at?: string;
}

export interface WorkspaceGroupCreateUpdate {
  name: string;
  permissions: Array<number | string>;
  icon?: number | string;
}

export interface WorkspaceGroupListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: WorkspaceGroup[];
}

class GroupsService {
  private baseURL = "/api/proxy";

  // Get all groups for a workspace
  async getGroups(workspaceId: number): Promise<ApiResponse<WorkspaceGroupListResponse>> {
    try {
      const token = proxyAuthService.getToken();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      } else {
        // No token available, making unauthenticated request
      }

      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/groups`,
        {
          method: "GET",
          headers,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to fetch groups',
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Network error',
          code: 'NETWORK_ERROR',
        },
      };
    }
  }

  // Get a specific group
  async getGroup(
    workspaceId: number,
    groupId: number
  ): Promise<ApiResponse<WorkspaceGroup>> {
    try {
      const token = proxyAuthService.getToken();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/groups/${groupId}`,
        {
          method: "GET",
          headers,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to fetch group',
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Network error',
          code: 'NETWORK_ERROR',
        },
      };
    }
  }

  // Create a new group
  async createGroup(
    workspaceId: number,
    groupData: FormData | WorkspaceGroupCreateUpdate
  ): Promise<ApiResponse<WorkspaceGroup>> {
    try {
      const token = proxyAuthService.getToken();
      
      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      
      // Check if groupData is FormData (for file uploads)
      const isFormData = groupData instanceof FormData;
      
      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }
      // For FormData, don't set Content-Type to let browser set boundary

      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/groups`,
        {
          method: "POST",
          headers,
          body: isFormData ? groupData : JSON.stringify(groupData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to create group',
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Network error',
          code: 'NETWORK_ERROR',
        },
      };
    }
  }

  // Update a group
  async updateGroup(
    workspaceId: number,
    groupId: number,
    groupData: FormData | WorkspaceGroupCreateUpdate
  ): Promise<ApiResponse<WorkspaceGroup>> {
    try {
      const token = proxyAuthService.getToken();
      
      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      
      // Check if groupData is FormData (for file uploads)
      const isFormData = groupData instanceof FormData;
      
      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }
      // For FormData, don't set Content-Type to let browser set boundary

      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/groups/${groupId}/`,
        {
          method: "PUT",
          headers,
          body: isFormData ? groupData : JSON.stringify(groupData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to update group',
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Network error',
          code: 'NETWORK_ERROR',
        },
      };
    }
  }

  // Partially update a group
  async patchGroup(
    workspaceId: number,
    groupId: number,
    groupData: Partial<WorkspaceGroupCreateUpdate>
  ): Promise<ApiResponse<WorkspaceGroup>> {
    try {
      const token = proxyAuthService.getToken();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/groups/${groupId}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify(groupData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to patch group',
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Network error',
          code: 'NETWORK_ERROR',
        },
      };
    }
  }

  // Delete a group
  async deleteGroup(workspaceId: number, groupId: number): Promise<ApiResponse<void>> {
    try {
      const token = proxyAuthService.getToken();
      
      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/groups/${groupId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      // DELETE requests may return no content (204)
      if (response.status === 204) {
        return {
          success: true,
          data: undefined,
        };
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to delete group',
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Network error',
          code: 'NETWORK_ERROR',
        },
      };
    }
  }
}

export const groupsService = new GroupsService();
