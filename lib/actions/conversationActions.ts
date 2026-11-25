"use server";

interface PropertyAddress {
  address_line_1: string;
  address_line_2?: string;
  postal_code: string;
  city: string;
  state: string;
  country: string;
}

interface Property {
  id: number;
  name: string;
  address: PropertyAddress;
}

interface Conversation {
  id: number;
  name: string;
  airbnb_conversation_id: number;
  property: Property;
  reservation?: number;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: number;
  sender_name: string;
  message: string;
  is_staff: boolean;
  is_bot: boolean;
  reply_to: number;
  manuel_action_required: boolean;
  conversation: number;
  created_at: string;
  updated_at: string;
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

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const API_BASE_URL =
  process.env.MOCK_API_BASE_URL || `http://localhost:${process.env.PORT ?? 3000}/api/proxy`;
const WORKSPACE_ID = Number(process.env.ACME_WORKSPACE_ID || 0);

async function getAuthHeaders(): Promise<HeadersInit> {
  // This should be replaced with actual authentication logic
  const token = process.env.ACME_API_TOKEN || "";
  return {
    "Authorization": `Token ${token}`,
    "Content-Type": "application/json",
  };
}

export async function fetchConversations(
  page?: number,
  search?: string,
  propertyId?: number,
  reservationId?: number
): Promise<ApiResponse<PaginatedConversationList>> {
  try {
    const params = new URLSearchParams();
    if (page) params.append("page", page.toString());
    if (search) params.append("search", search);
    if (propertyId) params.append("property_id", propertyId.toString());
    if (reservationId) params.append("reservation_id", reservationId.toString());

    const url = `${API_BASE_URL}/workspaces/${WORKSPACE_ID}/conversations/?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: await getAuthHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to fetch conversations:", response.status, errorText);
      return {
        success: false,
        error: `Failed to fetch conversations: ${response.status}`,
      };
    }

    const data: PaginatedConversationList = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return {
      success: false,
      error: "Failed to fetch conversations",
    };
  }
}

export async function fetchConversation(
  conversationId: number
): Promise<ApiResponse<Conversation>> {
  try {
    const url = `${API_BASE_URL}/workspaces/${WORKSPACE_ID}/conversations/${conversationId}/`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: await getAuthHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to fetch conversation:", response.status, errorText);
      return {
        success: false,
        error: `Failed to fetch conversation: ${response.status}`,
      };
    }

    const data: Conversation = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return {
      success: false,
      error: "Failed to fetch conversation",
    };
  }
}

export async function fetchMessages(
  conversationId: number,
  page?: number,
  isBot?: boolean,
  isStaff?: boolean
): Promise<ApiResponse<PaginatedMessageList>> {
  try {
    const params = new URLSearchParams();
    if (page) params.append("page", page.toString());
    if (isBot !== undefined) params.append("is_bot", isBot.toString());
    if (isStaff !== undefined) params.append("is_staff", isStaff.toString());

    const url = `${API_BASE_URL}/workspaces/${WORKSPACE_ID}/conversations/${conversationId}/messages/?${params.toString()}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: await getAuthHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to fetch messages:", response.status, errorText);
      return {
        success: false,
        error: `Failed to fetch messages: ${response.status}`,
      };
    }

    const data: PaginatedMessageList = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error fetching messages:", error);
    return {
      success: false,
      error: "Failed to fetch messages",
    };
  }
}

export async function sendMessage(
  conversationId: number,
  message: string
): Promise<ApiResponse<Message>> {
  try {
    const url = `${API_BASE_URL}/workspaces/${WORKSPACE_ID}/conversations/${conversationId}/messages/`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        message,
        conversation: conversationId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to send message:", response.status, errorText);
      return {
        success: false,
        error: `Failed to send message: ${response.status}`,
      };
    }

    const data: Message = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error sending message:", error);
    return {
      success: false,
      error: "Failed to send message",
    };
  }
}

export async function fetchMessage(
  conversationId: number,
  messageId: number
): Promise<ApiResponse<Message>> {
  try {
    const url = `${API_BASE_URL}/workspaces/${WORKSPACE_ID}/conversations/${conversationId}/messages/${messageId}/`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: await getAuthHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to fetch message:", response.status, errorText);
      return {
        success: false,
        error: `Failed to fetch message: ${response.status}`,
      };
    }

    const data: Message = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error fetching message:", error);
    return {
      success: false,
      error: "Failed to fetch message",
    };
  }
}
