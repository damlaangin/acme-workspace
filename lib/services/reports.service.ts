import {
  ApiResponse,
  ConversationAnalyticsOverview,
  EarningAnalyticsDataPoint,
  ExpenseAnalyticsDataPoint,
  GuestDemographic,
  MonthlySummary,
  PropertyOccupancy,
  ReservationAnalyticsDataPoint,
  RevenuePacingEntry,
} from '@/types/api';
import { proxyAuthService } from './proxy-auth.service';

interface AnalyticsFilters {
  currencies?: string[];
  date_after?: string;
  date_before?: string;
  end_date?: string;
  ordering?: string;
  owners?: string[];
  period?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  property_id?: number;
  properties?: number[];
  search?: string;
  start_date?: string;
  type?: 'cleaning' | 'rent' | 'maintenance' | 'fixture' | 'market' | 'crediting' | 'dues' | 'invoice' | 'tax';
}

class ReportsService {
  private baseURL = '/api/proxy';

  private async fetchAnalytics<T>(
    workspaceId: number,
    endpoint: string,
    filters?: AnalyticsFilters
  ): Promise<ApiResponse<T>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (token) headers['Authorization'] = `Token ${token}`;

      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            if (value.length > 0) {
              const listValue = value.join(",");
              queryParams.append(key, listValue);
            }
          } else if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = `${this.baseURL}/workspaces/${workspaceId}/analytics/${endpoint}${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, { method: 'GET', headers });
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || `Failed to fetch ${endpoint} analytics`,
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
          message: error instanceof Error ? error.message : 'Network error',
          code: 'NETWORK_ERROR',
        },
      };
    }
  }

  getReservationAnalytics(workspaceId: number, filters?: AnalyticsFilters) {
    return this.fetchAnalytics<ReservationAnalyticsDataPoint[]>(workspaceId, 'reservations', filters);
  }

  getEarningAnalytics(workspaceId: number, filters?: AnalyticsFilters) {
    return this.fetchAnalytics<EarningAnalyticsDataPoint[]>(workspaceId, 'earnings', filters);
  }

  getExpenseAnalytics(workspaceId: number, filters?: AnalyticsFilters) {
    return this.fetchAnalytics<ExpenseAnalyticsDataPoint[]>(workspaceId, 'expenses', filters);
  }

  getConversationAnalytics(workspaceId: number) {
    return this.fetchAnalytics<ConversationAnalyticsOverview>(workspaceId, 'conversations');
  }

  getGuestDemographics(workspaceId: number, filters: AnalyticsFilters & { start_date: string; end_date: string }) {
    return this.fetchAnalytics<GuestDemographic | GuestDemographic[]>(workspaceId, 'guest-demographics', filters);
  }

  getMonthlySummary(workspaceId: number, filters?: AnalyticsFilters) {
    return this.fetchAnalytics<MonthlySummary[]>(workspaceId, 'monthly-summary', filters);
  }

  getPropertyOccupancy(workspaceId: number, filters?: AnalyticsFilters) {
    return this.fetchAnalytics<PropertyOccupancy[]>(workspaceId, 'property-occupancy', filters);
  }

  async getRevenuePacing(
    workspaceId: number,
    params?: { months_ahead?: number; properties?: string }
  ): Promise<ApiResponse<RevenuePacingEntry[]>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Token ${token}`;

      const queryParams = new URLSearchParams();
      if (params?.months_ahead) queryParams.append('months_ahead', params.months_ahead.toString());
      if (params?.properties) queryParams.append('properties', params.properties);

      const url = `${this.baseURL}/workspaces/${workspaceId}/analytics/revenue-pacing/${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, { method: 'GET', headers });
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to fetch revenue pacing',
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
          message: error instanceof Error ? error.message : 'Network error',
          code: 'NETWORK_ERROR',
        },
      };
    }
  }


  async exportAnalytics(
    workspaceId: number,
    params: {
      date_after?: string;
      date_before?: string;
      period?: string;
      export_format?: string;
      properties?: string;
      data_points?: string;
    }
  ): Promise<Blob> {
    const token = proxyAuthService.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Token ${token}`;

    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    const url = `${this.baseURL}/workspaces/${workspaceId}/analytics/export/${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Export failed with status ${response.status}`);
    }

    return response.blob();
  }
}

export const reportsService = new ReportsService();
export type { AnalyticsFilters };
