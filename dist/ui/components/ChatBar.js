"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatBar = void 0;
/**
 * ChatBar component - handles the main searchbar/chatbar UI and interactions
 */
class ChatBar {
    constructor() {
        this.isExpanded = false;
        // Initialize DOM elements
        this.questionInput = document.getElementById('question-input');
        this.searchLabel = document.querySelector('.search-label');
        this.messagesContainer = document.getElementById('messages-container');
        this.chatContainer = document.getElementById('chat-container');
        this.chatTitle = document.querySelector('.chat-title');
        this.searchBar = document.querySelector('.search-bar');
        // Action buttons
        this.newChatButton = document.getElementById('new-chat-button');
        this.clearChatButton = document.getElementById('clear-chat-button');
        this.closeChatButton = document.getElementById('close-chat-button');
        // Generate initial chat ID
        this.currentChatId = this.generateChatId();
        // Set up event listeners
        this.setupEventListeners();
    }
    /**
     * Set up all event listeners for the ChatBar
     */
    setupEventListeners() {
        // Add click events to the search bar
        this.searchBar.addEventListener('click', () => {
            this.questionInput.focus();
        });
        // Make the PAL logo act as an Enter button
        const appIcon = document.querySelector('.app-icon');
        if (appIcon) {
            appIcon.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent search bar click
                this.handleQuestion();
            });
            appIcon.style.cursor = 'pointer'; // Show pointer cursor on hover
        }
        // When input value changes, toggle placeholder visibility
        this.questionInput.addEventListener('input', () => {
            // Hide label as soon as typing begins
            this.searchLabel.style.opacity = '0';
        });
        // When input is focused but empty, keep label visible
        this.questionInput.addEventListener('focus', () => {
            if (this.questionInput.value.trim() !== '') {
                this.searchLabel.style.opacity = '0';
            }
        });
        // When input loses focus and is empty, show label again
        this.questionInput.addEventListener('blur', () => {
            if (this.questionInput.value.trim() === '') {
                this.searchLabel.style.opacity = '1';
            }
        });
        // Set up action buttons
        this.newChatButton.addEventListener('click', () => {
            this.createNewChat();
        });
        this.clearChatButton.addEventListener('click', () => {
            this.clearChat();
        });
        this.closeChatButton.addEventListener('click', () => {
            this.closeChat();
        });
        // Trigger on Enter key
        this.questionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleQuestion();
            }
        });
        // Listen for new chat events from main process
        window.api.on('new-chat', () => {
            this.createNewChat();
        });
        // Re-focus input when clicking anywhere in the app
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (target.id !== 'question-input' &&
                !target.closest('button') &&
                !target.closest('.message') &&
                !target.closest('.app-icon')) {
                this.questionInput.focus();
            }
        });
        // Focus the input automatically on load
        this.questionInput.focus();
    }
    /**
     * Toggle between expanded and collapsed states
     */
    toggleExpandedState() {
        this.isExpanded = !this.isExpanded;
        if (this.isExpanded) {
            document.body.classList.add('expanded');
            window.api.toggleWindowSize(); // Make window larger
            // Scroll to bottom of chat
            setTimeout(() => {
                this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            }, 100);
        }
        else {
            document.body.classList.remove('expanded');
            window.api.toggleWindowSize(); // Make window smaller
        }
    }
    /**
     * Clear the current chat and reset UI
     */
    clearChat() {
        // Clear all messages except the welcome message
        const welcomeMessage = document.getElementById('welcome-message');
        const capabilities = document.querySelector('.capabilities');
        // Remove all child nodes
        while (this.messagesContainer.firstChild) {
            this.messagesContainer.removeChild(this.messagesContainer.firstChild);
        }
        // Add back welcome message and capabilities
        this.messagesContainer.appendChild(welcomeMessage);
        this.messagesContainer.appendChild(capabilities);
        // Reset welcome message visibility
        welcomeMessage.style.display = 'block';
        capabilities.style.display = 'block';
        // Generate new chat ID
        this.currentChatId = this.generateChatId();
        this.chatTitle.textContent = 'New conversation';
        // Reset input and label
        this.questionInput.value = '';
        this.searchLabel.style.opacity = '1';
    }
    /**
     * Close the chat and collapse the window
     */
    closeChat() {
        // Hide chat and collapse window
        if (this.isExpanded) {
            this.toggleExpandedState();
        }
    }
    /**
     * Create a new chat session
     */
    createNewChat() {
        // Clear chat content
        this.clearChat();
        // Expand if not already expanded
        if (!this.isExpanded) {
            this.toggleExpandedState();
        }
        // Focus input
        this.questionInput.focus();
        // Notify backend (for future implementation)
        window.api.createNewChat();
    }
    /**
     * Handle user question submission
     */
    async handleQuestion() {
        const question = this.questionInput.value.trim();
        if (!question)
            return;
        // Expand UI if not already expanded
        if (!this.isExpanded) {
            this.toggleExpandedState();
        }
        // Update chat title with first few words of first question
        if (this.chatTitle.textContent === 'New conversation') {
            const titleText = question.length > 30
                ? question.substring(0, 30) + '...'
                : question;
            this.chatTitle.textContent = titleText;
        }
        // Add user question to chat with animated entry
        this.addMessageToChat('user', question);
        // Clear input
        this.questionInput.value = '';
        // Show typing indicator
        const typingIndicator = this.addTypingIndicator();
        try {
            // Simulate a small delay for realistic typing
            await new Promise(resolve => setTimeout(resolve, 800));
            // Get answer from main process
            const answer = await window.api.askQuestion(question);
            // Remove typing indicator
            typingIndicator.remove();
            // Add response
            this.addMessageToChat('assistant', answer);
        }
        catch (error) {
            // Remove typing indicator
            typingIndicator.remove();
            if (error instanceof Error) {
                this.addMessageToChat('system', 'Error: ' + error.message);
            }
            else {
                this.addMessageToChat('system', 'An unknown error occurred');
            }
        }
    }
    /**
     * Add a typing indicator to show the assistant is responding
     */
    addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'assistant', 'typing');
        typingDiv.innerHTML = '<span class="dot-flashing"></span>';
        // Style the typing indicator
        const style = document.createElement('style');
        style.textContent = `
      .typing {
        padding: 8px 14px;
        font-family: "Jersey 20", sans-serif;
      }
      .dot-flashing {
        display: inline-block;
        position: relative;
        width: 10px;
        height: 10px;
        border-radius: 5px;
        background-color: var(--secondary-foreground);
        color: var(--secondary-foreground);
        animation: dotFlashing 1s infinite linear alternate;
        animation-delay: .5s;
      }
      .dot-flashing::before, .dot-flashing::after {
        content: '';
        display: inline-block;
        position: absolute;
        top: 0;
        width: 10px;
        height: 10px;
        border-radius: 5px;
        background-color: var(--secondary-foreground);
        color: var(--secondary-foreground);
        animation: dotFlashing 1s infinite alternate;
      }
      .dot-flashing::before {
        left: -15px;
        animation-delay: 0s;
      }
      .dot-flashing::after {
        left: 15px;
        animation-delay: 1s;
      }
      @keyframes dotFlashing {
        0% { background-color: var(--secondary-foreground); }
        50%, 100% { background-color: var(--muted); }
      }
    `;
        document.head.appendChild(style);
        this.messagesContainer.appendChild(typingDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        return typingDiv;
    }
    /**
     * Add a message to the chat container
     */
    addMessageToChat(role, content) {
        // Remove welcome and capabilities if this is the first actual exchange
        if (role === 'user' && this.messagesContainer.querySelector('#welcome-message')) {
            const welcomeMessage = document.getElementById('welcome-message');
            const capabilities = document.querySelector('.capabilities');
            if (welcomeMessage)
                welcomeMessage.style.display = 'none';
            if (capabilities)
                capabilities.style.display = 'none';
        }
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', role);
        if (role === 'assistant') {
            const contentDiv = document.createElement('div');
            contentDiv.classList.add('assistant-content');
            contentDiv.textContent = content;
            messageDiv.appendChild(contentDiv);
        }
        else {
            messageDiv.textContent = content;
        }
        this.messagesContainer.appendChild(messageDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    /**
     * Generate a random ID for each chat
     */
    generateChatId() {
        return 'chat_' + Math.random().toString(36).substring(2, 12);
    }
}
exports.ChatBar = ChatBar;
