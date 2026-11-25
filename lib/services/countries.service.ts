// Countries service using Next.js API proxy
import { ApiResponse } from '@/types/api';
import { proxyAuthService } from './proxy-auth.service';
import { Country } from '@/types/location';

interface CountryListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Country[];
}

interface ErrorResponse {
  message?: string;
  error?: string;
  detail?: string;
  [key: string]: any;
}

class CountriesService {
  private baseURL = '/api/proxy';

  async getAllCountries(): Promise<ApiResponse<Country[]>> {
    try {
      const token = proxyAuthService.getToken();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      
      // Get all countries in one request (there are only ~250 countries)
      const url = `${this.baseURL}/address/countries?page_size=1000`;
      
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
            message: errorData.message || errorData.error || errorData.detail || 'Failed to fetch countries',
            code: response.status.toString(),
            details: data,
          },
        };
      }

      const countryData = data as CountryListResponse;

      return {
        success: true,
        data: countryData.results,
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

export const countriesService = new CountriesService();
export type { Country, CountryListResponse };