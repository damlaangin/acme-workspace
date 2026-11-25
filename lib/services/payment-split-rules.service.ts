import { PaymentSplitRule, ApiResponse } from '@/types/api';
import { proxyAuthService } from './proxy-auth.service';

interface PaymentSplitRuleListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PaymentSplitRule[];
}

class PaymentSplitRulesService {
  private baseURL = '/api/proxy';

  private buildHeaders(): Record<string, string> {
    const token = proxyAuthService.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }
    return headers;
  }

  private async parseResponse(response: Response): Promise<any | null> {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private getErrorMessage(data: any, fallback: string): string {
    if (!data) return fallback;
    if (typeof data === 'string') return data || fallback;
    if (typeof data === 'object') {
      return data.message || data.error || data.detail || fallback;
    }
    return fallback;
  }

  async getAll(workspaceId: number): Promise<ApiResponse<PaymentSplitRuleListResponse>> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/payment-split-rules/`,
        { method: 'GET', headers: this.buildHeaders() },
      );
      const data = await this.parseResponse(response);
      if (!response.ok) {
        return { success: false, error: { message: this.getErrorMessage(data, 'Failed to fetch rules') } };
      }
      return { success: true, data };
    } catch {
      return { success: false, error: { message: 'Network error' } };
    }
  }

  async getById(workspaceId: number, ruleId: number): Promise<ApiResponse<PaymentSplitRule>> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/payment-split-rules/${ruleId}/`,
        { method: 'GET', headers: this.buildHeaders() },
      );
      const data = await this.parseResponse(response);
      if (!response.ok) {
        return { success: false, error: { message: this.getErrorMessage(data, 'Failed to fetch rule') } };
      }
      return { success: true, data };
    } catch {
      return { success: false, error: { message: 'Network error' } };
    }
  }

  async create(workspaceId: number, payload: Partial<PaymentSplitRule>): Promise<ApiResponse<PaymentSplitRule>> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/payment-split-rules/`,
        { method: 'POST', headers: this.buildHeaders(), body: JSON.stringify(payload) },
      );
      const data = await this.parseResponse(response);
      if (!response.ok) {
        return { success: false, error: { message: this.getErrorMessage(data, 'Failed to create rule'), details: data } };
      }
      return { success: true, data };
    } catch {
      return { success: false, error: { message: 'Network error' } };
    }
  }

  async update(workspaceId: number, ruleId: number, payload: Partial<PaymentSplitRule>): Promise<ApiResponse<PaymentSplitRule>> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/payment-split-rules/${ruleId}/`,
        { method: 'PATCH', headers: this.buildHeaders(), body: JSON.stringify(payload) },
      );
      const data = await this.parseResponse(response);
      if (!response.ok) {
        return { success: false, error: { message: this.getErrorMessage(data, 'Failed to update rule'), details: data } };
      }
      return { success: true, data };
    } catch {
      return { success: false, error: { message: 'Network error' } };
    }
  }

  async delete(workspaceId: number, ruleId: number): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/payment-split-rules/${ruleId}/`,
        { method: 'DELETE', headers: this.buildHeaders() },
      );
      if (!response.ok) {
        const data = await this.parseResponse(response);
        return { success: false, error: { message: this.getErrorMessage(data, 'Failed to delete rule'), details: data } };
      }
      return { success: true };
    } catch {
      return { success: false, error: { message: 'Network error' } };
    }
  }

  async duplicate(workspaceId: number, ruleId: number): Promise<ApiResponse<PaymentSplitRule>> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/payment-split-rules/${ruleId}/duplicate/`,
        { method: 'POST', headers: this.buildHeaders() },
      );
      const data = await this.parseResponse(response);
      if (!response.ok) {
        return { success: false, error: { message: this.getErrorMessage(data, 'Failed to duplicate rule'), details: data } };
      }
      return { success: true, data };
    } catch {
      return { success: false, error: { message: 'Network error' } };
    }
  }
}

export const paymentSplitRulesService = new PaymentSplitRulesService();
