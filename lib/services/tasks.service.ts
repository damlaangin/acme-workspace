import {
  ApiResponse,
  SupervisorTaskToday,
  Task,
  TaskFilters,
  TaskListResponse,
} from "@/types/api";
import { proxyAuthService } from "./proxy-auth.service";

class TasksService {
  private baseURL = "/api/proxy";

  async getTodayAll(
    workspaceId: number,
    filters?: Pick<TaskFilters, "country_id" | "state_id" | "city_id">,
  ): Promise<ApiResponse<SupervisorTaskToday[]>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Token ${token}`;

      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      const queryString = queryParams.toString();
      const url = `${this.baseURL}/workspaces/${workspaceId}/tasks/today-all/${queryString ? `?${queryString}` : ""}`;
      const response = await fetch(url, { method: "GET", headers });
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              data.message || data.error || data.detail || "Failed to fetch tasks",
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

  async getTasks(workspaceId: number, filters?: TaskFilters): Promise<ApiResponse<TaskListResponse>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Token ${token}`;

      const queryParams = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((v) => {
              if (v !== undefined && v !== null && v !== "") {
                queryParams.append(key, v);
              }
            });
          } else if (value !== undefined && value !== null && value !== "") {
            queryParams.append(key, value.toString());
          }
        });
      }

      const queryString = queryParams.toString();
      const url = `${this.baseURL}/workspaces/${workspaceId}/tasks/${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || "Failed to fetch tasks",
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

  async getTask(workspaceId: number, taskId: number): Promise<ApiResponse<Task>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Token ${token}`;

      const url = `${this.baseURL}/workspaces/${workspaceId}/tasks/${taskId}/`;
      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || "Failed to fetch task",
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

  async createTask(workspaceId: number, taskData: Task): Promise<ApiResponse<Task>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Token ${token}`;

      const url = `${this.baseURL}/workspaces/${workspaceId}/tasks/`;
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(taskData),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || "Failed to create task",
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

  async updateTaskFull(workspaceId: number, taskId: number, taskData: Task): Promise<ApiResponse<Task>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Token ${token}`;

      const url = `${this.baseURL}/workspaces/${workspaceId}/tasks/${taskId}/`;
      const response = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(taskData),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || "Failed to update task",
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

  async updateTask(workspaceId: number, taskId: number, taskData: Partial<Task>): Promise<ApiResponse<Task>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Token ${token}`;

      const url = `${this.baseURL}/workspaces/${workspaceId}/tasks/${taskId}/`;
      const response = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify(taskData),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || "Failed to update task",
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

  async deleteTask(workspaceId: number, taskId: number): Promise<ApiResponse<null>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Token ${token}`;

      const url = `${this.baseURL}/workspaces/${workspaceId}/tasks/${taskId}/`;
      const response = await fetch(url, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || "Failed to delete task",
            code: response.status.toString(),
            details: data,
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

export const tasksService = new TasksService();
