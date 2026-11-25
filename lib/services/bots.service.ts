import {
  ApiResponse,
  Bot,
  PaginatedBotList,
  PatchedBot,
  BotSetupFormSubmissionCreate,
} from "@/types/api";
import { proxyAuthService } from "./proxy-auth.service";

interface BotFilters {
  bot_response_delay_gte?: number;
  bot_response_delay_lte?: number;
  created_at_gte?: string;
  created_at_lte?: string;
  name?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
  search?: string;
  workspace_id?: number;
}

class BotsService {
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

  private buildQueryParams(filters?: Record<string, any>) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString());
        }
      });
    }
    return params.toString();
  }

  async getBots(
    workspaceId: number,
    filters?: BotFilters
  ): Promise<ApiResponse<PaginatedBotList>> {
    try {
      const headers = this.buildHeaders();

      const queryString = this.buildQueryParams({
        ...filters,
        workspace_id: filters?.workspace_id ?? workspaceId,
      });
      const url = `${this.baseURL}/workspaces/${workspaceId}/bots/${
        queryString ? `?${queryString}` : ""
      }`;

      const response = await fetch(url, {
        method: "GET",
        headers,
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
              "Failed to fetch bots",
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

  async createBot(
    workspaceId: number,
    botData: Bot
  ): Promise<ApiResponse<Bot>> {
    try {
      const headers = this.buildHeaders();

      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/bots/`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(botData),
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
              data.detail ||
              "Failed to create bot",
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

  async setupBot(
    workspaceId: number,
    payload: BotSetupFormSubmissionCreate
  ): Promise<ApiResponse<BotSetupFormSubmissionCreate>> {
    try {
      const headers = this.buildHeaders();

      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/bots/setup_bot/`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
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
              data.detail ||
              "Failed to setup bot",
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

  async getBot(
    workspaceId: number,
    botId: number
  ): Promise<ApiResponse<Bot>> {
    try {
      const headers = this.buildHeaders();

      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/bots/${botId}/`,
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
            message:
              data.message ||
              data.error ||
              data.detail ||
              "Failed to fetch bot",
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

  async updateBot(
    workspaceId: number,
    botId: number,
    botData: Bot
  ): Promise<ApiResponse<Bot>> {
    try {
      const headers = this.buildHeaders();

      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/bots/${botId}/`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(botData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              data.message || data.error || data.detail || "Failed to update bot",
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

  async partialUpdateBot(
    workspaceId: number,
    botId: number,
    botData: PatchedBot
  ): Promise<ApiResponse<Bot>> {
    try {
      const headers = this.buildHeaders();

      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/bots/${botId}/`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify(botData),
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
              data.detail ||
              "Failed to update bot",
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

  async deleteBot(
    workspaceId: number,
    botId: number
  ): Promise<ApiResponse<null>> {
    try {
      const headers = this.buildHeaders();

      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/bots/${botId}/`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: {
            message:
              data.message ||
              data.error ||
              data.detail ||
              "Failed to delete bot",
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

export const botsService = new BotsService();
export type { BotFilters };
