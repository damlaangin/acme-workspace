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

interface BotSetupRequest {
  name: string;
  temperature?: number;
  delay_before_responding?: number;
  config: BotConfig;
  template?: string;
}

export async function setupBot(workspaceId: number, data: BotSetupRequest) {
  const baseUrl = process.env.MOCK_API_BASE_URL || `http://localhost:${process.env.PORT ?? 3000}/api/proxy`;
  const token = proxyAuthService.getToken();

  if (!token || !workspaceId) {
    throw new Error('Missing API configuration. Please check environment variables.');
  }

  const url = `${baseUrl}/workspaces/${workspaceId}/bots/setup_bot/`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bot setup error:', errorText);
      throw new Error(`Bot setup failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Bot setup error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}
