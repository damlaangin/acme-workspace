// Cities service using Next.js API proxy
import { ApiResponse } from '@/types/api';
import { proxyAuthService } from './proxy-auth.service';
import { City } from '@/types/location';

interface CityListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: City[];
}

interface ErrorResponse {
  message?: string;
  error?: string;
  detail?: string;
  [key: string]: any;
}

class CitiesService {
  private baseURL = '/api/proxy';

  async getCitiesByState(stateId: number): Promise<ApiResponse<City[]>> {
    try {
      const token = proxyAuthService.getToken();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      
      // Get all cities for the given state (use high page_size to get all)
      const url = `${this.baseURL}/address/cities?state_id=${stateId}&page_size=1000`;
      
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
            message: errorData.message || errorData.error || errorData.detail || 'Failed to fetch cities',
            code: response.status.toString(),
            details: data,
          },
        };
      }

      const cityData = data as CityListResponse;

      return {
        success: true,
        data: cityData.results,
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

  async getAllCities(params?: {
    name?: string;
    ordering?: string;
    page?: number;
    page_size?: number;
    search?: string;
    state_id?: number;
  }): Promise<ApiResponse<City[]>> {
    try {
      const token = proxyAuthService.getToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const query = new URLSearchParams();
      if (params?.name) query.set('name', params.name);
      if (params?.ordering) query.set('ordering', params.ordering);
      if (params?.page) query.set('page', params.page.toString());
      if (params?.page_size) query.set('page_size', params.page_size.toString());
      if (params?.search) query.set('search', params.search);
      if (params?.state_id) query.set('state_id', params.state_id.toString());

      const queryString = query.toString();
      const url = `${this.baseURL}/address/cities${queryString ? `?${queryString}` : ""}`;

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
            message: errorData.message || errorData.error || errorData.detail || 'Failed to fetch cities',
            code: response.status.toString(),
            details: data,
          },
        };
      }

      const cityData = data as CityListResponse;

      return {
        success: true,
        data: cityData.results,
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

export const citiesService = new CitiesService();
export type { City, CityListResponse };
