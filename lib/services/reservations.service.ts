// Reservations service using Next.js API proxy
import { 
  ApiResponse,
  Reservation,
  ReservationListResponse
} from '@/types/api';
import { proxyAuthService } from './proxy-auth.service';

export interface ReservationFilters {
  page?: number;
  page_size?: number;
  checkin_date?: string; // YYYY-MM-DD
  checkin_date_gte?: string;
  checkin_date_lte?: string;
  checkout_date?: string;
  checkout_date_gte?: string;
  checkout_date_lte?: string;
  payment_created_at_gte?: string; // YYYY-MM-DD
  payment_created_at_lte?: string; // YYYY-MM-DD
  country_name?: string;
  guest_name?: string;
  owner_id?: number; // integer
  property_id?: number; // integer
  reservation_code?: string;
  reservation_status?: string;
  ordering?: string;
}

export interface ReservationCreateUpdatePayload {
  reservation_code?: string | null;
  guest_name: string;
  country?: number | null;
  property: number;
  checkin_date: string;
  checkout_date: string;
  night_count: number;
  adult_guest_count?: number;
  child_guest_count?: number;
  baby_guest_count?: number;
  pet_count?: number;
  special_requests?: string[];
}

export type ReservationPartialUpdatePayload = Partial<ReservationCreateUpdatePayload>;

class ReservationsService {
  private baseURL = '/api/proxy';

  async getReservations(workspaceId: number, filters?: ReservationFilters): Promise<ApiResponse<ReservationListResponse>> {
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

      const queryString = queryParams.toString();
      const url = `${this.baseURL}/workspaces/${workspaceId}/reservations${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to fetch reservations',
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

  async getReservation(workspaceId: number, reservationId: number): Promise<ApiResponse<Reservation>> {
    try {
      const token = proxyAuthService.getToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const url = `${this.baseURL}/workspaces/${workspaceId}/reservations/${reservationId}/`;

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to fetch reservation',
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

  async createReservation(
    workspaceId: number,
    reservationData: ReservationCreateUpdatePayload
  ): Promise<ApiResponse<Reservation>> {
    try {
      const token = proxyAuthService.getToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const url = `${this.baseURL}/workspaces/${workspaceId}/reservations/`;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(reservationData),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to create reservation',
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

  async updateReservationFull(
    workspaceId: number,
    reservationId: number,
    reservationData: ReservationCreateUpdatePayload
  ): Promise<ApiResponse<Reservation>> {
    try {
      const token = proxyAuthService.getToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const url = `${this.baseURL}/workspaces/${workspaceId}/reservations/${reservationId}/`;

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(reservationData),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to update reservation',
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

  async updateReservation(
    workspaceId: number,
    reservationId: number,
    reservationData: ReservationPartialUpdatePayload
  ): Promise<ApiResponse<Reservation>> {
    try {
      const token = proxyAuthService.getToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const url = `${this.baseURL}/workspaces/${workspaceId}/reservations/${reservationId}/`;

      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(reservationData),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to update reservation',
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

export const reservationsService = new ReservationsService();
