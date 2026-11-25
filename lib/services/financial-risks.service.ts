import {
  ApiResponse,
  FinancialRisk,
  FinancialRiskExposureLevel,
  FinancialRiskListResponse,
  FinancialRiskRiskType,
  FinancialRiskSource,
  FinancialRiskUpdate,
  PatchedFinancialRisk,
} from "@/types/api";
import { proxyAuthService } from "./proxy-auth.service";

export interface FinancialRiskFilters {
  exposure_level?: FinancialRiskExposureLevel;
  is_resolved?: boolean;
  ordering?: string;
  page?: number;
  page_size?: number;
  property?: number;
  risk_score_gte?: number;
  risk_score_lte?: number;
  risk_type?: FinancialRiskRiskType;
  search?: string;
  source?: FinancialRiskSource;
}

class FinancialRisksService {
  private baseURL = "/api/proxy";

  private buildHeaders(): Record<string, string> {
    const token = proxyAuthService.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) headers.Authorization = `Token ${token}`;
    return headers;
  }

  private buildQuery(filters?: FinancialRiskFilters) {
    const queryParams = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          queryParams.append(key, value.toString());
        }
      });
    }

    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : "";
  }

  private getCollectionUrl(workspaceId: number, filters?: FinancialRiskFilters) {
    return `${this.baseURL}/workspaces/${workspaceId}/financial-risks/${this.buildQuery(filters)}`;
  }

  private getDetailUrl(workspaceId: number, riskId: number | string) {
    return `${this.baseURL}/workspaces/${workspaceId}/financial-risks/${riskId}/`;
  }

  private async request<T>(
    url: string,
    options: RequestInit,
    fallbackMessage: string
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.buildHeaders(),
          ...options.headers,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              data.message || data.error || data.detail || fallbackMessage,
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

  list(
    workspaceId: number,
    filters?: FinancialRiskFilters
  ): Promise<ApiResponse<FinancialRiskListResponse>> {
    return this.request<FinancialRiskListResponse>(
      this.getCollectionUrl(workspaceId, filters),
      { method: "GET" },
      "Failed to fetch financial risks"
    );
  }

  retrieve(
    workspaceId: number,
    riskId: number | string
  ): Promise<ApiResponse<FinancialRisk>> {
    return this.request<FinancialRisk>(
      this.getDetailUrl(workspaceId, riskId),
      { method: "GET" },
      "Failed to fetch financial risk"
    );
  }

  update(
    workspaceId: number,
    riskId: number | string,
    data: FinancialRiskUpdate
  ): Promise<ApiResponse<FinancialRisk>> {
    return this.request<FinancialRisk>(
      this.getDetailUrl(workspaceId, riskId),
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
      "Failed to update financial risk"
    );
  }

  partialUpdate(
    workspaceId: number,
    riskId: number | string,
    data: PatchedFinancialRisk
  ): Promise<ApiResponse<FinancialRisk>> {
    return this.request<FinancialRisk>(
      this.getDetailUrl(workspaceId, riskId),
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      "Failed to update financial risk"
    );
  }

  resolve(
    workspaceId: number,
    riskId: number | string,
    isResolved = true
  ): Promise<ApiResponse<FinancialRisk>> {
    return this.partialUpdate(workspaceId, riskId, {
      is_resolved: isResolved,
    });
  }
}

export const financialRisksService = new FinancialRisksService();
