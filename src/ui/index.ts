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
  
  // Set up keyboard shortcut for BlackHole setup (Command+Shift+B)
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // Command+Shift+B on Mac
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'b') {
      audioRecorder.setupBlackhole();
      e.preventDefault();
    }
  });
  
  // Store in window for debugging purposes (can be removed in production)
  (window as any).__chatBar = chatBar;
  (window as any).__audioRecorder = audioRecorder;
}); 