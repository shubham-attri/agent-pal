/**
 * ChatBar component - handles the main searchbar/chatbar UI and interactions
 */
export class ChatBar {
  private questionInput: HTMLInputElement;
  private searchLabel: HTMLDivElement;
  private messagesContainer: HTMLDivElement;
  private chatContainer: HTMLDivElement;
  private chatTitle: HTMLDivElement;
  private searchBar: HTMLDivElement;
  private currentChatId: string;
  public isExpanded: boolean = false;

  // Action buttons
  private newChatButton: HTMLButtonElement;
  private clearChatButton: HTMLButtonElement;
  private closeChatButton: HTMLButtonElement;

  // Reference to the question processor (placeholder for MiniWindow interaction later)
  // private questionProcessor: any; // Keep commented out for now
  private miniWindow: any; // Placeholder for MiniWindow instance

  constructor(miniWindowInstance: any) { // Accept MiniWindow instance
    // Initialize DOM elements
    this.questionInput = document.getElementById('question-input') as HTMLInputElement;
    this.searchLabel = document.querySelector('.search-label') as HTMLDivElement;
    this.messagesContainer = document.getElementById('messages-container') as HTMLDivElement;
    this.chatContainer = document.getElementById('chat-container') as HTMLDivElement;
    this.chatTitle = document.querySelector('.chat-title') as HTMLDivElement;
    this.searchBar = document.querySelector('.search-bar') as HTMLDivElement;

    // Action buttons
    this.newChatButton = document.getElementById('new-chat-button') as HTMLButtonElement;
    this.clearChatButton = document.getElementById('clear-chat-button') as HTMLButtonElement;
    this.closeChatButton = document.getElementById('close-chat-button') as HTMLButtonElement;

    // Assign MiniWindow instance
    this.miniWindow = miniWindowInstance;

    // Generate initial chat ID
    this.currentChatId = this.generateChatId();

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Generate a unique chat ID (simple timestamp for now)
   */
  private generateChatId(): string {
    return `chat-${Date.now()}`;
  }

  // Removed setQuestionProcessor as we'll interact with MiniWindow directly
  // public setQuestionProcessor(processor: any): void {
  //   this.questionProcessor = processor;
  // }

  /**
   * Set up all event listeners for the ChatBar
   */
  private setupEventListeners(): void {
    // Add click events to the search bar
    this.searchBar.addEventListener('click', () => {
      this.questionInput.focus();
    });

    // Make the PAL logo act as an Enter button
    const appIcon = document.querySelector('.app-icon') as HTMLElement;
    if (appIcon) {
      appIcon.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent search bar click
        this.handleQuestion();
      });
      appIcon.style.cursor = 'pointer'; // Show pointer cursor on hover
    }

    // When input value changes, toggle placeholder visibility
    this.questionInput.addEventListener('input', () => {
      // Hide label when input has content
      if (this.questionInput.value.trim() !== '') {
        this.searchLabel.style.opacity = '0';
      } else {
        this.searchLabel.style.opacity = '1';
      }
    });

    // When input is focused but empty, keep label visible
    // Adjusted focus/blur logic slightly for better UX
    this.questionInput.addEventListener('focus', () => {
      if (this.questionInput.value.trim() === '') {
        this.searchLabel.style.opacity = '1'; // Keep label if empty on focus
      }
    });

