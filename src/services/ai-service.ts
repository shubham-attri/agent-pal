/**
 * AI Service
 * Handles communication with the LM Studio API endpoint
 */

import { ToolCall } from '../types';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: any[];
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
}

export class AIService {
  private apiUrl: string;
  private model: string;
  private systemPrompt: string;

  constructor(
    apiUrl: string = 'http://127.0.0.1:1234',
    model: string = 'qwen3-4b',
    systemPrompt: string = 'You are a helpful assistant.'
  ) {
    this.apiUrl = apiUrl;
    this.model = model;
    this.systemPrompt = systemPrompt;
  }

  /**
   * Send a message to the AI service
   */
  async sendMessage(userMessage: string, conversationHistory: ChatMessage[] = []): Promise<{ content: string, toolCalls?: ToolCall[] }> {
    try {
      // Prepare the messages array including system prompt and history
      const messages: ChatMessage[] = [
        { role: 'system', content: this.systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      // Build request payload
      const requestPayload: ChatCompletionRequest = {
        model: this.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      };

      // Make the API request
      const response = await fetch(`${this.apiUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const data: ChatCompletionResponse = await response.json();
      
      // Extract the response content
      const content = data.choices[0]?.message?.content || 'No response received';
      
      // We're not implementing tool calls yet, so return empty array
      return { content, toolCalls: [] };
    } catch (error) {
      console.error('Error in AI service:', error);
      throw error;
    }
  }

  /**
   * Set a new system prompt
   */
  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  /**
   * Change the API endpoint
   */
  setApiUrl(url: string): void {
    this.apiUrl = url;
  }

  /**
   * Change the model
   */
  setModel(model: string): void {
    this.model = model;
  }
} 