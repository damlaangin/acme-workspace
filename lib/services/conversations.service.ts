// services/conversations.service.ts
import { proxyAuthService } from './proxy-auth.service';
import {
  ApiResponse,
  Conversation,
  ConversationAnalytics,
  Message,
  PaginatedRequestPreferenceList,
  PatchedRequestPreference,
  PauseBotRequest,
  RequestPreference,
  RequestPreferenceCreate,
  RequestPreferenceSource,
} from '@/types/api';

interface ConversationFilters {
  airbnb_conversation_id?: number;
  created_at_gte?: string;
  created_at_lte?: string;
  is_bot_stopped?: boolean;
  name?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
  property_id?: number;
  reservation_id?: number;
  search?: string;
}

interface MessageFilters {
  ai_response_id?: number;
  cohost_profile_id?: number;
  conversation_id?: number;
  created_at_gte?: string;
  created_at_lte?: string;
  email_id?: number;
  is_bot?: boolean;
  is_staff?: boolean;
  manuel_action_required?: boolean;
  message?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
  reply_to?: number;
  search?: string;
  sender_name?: string;
}

interface ConversationRequestPreferenceFilters {
  created_at_gte?: string;
  created_at_lte?: string;
  is_resolved?: boolean;
  ordering?: string;
  page?: number;
  page_size?: number;
  search?: string;
  source?: RequestPreferenceSource;
}

interface PaginatedConversationList {
  count: number;
  next?: string;
  previous?: string;
  results: Conversation[];
}

interface PaginatedMessageList {
  count: number;
  next?: string;
  previous?: string;
  results: Message[];
}

class ConversationsService {
  private baseURL = '/api/proxy';

  private getAuthHeaders(): Record<string, string> {
    const token = proxyAuthService.getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Token ${token}`;
    return headers;
  }

  private buildQuery(filters?: Record<string, any>): string {
    if (!filters) return '';
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  // GET /workspaces/{workspace_id}/conversations/
  async getConversations(workspaceId: number, filters?: ConversationFilters): Promise<ApiResponse<PaginatedConversationList>> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/conversations/${this.buildQuery(filters)}`,
        { method: 'GET', headers: this.getAuthHeaders() }
      );
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to fetch conversations',
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

  // GET /workspaces/{workspace_id}/conversations/{id}/
  async getConversation(workspaceId: number, conversationId: number): Promise<ApiResponse<Conversation>> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/conversations/${conversationId}/`,
        { method: 'GET', headers: this.getAuthHeaders() }
      );
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to fetch conversation',
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

  // GET /workspaces/{workspace_id}/conversations/{id}/analytics/
  async getConversationAnalytics(
    workspaceId: number,
    conversationId: number
  ): Promise<ApiResponse<ConversationAnalytics>> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/conversations/${conversationId}/analytics/`,
        { method: 'GET', headers: this.getAuthHeaders() }
      );
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to fetch conversation analytics',
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

  // GET /workspaces/{workspace_id}/conversations/{conversation_id}/messages/
  async getMessages(workspaceId: number, conversationId: number, filters?: MessageFilters): Promise<ApiResponse<PaginatedMessageList>> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/conversations/${conversationId}/messages/${this.buildQuery(filters)}`,
        { method: 'GET', headers: this.getAuthHeaders() }
      );
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to fetch messages',
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

  // POST /workspaces/{workspace_id}/conversations/{conversation_id}/messages/
  async createMessage(workspaceId: number, conversationId: number, messageData: any): Promise<ApiResponse<Message>> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/conversations/${conversationId}/messages/`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(messageData),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to send message',
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

  // GET /workspaces/{workspace_id}/conversations/{conversation_id}/messages/{id}/
  async getMessage(workspaceId: number, conversationId: number, messageId: number): Promise<ApiResponse<Message>> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/conversations/${conversationId}/messages/${messageId}/`,
        { method: 'GET', headers: this.getAuthHeaders() }
      );
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to fetch message',
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

  // GET /workspaces/{workspace_id}/conversations/{conversation_id}/requests/
  async getConversationRequests(
    workspaceId: number,
    conversationId: number,
    filters?: ConversationRequestPreferenceFilters
  ): Promise<ApiResponse<PaginatedRequestPreferenceList>> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/conversations/${conversationId}/requests/${this.buildQuery(filters)}`,
        { method: 'GET', headers: this.getAuthHeaders() }
      );
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to fetch conversation requests',
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

  // POST /workspaces/{workspace_id}/conversations/{conversation_id}/requests/
  async createConversationRequest(
    workspaceId: number,
    conversationId: number,
    requestData: RequestPreferenceCreate
  ): Promise<ApiResponse<RequestPreference>> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/conversations/${conversationId}/requests/`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(requestData),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to create conversation request',
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

  // GET /workspaces/{workspace_id}/conversations/{conversation_id}/requests/{id}/
  async getConversationRequest(
    workspaceId: number,
    conversationId: number,
    requestId: number | string
  ): Promise<ApiResponse<RequestPreference>> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/conversations/${conversationId}/requests/${requestId}/`,
        { method: 'GET', headers: this.getAuthHeaders() }
      );
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to fetch conversation request',
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

  // PUT /workspaces/{workspace_id}/conversations/{conversation_id}/requests/{id}/
  async updateConversationRequest(
    workspaceId: number,
    conversationId: number,
    requestId: number | string,
    requestData: RequestPreferenceCreate
  ): Promise<ApiResponse<RequestPreference>> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/conversations/${conversationId}/requests/${requestId}/`,
        {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(requestData),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to update conversation request',
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

  // PATCH /workspaces/{workspace_id}/conversations/{conversation_id}/requests/{id}/
  async partialUpdateConversationRequest(
    workspaceId: number,
    conversationId: number,
    requestId: number | string,
    requestData: PatchedRequestPreference
  ): Promise<ApiResponse<RequestPreference>> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/conversations/${conversationId}/requests/${requestId}/`,
        {
          method: 'PATCH',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(requestData),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to update conversation request',
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

  // DELETE /workspaces/{workspace_id}/conversations/{conversation_id}/requests/{id}/
  async deleteConversationRequest(
    workspaceId: number,
    conversationId: number,
    requestId: number | string
  ): Promise<ApiResponse<null>> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/conversations/${conversationId}/requests/${requestId}/`,
        { method: 'DELETE', headers: this.getAuthHeaders() }
      );

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to delete conversation request',
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

  // POST /workspaces/{workspace_id}/conversations/{id}/pause-bot/
  async pauseBot(
    workspaceId: number,
    conversationId: number,
    payload: PauseBotRequest
  ): Promise<ApiResponse<Conversation>> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/conversations/${conversationId}/pause-bot/`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to pause bot',
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

  // POST /workspaces/{workspace_id}/conversations/{id}/resume-bot/
  async resumeBot(workspaceId: number, conversationId: number): Promise<ApiResponse<Conversation>> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/conversations/${conversationId}/resume-bot/`,
        { method: 'POST', headers: this.getAuthHeaders() }
      );
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || 'Failed to resume bot',
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

export const conversationsService = new ConversationsService();
export type {
  ConversationFilters,
  ConversationRequestPreferenceFilters,
  MessageFilters,
};
