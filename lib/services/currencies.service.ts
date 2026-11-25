// Currencies service using Next.js API proxy
import { ApiResponse } from '@/types/api';
import { proxyAuthService } from './proxy-auth.service';
import { Currency } from '@/types/location';

interface CurrencyListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Currency[];
}

interface ErrorResponse {
  message?: string;
  error?: string;
  detail?: string;
  [key: string]: any;
}

class CurrenciesService {
  private baseURL = '/api/proxy';

  async getAllCurrencies(): Promise<ApiResponse<Currency[]>> {
    try {
      const token = proxyAuthService.getToken();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      
      // Get all currencies in one request (there are only ~155 currencies)
      const url = `${this.baseURL}/address/currencies?page_size=1000`;
      
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
            message: errorData.message || errorData.error || errorData.detail || 'Failed to fetch currencies',
            code: response.status.toString(),
            details: data,
          },
        };
      }

      const currencyData = data as CurrencyListResponse;

      return {
        success: true,
        data: currencyData.results,
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

export const currenciesService = new CurrenciesService();
export type { Currency, CurrencyListResponse };
