// States service using Next.js API proxy
import { ApiResponse } from '@/types/api';
import { proxyAuthService } from './proxy-auth.service';
import { State } from '@/types/location';

interface StateListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: State[];
}

interface ErrorResponse {
  message?: string;
  error?: string;
  detail?: string;
  [key: string]: any;
}

class StatesService {
  private baseURL = '/api/proxy';

  async getStatesByCountry(countryId: number): Promise<ApiResponse<State[]>> {
    try {
      const token = proxyAuthService.getToken();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      
      // Get all states for the given country (use high page_size to get all)
      const url = `${this.baseURL}/address/states?country_id=${countryId}&page_size=1000`;
      
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
            message: errorData.message || errorData.error || errorData.detail || 'Failed to fetch states',
            code: response.status.toString(),
            details: data,
          },
        };
      }

      const stateData = data as StateListResponse;

      return {
        success: true,
        data: stateData.results,
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

  async getAllStates(params?: {
    country_id?: number;
    name?: string;
    ordering?: string;
    page?: number;
    page_size?: number;
    search?: string;
  }): Promise<ApiResponse<State[]>> {
    try {
      const token = proxyAuthService.getToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const query = new URLSearchParams();
      if (params?.country_id) query.set('country_id', params.country_id.toString());
      if (params?.name) query.set('name', params.name);
      if (params?.ordering) query.set('ordering', params.ordering);
      if (params?.page) query.set('page', params.page.toString());
      if (params?.page_size) query.set('page_size', params.page_size.toString());
      if (params?.search) query.set('search', params.search);

      const queryString = query.toString();
      const url = `${this.baseURL}/address/states${queryString ? `?${queryString}` : ""}`;

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
            message: errorData.message || errorData.error || errorData.detail || 'Failed to fetch states',
            code: response.status.toString(),
            details: data,
          },
        };
      }

      const stateData = data as StateListResponse;

      return {
        success: true,
        data: stateData.results,
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

export const statesService = new StatesService();
export type { State, StateListResponse };
