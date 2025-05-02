// /Users/a3fckx/Desktop/Attri/Agent Pal/src/renderer.ts
import { ChatBar } from './ui/components/ChatBar';
import { MiniWindow } from './ui/components/MiniWindow';
import './ui/styles/main.css';

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed. Initializing components...');

  try {
    const chatBarElement = document.querySelector('#chat-container') as HTMLElement;
    const questionInputElement = document.querySelector('#question-input') as HTMLInputElement;
    const miniWindowContainer = document.querySelector('#mini-window') as HTMLElement; // Check if still needed?

    // Ensure essential elements used *by the constructor* exist, even if constructor re-selects them.
    if (document.getElementById('question-input') && 
        document.getElementById('messages-container') &&
        document.getElementById('chat-container') &&
        document.getElementById('new-chat-button') /* Add other critical elements ChatBar constructor needs */) {
      
      const miniWindow = new MiniWindow(); // Instantiate MiniWindow first
      const chatBar = new ChatBar(miniWindow); // *** Pass MiniWindow instance ***

      // --- Handle 'New Chat' request (from Tray or ChatBar button) ---
      // *** Use 'on' instead of 'receive' ***
      window.api.on('new-chat', () => {
        console.log('Renderer: Received new-chat event');
        // *** Use clearChat() to reset the UI ***
        chatBar.clearChat(); 
        // Ensure full window is shown if 'New Chat' is clicked when hidden/mini
        // Note: The main process 'New Chat' tray action already calls showFullChatWindow
      });

      // --- Setup MiniWindow Expand Action ---
      miniWindow.setupExpandAction((question: string, answer: string) => {
        console.log('Renderer: Received expand request from MiniWindow.');

        // 1. Hide the MiniWindow
        miniWindow.hide(); // *** ADD THIS ***

        // 2. Tell main process to show the full chat window
        window.api.toggleWindowSize(); // This triggers main.ts to resize/center/show

        // 3. Add the interaction to the main chat UI after a brief delay
        //    (Allows window resize animation to start smoothly)
        setTimeout(() => {
          console.log('Renderer: Adding messages to ChatBar UI after expand.');
          if (chatBar && typeof chatBar.addMessageToChat === 'function') {
            // Clear existing messages first if needed (optional, depends on desired UX)
            // chatBar.clearMessages();
            chatBar.addMessageToChat('user', question);
            chatBar.addMessageToChat('assistant', answer);

            if (typeof chatBar.scrollChatToBottom === 'function') {
              chatBar.scrollChatToBottom();
            }
            if (typeof chatBar.focusInput === 'function') {
              chatBar.focusInput();
            }
          } else {
            console.error('Renderer: Cannot add messages - chatBar instance or methods missing.');
          }
        }, 150); // Adjust delay if needed
      });

      console.log('Renderer: ChatBar and MiniWindow initialized successfully.');

    } else {
      console.error('Renderer: Essential elements for ChatBar/MiniWindow components not found in DOM.');
    }

  } catch (error) {
      console.error('Renderer: Critical error during component initialization:', error);
      // Display a user-friendly fatal error message
      document.body.innerHTML = `<div style="padding: 20px; color: red; text-align: center;">Fatal Error: Application failed to initialize. ${error instanceof Error ? error.message : 'Unknown error'}. Check console.</div>`;
  }

  // --- All previous standalone functions (handleQuestion, clearChat, etc.) ---
  // --- and their associated event listeners are removed from here.      ---
  // --- Logic is now encapsulated within ChatBar and MiniWindow classes.  ---

});

// --- generateChatId function removed (Managed within ChatBar if needed) ---