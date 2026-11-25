'use server';

import { proxyAuthService } from "../services/proxy-auth.service";

interface BotConfig {
  role: string;
  objective: string;
  context: string;
  sop: string;
  instructions: string;
  examples?: string;
  notes?: string;
}

interface BotSetupFormSubmission {
  id: string;
  config: BotConfig;
  template?: string;
}

interface Bot {
  id: number;
  name: string;
  workspace: number;
  instruction?: string | null;
  llm_model: number;
  temperature: number;
  delay_before_responding: number;
  setup_completed: boolean;
  form_submission: BotSetupFormSubmission;
  created_at: string;
  updated_at: string;
}

interface PaginatedBotList {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: Bot[];
}

export async function fetchBots(workspaceId: number, page = 1, pageSize = 10) {
  const baseUrl = process.env.MOCK_API_BASE_URL || `http://localhost:${process.env.PORT ?? 3000}/api/proxy`;
  const token = proxyAuthService.getToken();

  if (!token || !workspaceId) {
    throw new Error('Missing API configuration. Please check environment variables.');
  }

  const url = `${baseUrl}/workspaces/${workspaceId}/bots/?page=${page}&page_size=${pageSize}&workspace_id=${workspaceId}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Token ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bot fetch error:', errorText);
      throw new Error(`Bot fetch failed: ${response.status} ${response.statusText}`);
    }

    const result: PaginatedBotList = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Bot fetch error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

export async function fetchBot(workspaceId: number, botId: number) {
  const baseUrl = process.env.MOCK_API_BASE_URL || `http://localhost:${process.env.PORT ?? 3000}/api/proxy`;
  const token = proxyAuthService.getToken();

  if (!token || !workspaceId) {
    throw new Error('Missing API configuration. Please check environment variables.');
  }

  const url = `${baseUrl}/workspaces/${workspaceId}/bots/${botId}/`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Token ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bot fetch error:', errorText);
      throw new Error(`Bot fetch failed: ${response.status} ${response.statusText}`);
    }

    const result: Bot = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Bot fetch error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

export async function deleteBot(workspaceId: number, botId: number) {
  const baseUrl = process.env.MOCK_API_BASE_URL || `http://localhost:${process.env.PORT ?? 3000}/api/proxy`;
  const token = proxyAuthService.getToken();

  if (!token || !workspaceId) {
    throw new Error('Missing API configuration. Please check environment variables.');
  }

  const url = `${baseUrl}/workspaces/${workspaceId}/bots/${botId}/`;
  
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Token ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bot delete error:', errorText);
      throw new Error(`Bot delete failed: ${response.status} ${response.statusText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Bot delete error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

export async function updateBot(workspaceId: number, botId: number, updates: Partial<Bot>) {
  const baseUrl = process.env.MOCK_API_BASE_URL || `http://localhost:${process.env.PORT ?? 3000}/api/proxy`;
  const token = proxyAuthService.getToken();

  if (!token || !workspaceId) {
    throw new Error('Missing API configuration. Please check environment variables.');
  }

  const url = `${baseUrl}/workspaces/${workspaceId}/bots/${botId}/`;
  
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bot update error:', errorText);
      throw new Error(`Bot update failed: ${response.status} ${response.statusText}`);
    }

    const result: Bot = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Bot update error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}
