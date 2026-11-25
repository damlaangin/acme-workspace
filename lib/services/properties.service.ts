import { 
  PropertyListResponse,
  ApiResponse,
  Property,
  PauseBotRequest
} from '@/types/api';
import { proxyAuthService } from './proxy-auth.service';

interface PropertyFilters {
  page?: number;
  page_size?: number;
  name?: string;
  is_active?: boolean;
  is_bot_stopped?: boolean;
  owner?: number;
  owner_id?: number;
  workspace?: number;
  bathroom_count_gte?: number;
  bathroom_count_lte?: number;
  bathroom_count?: number;
  bed_count_gte?: number;
  bed_count_lte?: number;
  bed_count?: number;
  guest_count_gte?: number;
  guest_count_lte?: number;
  guest_count?: number;
  room_count_gte?: number;
  room_count_lte?: number;
  room_count?: number;
  country?: number;
  state?: number;
  city?: number;
  listing_id?: string;
  ordering?: string;
  search?: string;
}

class PropertiesService {
  private baseURL = '/api/proxy';
  private getErrorMessage(data: any, fallback: string): string {
    if (!data) return fallback;
    if (typeof data === 'string') return data || fallback;
    if (typeof data === 'object') {
      const record = data as Record<string, any>;
      return (
        record.message ||
        record.error ||
        record.detail ||
        fallback
      );
    }
    return fallback;
  }
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

  private buildQueryParams(filters?: Record<string, any>) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    return params.toString();
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

  async getProperties(workspaceId: number, filters?: PropertyFilters): Promise<ApiResponse<PropertyListResponse>> {
    try {
      const headers = this.buildHeaders();
      const queryString = this.buildQueryParams(filters);
      const url = `${this.baseURL}/workspaces/${workspaceId}/properties/${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const data = await this.parseResponse(response);

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to fetch properties',
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

  async getAllProperties(workspaceId: number): Promise<ApiResponse<Property[]>> {
    const response = await this.getProperties(workspaceId, { page_size: 200 });
    if (!response.success) {
      return {
        success: false,
        error: response.error,
      };
    }
    return {
      success: true,
      data: response.data?.results ?? [],
    };
  }

  async getProperty(workspaceId: number, propertyId: number | string): Promise<ApiResponse<Property>> {
    try {
      const headers = this.buildHeaders();
      const response = await fetch(`${this.baseURL}/workspaces/${workspaceId}/properties/${propertyId}/`, {
        method: 'GET',
        headers,
      });

      const data = await this.parseResponse(response);

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to fetch property',
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

  async createProperty(workspaceId: number, propertyData: any): Promise<ApiResponse<Property>> {
    try {
      const headers = this.buildHeaders();
      const response = await fetch(`${this.baseURL}/workspaces/${workspaceId}/properties/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(propertyData),
      });

      const data = await this.parseResponse(response);

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: this.getErrorMessage(data, 'Failed to create property'),
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

