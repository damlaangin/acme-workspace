import { ApiResponse, Expense, ExpenseCreateUpdate, ExpenseListResponse } from '@/types/api';
import { proxyAuthService } from './proxy-auth.service';

export interface ExpenseFilters {
  page?: number;
  page_size?: number;
  amount?: number;
  amount_gte?: number;
  amount_lte?: number;
  created_at?: string; // date-time
  created_at_gte?: string; // date
  created_at_lte?: string; // date
  created_by_id?: number | null; // integer
  property_id?: number; // integer
  type?: string;
  description?: string; // search by description
  expense_type?: string; // filter by expense type
}

class ExpensesService {
  private baseURL = '/api/proxy';

  async getExpenses(workspaceId: number, filters?: ExpenseFilters): Promise<ApiResponse<ExpenseListResponse>> {
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
            queryParams.append(key, String(value));
          }
        });
      }

      const url = `${this.baseURL}/workspaces/${workspaceId}/expenses${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      const response = await fetch(url, { method: 'GET', headers });
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to fetch expenses',
            code: String(response.status),
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

  async createExpense(workspaceId: number, expenseData: ExpenseCreateUpdate): Promise<ApiResponse<Expense>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const url = `${this.baseURL}/workspaces/${workspaceId}/expenses/`;
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(expenseData),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to create expense',
            code: String(response.status),
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
}

export const expensesService = new ExpensesService();
