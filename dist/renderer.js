"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// /Users/a3fckx/Desktop/Attri/Agent Pal/src/renderer.ts
const ChatBar_1 = require("./ui/components/ChatBar");
const MiniWindow_1 = require("./ui/components/MiniWindow");
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed. Initializing components...');
    try {
        // Instantiate components
        const miniWindow = new MiniWindow_1.MiniWindow();
        // Ensure miniWindow initialized correctly before proceeding
        // A simple check: does the main element exist? MiniWindow constructor logs errors if children are missing.
        const miniWindowElementCheck = document.getElementById('mini-window');
        if (miniWindowElementCheck) {
            const chatBar = new ChatBar_1.ChatBar(miniWindow); // Pass MiniWindow instance to ChatBar
            // --- Setup the action for MiniWindow expansion ---
            miniWindow.setupExpandAction((question, answer) => {
                console.log('Renderer: Received expand request.');
                // 1. Tell main process to show the full chat window
                window.api.toggleWindowSize(); // This triggers main.ts to resize/center/show
                // 2. Add the interaction to the main chat UI after a brief delay
                //    This allows the window resize animation to start smoothly.
                setTimeout(() => {
                    console.log('Renderer: Adding messages to ChatBar UI.');
                    // Check if chatBar and its necessary methods exist before calling
                    if (chatBar && typeof chatBar.addMessageToChat === 'function') {
                        chatBar.addMessageToChat('user', question);
                        chatBar.addMessageToChat('assistant', answer);
                        // Optional but recommended: scroll and focus
                        if (typeof chatBar.scrollChatToBottom === 'function') {
                            chatBar.scrollChatToBottom(); // Ensure new messages are visible
                        }
                        if (typeof chatBar.focusInput === 'function') {
                            chatBar.focusInput(); // Re-focus input in the now visible full view
                        }
                    }
                    else {
                        console.error('Renderer: Cannot add messages - chatBar instance or required methods (addMessageToChat, scrollChatToBottom, focusInput) missing or not public.');
                    }
                }, 150); // 150ms delay - adjust if needed
            });
            console.log('Renderer: ChatBar and MiniWindow initialized successfully.');
        }
        else {
            console.error('Renderer: MiniWindow main element (#mini-window) not found in DOM. Cannot initialize MiniWindow or ChatBar correctly.');
            // Display error to user in the main window area
            document.body.innerHTML = '<div style="padding: 20px; color: red; text-align: center;">Error: Application UI component (MiniWindow) could not be loaded. Check index.html.</div>';
        }
    }
    catch (error) {
        console.error('Renderer: Critical error during component initialization:', error);
        // Display a user-friendly fatal error message
        document.body.innerHTML = `<div style="padding: 20px; color: red; text-align: center;">Fatal Error: Application failed to initialize. ${error instanceof Error ? error.message : 'Unknown error'}. Check console.</div>`;
    }
    // --- All previous standalone functions (handleQuestion, clearChat, etc.) ---
    // --- and their associated event listeners are removed from here.      ---
    // --- Logic is now encapsulated within ChatBar and MiniWindow classes.  ---
});
// --- generateChatId function removed (Managed within ChatBar if needed) ---