    // When input loses focus and is empty, show label again
    this.questionInput.addEventListener('blur', () => {
      if (this.questionInput.value.trim() === '') {
        this.searchLabel.style.opacity = '1';
      } else {
        this.searchLabel.style.opacity = '0'; // Hide if has content on blur
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
    this.questionInput.addEventListener('keypress', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        this.handleQuestion();
      }
    });

    // Listen for new chat events from main process
    window.api.on('new-chat', () => {
      this.createNewChat();
    });

    // Re-focus input when clicking anywhere in the app (except specific elements)
    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.id !== 'question-input' &&
          !target.closest('button') &&
          !target.closest('.message') &&
          !target.closest('.app-icon') &&
          !target.closest('.mini-window')) { // Avoid focus steal from mini-window
        this.questionInput.focus();
      }
    });

    // Focus the input automatically on load
    this.questionInput.focus();
  }

  /**
   * Toggle between expanded and collapsed states
   */
  public toggleExpandedState(): void {
    this.isExpanded = !this.isExpanded;

    if (this.isExpanded) {
      document.body.classList.add('expanded');
      window.api.toggleWindowSize(); // Make window larger

      // Scroll to bottom of chat
      setTimeout(() => {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      }, 100); // Delay slightly for transition
    } else {
      document.body.classList.remove('expanded');
      window.api.toggleWindowSize(); // Make window smaller
    }
  }

  /**
   * Clear the current chat and reset UI
   */
  public clearChat(): void {
    // Clear all messages except the welcome message
    const welcomeMessage = document.getElementById('welcome-message') as HTMLDivElement;
    const capabilities = document.querySelector('.capabilities') as HTMLDivElement;

    // Remove all child nodes
    while (this.messagesContainer.firstChild) {
      this.messagesContainer.removeChild(this.messagesContainer.firstChild);
    }

    // Add back welcome message and capabilities if they exist
    if (welcomeMessage) this.messagesContainer.appendChild(welcomeMessage);
    if (capabilities) this.messagesContainer.appendChild(capabilities);

    // Reset welcome message visibility if exists
    if (welcomeMessage) welcomeMessage.style.display = 'block';
    if (capabilities) capabilities.style.display = 'block';

    // Generate new chat ID
    this.currentChatId = this.generateChatId();
    this.chatTitle.textContent = 'New conversation';

    // Reset input and label
    this.questionInput.value = '';
    this.searchLabel.style.opacity = '1';
  }

  /**
   * Close the chat and hide the window
   */
  public closeChat(): void {
    // Simply hide the window
    window.api.hideWindow();
  }

  /**
   * Start a new chat session
   */
  public createNewChat(): void {
    // Clear chat content
    this.clearChat();

    // Focus input
    this.questionInput.focus();

    // Notify backend (main.ts uses this to show window)
    window.api.createNewChat();
  }

  /**
   * Handle user question submission
   */
  public async handleQuestion(): Promise<void> {
    const question = this.questionInput.value.trim();
    // Prevent sending if empty or mini-window is already doing something
    if (!question || (this.miniWindow && this.miniWindow.isVisible)) {
         console.log('Question empty or MiniWindow busy, not sending.'); // Debug log
         return;
    }

    // Pass the question to the MiniWindow
    if (this.miniWindow) {
        this.miniWindow.processQuestion(question);
    } else {
        console.error("MiniWindow instance not available in ChatBar");
        return;
    }

    // Clear input immediately
    this.questionInput.value = '';
    this.searchLabel.style.opacity = '1'; // Show label again

    // Hide the ChatBar window
    window.api.hideWindow();
  }

  /**
   * Adds a message to the chat display area.
   * @param role - The role of the message sender ('user', 'assistant', 'system')
   * @param content - The message content
   */
  public addMessageToChat(role: 'user' | 'assistant' | 'system', content: string): void {
    // Remove welcome message if it's the first user message
    const welcomeElement = this.messagesContainer.querySelector('#welcome-message');
    if (role === 'user' && welcomeElement) {
      const capabilitiesElement = this.messagesContainer.querySelector('.capabilities');
      if (welcomeElement) (welcomeElement as HTMLElement).style.display = 'none';
      if (capabilitiesElement) (capabilitiesElement as HTMLElement).style.display = 'none';
    }

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', role);

    // Use textContent for security unless HTML is explicitly needed and sanitized
    messageDiv.textContent = content;

    // Special handling for assistant might involve markdown parsing later
    // if (role === 'assistant') { ... }

    this.messagesContainer.appendChild(messageDiv);
    this.scrollChatToBottom(); // Scroll after adding message
  }

  /**
   * Scrolls the chat container to the bottom.
   */
  public scrollChatToBottom(): void {
     // Use setTimeout to ensure the scroll happens after the DOM update
     setTimeout(() => {
        if (this.messagesContainer) {
           this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
     }, 0); // Delay of 0ms pushes execution to the end of the event queue
  }

  /**
   * Focuses the main question input field.
   */
  public focusInput(): void {
    if (this.questionInput) {
      this.questionInput.focus();
    }
  }

  /**
   * Add a message to the chat container
   * @param sender 'user', 'assistant', or 'system'
   * @param text Message content (can be HTML)
   */
  public addMessageToChatOld(sender: 'user' | 'assistant' | 'system', text: string): void {
    // Hide welcome message if it's visible
    const welcomeMessage = document.getElementById('welcome-message') as HTMLDivElement;
    const capabilities = document.querySelector('.capabilities') as HTMLDivElement;
    if (welcomeMessage && welcomeMessage.style.display !== 'none') {
      welcomeMessage.style.display = 'none';
    }
    if (capabilities && capabilities.style.display !== 'none') {
      capabilities.style.display = 'none';
    }

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    messageDiv.innerHTML = `<div class="message-content">${text}</div>`; // Wrap content

    this.messagesContainer.appendChild(messageDiv);

    // Add animation class
    messageDiv.classList.add('message-enter');
    
    // Scroll to bottom
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  /**
   * Add typing indicator that shows the assistant is "typing"
   */
  private addTypingIndicator(): HTMLDivElement {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'assistant', 'typing');
    typingDiv.innerHTML = '<span class="dot-flashing"></span>';

    // Style the typing indicator (if not already in CSS)
    // This could be moved to main.css for better separation
    const styleId = 'typing-indicator-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .typing {
          padding: 8px 14px;
          display: inline-block; /* Make it fit content */
          min-width: 40px; /* Give some base width */
        }
        .dot-flashing {
          display: inline-block;
          position: relative;
          width: 8px;
          height: 8px;
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
          width: 8px;
          height: 8px;
          border-radius: 5px;
          background-color: var(--secondary-foreground);
          color: var(--secondary-foreground);
          animation: dotFlashing 1s infinite alternate;
        }
        .dot-flashing::before {
          left: -12px;
          animation-delay: 0s;
        }
        .dot-flashing::after {
          left: 12px;
          animation-delay: 1s;
        }
        @keyframes dotFlashing {
          0% { background-color: var(--secondary-foreground); }
          50%, 100% { background-color: rgba(var(--secondary-foreground-rgb), 0.3); }
        }
      `;
      document.head.appendChild(style);
    }

    this.messagesContainer.appendChild(typingDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    return typingDiv;
  }
}