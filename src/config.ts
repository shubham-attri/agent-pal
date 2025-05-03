/**
 * Application Configuration
 * 
 * Central configuration settings for the application.
 * Edit this file to change AI endpoint, model, and other settings.
 */

export const config = {
  // AI Service Configuration
  ai: {
    // API endpoint for LM Studio
    apiUrl: 'http://127.0.0.1:1234',
    
    // Model to use (Qwen 3 4B in this case)
    model: 'qwen3-4b',
    
    // System prompt for the AI
    systemPrompt: 'You are a helpful AI assistant called Agent Pal. You are concise, friendly, and knowledgeable.'
  },
  
  // Application UI Configuration
  ui: {
    // Welcome message shown when starting new chat
    welcomeMessage: 'Agent Pal is ready. How can I help you today?',
    
    // Error message for AI service connection issues
    connectionErrorMessage: 'Failed to communicate with AI backend. Please check that LM Studio is running at the configured endpoint.'
  }
}; 