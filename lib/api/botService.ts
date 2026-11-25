// API utility for bot setup
import { Bot, BotSetupFormSubmissionCreate, PaginatedBotList } from "@/types/api";
export interface BotConfig {
  role: string;
  objective: string;
  context: string;
  sop: string;
  instructions: string;
  examples?: string;
  notes?: string;
}

export interface BotSetupRequest {
  name: string;
  temperature?: number;
  delay_before_responding?: number;
  config: BotConfig;
  template?: string;
}

export class BotAPIService {
  private baseUrl: string;
  private token: string;
  private workspaceId: number;

  constructor() {
    this.baseUrl = process.env.MOCK_API_BASE_URL || `http://localhost:${process.env.PORT ?? 3000}/api/proxy`;
    this.token = process.env.ACME_API_TOKEN || '';
    this.workspaceId = Number(process.env.ACME_WORKSPACE_ID || 0);
  }

  private getHeaders() {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Token ${this.token}`,
    };
  }

  async setupBot(data: BotSetupRequest): Promise<BotSetupFormSubmissionCreate> {
    const url = `${this.baseUrl}/workspaces/${this.workspaceId}/bots/setup_bot/`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Bot setup failed: ${response.status} ${response.statusText} - ${errorData}`);
    }

    return response.json();
  }

  async createBot(data: Omit<BotSetupRequest, 'config'> & { config?: BotConfig }): Promise<Bot> {
    const url = `${this.baseUrl}/workspaces/${this.workspaceId}/bots/`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Bot creation failed: ${response.status} ${response.statusText} - ${errorData}`);
    }

    return response.json();
  }

  async getBots(): Promise<PaginatedBotList> {
    const url = `${this.baseUrl}/workspaces/${this.workspaceId}/bots/?workspace_id=${this.workspaceId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bots: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