  async replaceProperty(
    workspaceId: number,
    propertyId: number | string,
    propertyData: any
  ): Promise<ApiResponse<Property>> {
    try {
      const headers = this.buildHeaders();
      const response = await fetch(`${this.baseURL}/workspaces/${workspaceId}/properties/${propertyId}/`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(propertyData),
      });

      const data = await this.parseResponse(response);

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: this.getErrorMessage(data, 'Failed to update property'),
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

  async updateProperty(workspaceId: number, propertyId: number | string, propertyData: any): Promise<ApiResponse<Property>> {
    try {
      const headers = this.buildHeaders();
      const response = await fetch(`${this.baseURL}/workspaces/${workspaceId}/properties/${propertyId}/`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(propertyData),
      });

      const data = await this.parseResponse(response);

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to update property',
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

  async deleteProperty(workspaceId: number, propertyId: number | string): Promise<ApiResponse<null>> {
    try {
      const headers = this.buildHeaders();
      const response = await fetch(`${this.baseURL}/workspaces/${workspaceId}/properties/${propertyId}/`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const data = await this.parseResponse(response);
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to delete property',
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data: null };
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

  async addPropertyImage(
    workspaceId: number,
    propertyId: number | string,
    imageData: any
  ): Promise<ApiResponse<any>> {
    try {
      const headers = this.buildHeaders();
      const isFormData = imageData instanceof FormData;
      if (isFormData) {
        delete headers["Content-Type"];
      }
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/properties/${propertyId}/add_image/`,
        {
          method: 'POST',
          headers,
          body: isFormData ? imageData : JSON.stringify(imageData),
        }
      );

      const data = await this.parseResponse(response);

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to add property image',
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

  async deletePropertyImage(
    workspaceId: number,
    propertyId: number | string,
    imagePk: number
  ): Promise<ApiResponse<null>> {
    try {
      const headers = this.buildHeaders();
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/properties/${propertyId}/delete_image/${imagePk}/`,
        {
          method: 'DELETE',
          headers,
        }
      );

      if (!response.ok) {
        const data = await this.parseResponse(response);
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to delete property image',
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data: null };
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

  async getPropertyInstructions(
    workspaceId: number,
    propertyId: number,
    filters?: Record<string, any>
  ): Promise<ApiResponse<any>> {
    try {
      const headers = this.buildHeaders();
      const queryString = this.buildQueryParams(filters);
      const url = `${this.baseURL}/workspaces/${workspaceId}/properties/${propertyId}/property-instructions/${
        queryString ? `?${queryString}` : ''
      }`;

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const data = await this.parseResponse(response);

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to fetch property instructions',
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

  async createPropertyInstruction(
    workspaceId: number,
    propertyId: number,
    instructionData: any
  ): Promise<ApiResponse<any>> {
    try {
      const headers = this.buildHeaders();
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/properties/${propertyId}/property-instructions/`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(instructionData),
        }
      );

      const data = await this.parseResponse(response);

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to create property instruction',
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

  async getPropertyInstruction(
    workspaceId: number,
    propertyId: number,
    instructionId: string
  ): Promise<ApiResponse<any>> {
    try {
      const headers = this.buildHeaders();
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/properties/${propertyId}/property-instructions/${instructionId}/`,
        {
          method: 'GET',
          headers,
        }
      );

      const data = await this.parseResponse(response);

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to fetch property instruction',
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

  async updatePropertyInstruction(
    workspaceId: number,
    propertyId: number,
    instructionId: string,
    instructionData: any
  ): Promise<ApiResponse<any>> {
    try {
      const headers = this.buildHeaders();
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/properties/${propertyId}/property-instructions/${instructionId}/`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify(instructionData),
        }
      );

      const data = await this.parseResponse(response);

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to update property instruction',
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

  async partialUpdatePropertyInstruction(
    workspaceId: number,
    propertyId: number,
    instructionId: string,
    instructionData: any
  ): Promise<ApiResponse<any>> {
    try {
      const headers = this.buildHeaders();
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/properties/${propertyId}/property-instructions/${instructionId}/`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify(instructionData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to update property instruction',
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

  async deletePropertyInstruction(
    workspaceId: number,
    propertyId: number,
    instructionId: string
  ): Promise<ApiResponse<null>> {
    try {
      const headers = this.buildHeaders();
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/properties/${propertyId}/property-instructions/${instructionId}/`,
        {
          method: 'DELETE',
          headers,
        }
      );

      if (!response.ok) {
        const data = await this.parseResponse(response);
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to delete property instruction',
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data: null };
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

  // POST /workspaces/{workspace_id}/properties/{id}/pause-chat-bot/
  async pauseChatBot(
    workspaceId: number,
    propertyId: number | string,
    payload: PauseBotRequest
  ): Promise<ApiResponse<Property>> {
    try {
      const headers = this.buildHeaders();
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/properties/${propertyId}/pause-chat-bot/`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        }
      );

      const data = await this.parseResponse(response);

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to pause chat bot',
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

  // POST /workspaces/{workspace_id}/properties/{id}/resume-chat-bot/
  async resumeChatBot(
    workspaceId: number,
    propertyId: number | string
  ): Promise<ApiResponse<Property>> {
    try {
      const headers = this.buildHeaders();
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/properties/${propertyId}/resume-chat-bot/`,
        {
          method: 'POST',
          headers,
        }
      );

      const data = await this.parseResponse(response);

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to resume chat bot',
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
}

export const propertiesService = new PropertiesService();
export type { PropertyFilters };
