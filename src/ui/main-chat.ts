/**
 * Main Chat Window Entry Point
 * This initializes the full screen ChatGPT-like interface
 */
import { MainChatWindow } from './components/MainChatWindow';
import { IpcApi } from '../types';
import { config } from '../config';
import './styles/main-chat.css';

// Expose MainChatWindow to the global scope
(window as any).MainChatWindow = MainChatWindow;

// Log Electron API availability at startup
console.log('Script loaded, window.api available:', !!window.api);
if (!window.api) {
  console.error('window.api is missing - preload script may not be working correctly');
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded - starting main chat initialization');
  
  // Check if the container exists
  const container = document.getElementById('main-chat-container');
  console.log('Main chat container found:', !!container);
  
  try {
    console.log('Initializing main chat window...');
    
    // Initialize the main chat window component
    const mainChatWindow = new MainChatWindow('main-chat-container', (message: string) => {
      // Handle sending messages to the backend
      handleMessageSend(message, mainChatWindow);
    });
    
    // Set up IPC communication for receiving responses
    console.log('Setting up IPC handlers...');
    setupIpcHandlers(mainChatWindow);
    
    console.log('Main chat window initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize main chat window:', error);
    document.body.innerHTML = `
      <div style="padding: 20px; color: #ff5555; text-align: center;">
        <h3>Error Loading Chat Interface</h3>
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        <pre style="text-align: left; background: #333; color: #eee; padding: 10px; border-radius: 4px; overflow: auto;">${error instanceof Error ? error.stack : ''}</pre>
        <button onclick="location.reload()" style="margin-top: 20px; padding: 8px 16px; background: #333; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
          Try Again
        </button>
      </div>
    `;
  }
});

/**
 * Set up IPC communication with the main process
 */
function setupIpcHandlers(chatWindow: MainChatWindow): void {
  // Check if API is available
  if (!window.api) {
    console.error('Cannot set up IPC handlers: window.api is not available');
    
    // Show error message in the UI
    chatWindow.addMessage('system', 'Error: Cannot communicate with the main process. The application may not function correctly.');
    return;
  }
  
  // Print debug info to confirm API availability
  console.log('Setting up IPC handlers. API available:', !!window.api);
  
  // Listen for incoming messages from the backend
  window.api.on('chat-response', (data: { content: string }) => {
    console.log('Received chat response:', data);
    
    // Remove typing indicator if any
    chatWindow.removeTypingIndicator();
    
    // Process and clean the response content
    const cleanedContent = processResponseContent(data.content);
    
    // Add the assistant's response to chat
    chatWindow.addMessage('assistant', cleanedContent);
  });

  // Listen for new chat events
  window.api.on('new-chat', () => {
    console.log('New chat event received');
    chatWindow.clearChat();
  });
}

/**
 * Process response content to remove thinking sections
 */
function processResponseContent(content: string): string {
  // Remove <think>...</think> sections
  let cleanedContent = content.replace(/<think>[\s\S]*?<\/think>/g, '');
  
  // Trim extra whitespace that might be left after removing sections
  cleanedContent = cleanedContent.trim();
  
  return cleanedContent;
}

/**
 * Handle sending a message to the backend
 */
async function handleMessageSend(message: string, chatWindow: MainChatWindow): Promise<void> {
  try {
    // Check if API is available
    if (!window.api) {
      console.error('Cannot send message: window.api is not available');
      chatWindow.addMessage('system', 'Error: Cannot communicate with the AI backend. The application may not function correctly.');
      return;
    }
    
    // Add user message to the chat UI
    chatWindow.addMessage('user', message);
    
    // Show typing indicator
    chatWindow.showTypingIndicator();
    
    try {
      console.log('Sending message to backend:', message);
      
      // Send message to the backend using IPC
      const response = await window.api.sendChatMessage(message);
      
      console.log('Received response from backend:', response);
      
      // Remove typing indicator
      chatWindow.removeTypingIndicator();
      
      // Process and clean the response content
      const cleanedContent = processResponseContent(response.content);
      
      // Add the response to the chat
      chatWindow.addMessage('assistant', cleanedContent);
    } catch (error) {
      console.error('Error sending message to backend:', error);
      chatWindow.removeTypingIndicator();
      chatWindow.addMessage('system', config.ui.connectionErrorMessage);
    }
  } catch (error) {
    console.error('Error in message handling:', error);
    chatWindow.addMessage('system', 'An unexpected error occurred. Please try again.');
  }
} 