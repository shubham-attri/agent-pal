import { ChatBar } from './components/ChatBar';

/**
 * Initialize the UI when the DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the ChatBar component
  const chatBar = new ChatBar();
  
  // Store in window for debugging purposes (can be removed in production)
  (window as any).__chatBar = chatBar;
}); 