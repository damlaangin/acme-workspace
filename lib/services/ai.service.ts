import { ApiResponse } from '@/types/api';
import { proxyAuthService } from './proxy-auth.service';

interface ErrorResponse {
  message?: string;
  error?: string;
  detail?: string;
  [key: string]: any;
}

export interface ChronicIssue {
  id: number;
  property: number;
  issue_category: string;
  issue: string;
  report_count: number;
  is_resolved: boolean;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChronicIssueListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ChronicIssue[];
}

export interface ChronicIssueFilters {
  created_at_gte?: string;
  created_at_lte?: string;
  is_resolved?: boolean;
  issue?: string;
  issue_category?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
  property_id?: number;
  report_count_gte?: number;
  search?: string;
}

class AiService {
  private baseURL = '/api/proxy';

  async getChronicIssues(
    workspaceId: number,
    filters?: ChronicIssueFilters
  ): Promise<ApiResponse<ChronicIssueListResponse>> {
    try {
      const token = proxyAuthService.getToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value.toString());
          }
        });
      }

      const queryString = queryParams.toString();
      const url = `${this.baseURL}/workspaces/${workspaceId}/chronic-issues/${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        return {
          success: false,
          error: {
            message:
              errorData.message ||
              errorData.error ||
              errorData.detail ||
              'Failed to fetch chronic issues',
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

  async getChronicIssue(
    workspaceId: number,
    issueId: number
  ): Promise<ApiResponse<ChronicIssue>> {
    try {
      const token = proxyAuthService.getToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const url = `${this.baseURL}/workspaces/${workspaceId}/chronic-issues/${issueId}/`;
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        return {
          success: false,
          error: {
            message:
              errorData.message ||
              errorData.error ||
              errorData.detail ||
              'Failed to fetch chronic issue',
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

  async resolveChronicIssue(
    workspaceId: number,
    issueId: number,
    payload?: Partial<ChronicIssue>
  ): Promise<ApiResponse<ChronicIssue>> {
    try {
      const token = proxyAuthService.getToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const url = `${this.baseURL}/workspaces/${workspaceId}/chronic-issues/${issueId}/resolve/`;
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload ?? {}),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        return {
          success: false,
          error: {
            message:
              errorData.message ||
              errorData.error ||
              errorData.detail ||
              'Failed to resolve chronic issue',
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
}

export const aiService = new AiService();
