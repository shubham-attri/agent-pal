import { ChatBar } from './components/ChatBar';
import { AudioRecorder } from './components/AudioRecorder';

/**
 * Initialize the UI when the DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the ChatBar component
  const chatBar = new ChatBar();
  
  // Initialize the AudioRecorder component
  const audioRecorder = new AudioRecorder();
  
  // Store in window for debugging purposes (can be removed in production)
  (window as any).__chatBar = chatBar;
  (window as any).__audioRecorder = audioRecorder;
}); 