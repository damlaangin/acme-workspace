import {
  ApiResponse,
  LeaveRequest,
  LeaveRequestListResponse,
  LeaveStatus,
} from "@/types/api";
import { proxyAuthService } from "./proxy-auth.service";

interface LeaveRequestFilters {
  status?: LeaveStatus;
  page?: number;
  page_size?: number;
}

class LeaveRequestsService {
  private baseURL = "/api/proxy";

  private buildHeaders(): Record<string, string> {
    const token = proxyAuthService.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Token ${token}`;
    return headers;
  }

  async list(
    workspaceId: number,
    filters?: LeaveRequestFilters,
  ): Promise<ApiResponse<LeaveRequestListResponse>> {
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            queryParams.append(key, value.toString());
          }
        });
      }

      const queryString = queryParams.toString();
      const url = `${this.baseURL}/workspaces/${workspaceId}/leave-requests/${
        queryString ? `?${queryString}` : ""
      }`;
      const response = await fetch(url, {
        method: "GET",
        headers: this.buildHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              data.message ||
              data.error ||
              data.detail ||
              "Failed to fetch leave requests",
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

  async approve(
    workspaceId: number,
    leaveRequestId: number,
    note?: string,
  ): Promise<ApiResponse<LeaveRequest>> {
    return this.review(workspaceId, leaveRequestId, "approve", note);
  }

  async reject(
    workspaceId: number,
    leaveRequestId: number,
    note?: string,
  ): Promise<ApiResponse<LeaveRequest>> {
    return this.review(workspaceId, leaveRequestId, "reject", note);
  }

  private async review(
    workspaceId: number,
    leaveRequestId: number,
    action: "approve" | "reject",
    note?: string,
  ): Promise<ApiResponse<LeaveRequest>> {
    try {
      const url = `${this.baseURL}/workspaces/${workspaceId}/leave-requests/${leaveRequestId}/${action}/`;
      const body = note ? JSON.stringify({ review_note: note }) : JSON.stringify({});
      const response = await fetch(url, {
        method: "POST",
        headers: this.buildHeaders(),
        body,
      });
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              data.message ||
              data.error ||
              data.detail ||
              `Failed to ${action} leave request`,
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

export const leaveRequestsService = new LeaveRequestsService();
