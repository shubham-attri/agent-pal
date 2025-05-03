/**
 * MainChatWindow component - handles the full-screen chat interface similar to ChatGPT
 */
export class MainChatWindow {
  // DOM elements
  private container: HTMLElement;
  private chatHistoryContainer!: HTMLElement;
  private chatInputContainer!: HTMLElement;
  private chatInput!: HTMLTextAreaElement;
  private sendButton!: HTMLButtonElement;
  private searchLabel!: HTMLDivElement;
  private appIcon!: HTMLDivElement;
  private audioIcon!: HTMLDivElement;
  
  // Chat state
  private messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
  }> = [];

  // Event callbacks
  private onSendMessage: (message: string) => void;

  constructor(containerId: string, onSendMessage?: (message: string) => void) {
    // Find container element
    const containerElement = document.getElementById(containerId);
    if (!containerElement) {
      throw new Error(`Container element with ID "${containerId}" not found`);
    }
    
    this.container = containerElement;
    this.onSendMessage = onSendMessage || ((message: string) => {
      console.log('Message sent:', message);
      // Default implementation to add a mock response
      this.addMessage('assistant', 'I received your message: ' + message);
    });
    
    this.initializeUI();
    this.setupEventListeners();
  }

  /**
   * Create and initialize the UI components
   */
  public initializeUI(): void {
    // Clear existing content
    this.container.innerHTML = '';
    
    // Create the main chat container - full width, no sidebar
    const mainChat = document.createElement('div');
    mainChat.className = 'main-chat-window';
    
    // Chat history container (messages area)
    this.chatHistoryContainer = document.createElement('div');
    this.chatHistoryContainer.className = 'chat-history-container';
    
    // Chat input area (bottom)
    this.chatInputContainer = document.createElement('div');
    this.chatInputContainer.className = 'chat-input-container';
    
    // Create the input elements (similar to ChatBar)
    this.createChatInputElements();
    
    // Add elements to container
    mainChat.appendChild(this.chatHistoryContainer);
    mainChat.appendChild(this.chatInputContainer);
    
    // Add main chat area to the container
    this.container.appendChild(mainChat);
  }
  
  /**
   * Create the chat input UI elements (similar to ChatBar styling)
   */
  private createChatInputElements(): void {
    // Create search bar similar to ChatBar
    const searchBar = document.createElement('div');
    searchBar.className = 'search-bar';
    
    // App icon (logo)
    this.appIcon = document.createElement('div');
    this.appIcon.className = 'app-icon';
    // Use the PAL Logo SVG
    this.appIcon.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="92" y="65" width="37" height="50" rx="8" fill="currentColor"/>
        <rect x="37" y="11" width="50" height="50" rx="8" fill="currentColor"/>
        <rect x="37" y="118" width="50" height="50" rx="8" fill="currentColor"/>
        <rect x="47" y="23" width="32" height="26" rx="8" fill="white"/>
        <rect x="72" y="46" width="30" height="30" rx="8" fill="currentColor"/>
        <rect x="113" y="76" width="30" height="30" rx="8" transform="rotate(-90 113 76)" fill="currentColor"/>
        <rect x="73" y="100" width="30" height="30" rx="8" fill="currentColor"/>
        <rect x="113" y="130" width="30" height="30" rx="8" transform="rotate(-90 113 130)" fill="currentColor"/>
        <rect width="32" height="26" rx="8" transform="matrix(1 0 0 -1 47 153)" fill="white"/>
        <rect width="20" height="19" rx="4" transform="matrix(1 0 0 -1 76 126)" fill="white"/>
        <rect x="76" y="50" width="20" height="19" rx="4" fill="white"/>
      </svg>
    `;
    
    // Text input field with label overlay
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'input-wrapper';
    
    this.searchLabel = document.createElement('div');
    this.searchLabel.className = 'search-label';
    this.searchLabel.textContent = 'Message Agent Pal…';
    
    this.chatInput = document.createElement('textarea');
    this.chatInput.className = 'chat-input';
    this.chatInput.rows = 1;
    this.chatInput.setAttribute('aria-label', 'Chat input');
    
    inputWrapper.appendChild(this.searchLabel);
    inputWrapper.appendChild(this.chatInput);
    
    // Audio icon
    this.audioIcon = document.createElement('div');
    this.audioIcon.className = 'audio-icon';
    // Use the Audio Icon SVG
    this.audioIcon.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 21 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0V24H15V0H12ZM6 3V21H9V3H6ZM18 6V18H21V6H18ZM0 9V15H3V9H0Z" fill="currentColor"/>
      </svg>
    `;
    
    // Send button
    this.sendButton = document.createElement('button');
    this.sendButton.className = 'chat-input-button send-button';
    this.sendButton.disabled = true;
    this.sendButton.setAttribute('aria-label', 'Send message');
    this.sendButton.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.75 10H16.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 3.75L16.25 10L10 16.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>`;
    
    // Assemble search bar components
    searchBar.appendChild(this.appIcon);
    searchBar.appendChild(inputWrapper);
    searchBar.appendChild(this.audioIcon);
    searchBar.appendChild(this.sendButton);
    
    // Add search bar to container
    this.chatInputContainer.appendChild(searchBar);
  }
  
  /**
   * Set up event listeners for user interactions
   */
  private setupEventListeners(): void {
    // Search bar click
    const searchBar = this.chatInputContainer.querySelector('.search-bar');
    if (searchBar) {
      searchBar.addEventListener('click', () => {
        this.chatInput.focus();
      });
    }
    
    // App icon click to send
    this.appIcon.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent search bar click
      this.sendMessage();
    });
    
    // Input field events
    this.chatInput.addEventListener('input', () => {
      this.resizeInput();
      this.updateSendButtonState();
      
      // Hide label when input has content
      if (this.chatInput.value.trim() !== '') {
        this.searchLabel.style.opacity = '0';
      } else {
        this.searchLabel.style.opacity = '1';
      }
    });
    
    this.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!this.sendButton.disabled) {
          this.sendMessage();
        }
      } else if (e.key === 'ArrowUp' && this.chatInput.value.trim() === '') {
        // Edit last user message (like in ChatGPT)
        this.editLastUserMessage();
      }
    });
    
    // Input focus events for visual feedback
    this.chatInput.addEventListener('focus', () => {
      const searchBar = this.chatInput.closest('.search-bar');
      if (searchBar) searchBar.classList.add('focused');
      
      if (this.chatInput.value.trim() === '') {
        this.searchLabel.style.opacity = '1'; // Keep label if empty on focus
      }
    });
    
    this.chatInput.addEventListener('blur', () => {
      const searchBar = this.chatInput.closest('.search-bar');
      if (searchBar) searchBar.classList.remove('focused');
      
      if (this.chatInput.value.trim() === '') {
        this.searchLabel.style.opacity = '1';
      } else {
        this.searchLabel.style.opacity = '0'; // Hide if has content on blur
      }
    });
    
    // Send button click
    this.sendButton.addEventListener('click', () => {
      if (!this.sendButton.disabled) {
        this.sendMessage();
      }
    });
    
    // Focus the input automatically on load
    setTimeout(() => {
      this.chatInput.focus();
    }, 100);
  }
  
  /**
   * Resize input field to fit content
   */
  private resizeInput(): void {
    // Reset height to calculate correct scrollHeight
    this.chatInput.style.height = 'auto';
    
    // Set new height based on content (with a max height)
    const newHeight = Math.min(Math.max(this.chatInput.scrollHeight, 24), 200);
    this.chatInput.style.height = `${newHeight}px`;
  }
  
  /**
   * Enable/disable send button based on input content
   */
  private updateSendButtonState(): void {
    const hasContent = this.chatInput.value.trim().length > 0;
    this.sendButton.disabled = !hasContent;
    
    if (hasContent) {
      this.sendButton.classList.add('active');
    } else {
      this.sendButton.classList.remove('active');
    }
  }
  
  /**
   * Edit the last user message (like ChatGPT's up arrow functionality)
   */
  private editLastUserMessage(): void {
    // Find the last user message
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'user') {
        // Set the content in the input field
        this.chatInput.value = this.messages[i].content;
        this.chatInput.focus();
        
        // Move cursor to end of text
        this.chatInput.selectionStart = this.chatInput.value.length;
        this.chatInput.selectionEnd = this.chatInput.value.length;
        
        // Update input height and send button state
        this.resizeInput();
        this.updateSendButtonState();
        
        // Update label visibility
        this.searchLabel.style.opacity = '0';
        break;
      }
    }
  }
  
  /**
   * Send the current message
   */
  private sendMessage(): void {
    const message = this.chatInput.value.trim();
    if (!message) return;
    
    // Clear input and reset height
    this.chatInput.value = '';
    this.chatInput.style.height = 'auto';
    this.searchLabel.style.opacity = '1';
    this.updateSendButtonState();
    
    // Call the message handler
    try {
      this.onSendMessage(message);
    } catch (error) {
      console.error('Error sending message:', error);
      this.addMessage('system', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Re-enable input after a short delay
    setTimeout(() => {
      this.chatInput.disabled = false;
      this.chatInput.focus();
    }, 100);
  }
  
  /**
   * Show a typing indicator in the chat
   */
  public showTypingIndicator(): HTMLElement {
    // Remove any existing indicator first
    this.removeTypingIndicator();
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator assistant-message';
    
    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message';
    
    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar assistant-avatar';
    // Use PAL Logo for assistant avatar
    avatar.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="92" y="65" width="37" height="50" rx="8" fill="currentColor"/>
        <rect x="37" y="11" width="50" height="50" rx="8" fill="currentColor"/>
        <rect x="37" y="118" width="50" height="50" rx="8" fill="currentColor"/>
        <rect x="47" y="23" width="32" height="26" rx="8" fill="white"/>
        <rect x="72" y="46" width="30" height="30" rx="8" fill="currentColor"/>
        <rect x="113" y="76" width="30" height="30" rx="8" transform="rotate(-90 113 76)" fill="currentColor"/>
        <rect x="73" y="100" width="30" height="30" rx="8" fill="currentColor"/>
        <rect x="113" y="130" width="30" height="30" rx="8" transform="rotate(-90 113 130)" fill="currentColor"/>
        <rect width="32" height="26" rx="8" transform="matrix(1 0 0 -1 47 153)" fill="white"/>
        <rect width="20" height="19" rx="4" transform="matrix(1 0 0 -1 76 126)" fill="white"/>
        <rect x="76" y="50" width="20" height="19" rx="4" fill="white"/>
      </svg>
    `;
    
    const contentEl = document.createElement('div');
    contentEl.className = 'chat-message-content';
    
    const dots = document.createElement('div');
    dots.className = 'dots';
    
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'dot';
      dots.appendChild(dot);
    }
    
    contentEl.appendChild(dots);
    messageEl.appendChild(avatar);
    messageEl.appendChild(contentEl);
    indicator.appendChild(messageEl);
    
    this.chatHistoryContainer.appendChild(indicator);
    this.scrollToBottom();
    
    return indicator;
  }
  
  /**
   * Remove typing indicator
   */
  public removeTypingIndicator(): void {
    const indicator = this.chatHistoryContainer.querySelector('.typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }
  
  /**
   * Scroll chat to the bottom
   */
  public scrollToBottom(): void {
    this.chatHistoryContainer.scrollTop = this.chatHistoryContainer.scrollHeight;
  }
  
  /**
   * Clear all chat messages and reset the UI
   */
  public clearChat(): void {
    // Clear message state
    this.messages = [];
    
    // Clear chat history container
    if (this.chatHistoryContainer) {
      this.chatHistoryContainer.innerHTML = '';
    }
    
    // Re-enable input if it was disabled
    if (this.chatInput) {
      this.chatInput.disabled = false;
    }
    
    // Clear input field
    if (this.chatInput) {
      this.chatInput.value = '';
      this.updateSendButtonState();
    }
    
    console.log('Chat cleared');
  }

  /**
   * Add a message to the chat
   */
  public addMessage(
    role: 'user' | 'assistant' | 'system',
    content: string
  ): void {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    this.messages.push({ id: messageId, role, content });
    
    // Handle system messages differently (as status)
    if (role === 'system') {
      const systemEl = document.createElement('div');
      systemEl.className = 'system-message';
      systemEl.textContent = content;
      this.chatHistoryContainer.appendChild(systemEl);
      this.scrollToBottom();
      return;
    }
    
    // For user or assistant messages
    const sectionEl = document.createElement('div');
    sectionEl.className = `${role}-message`;
    
    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message';
    
    const avatar = document.createElement('div');
    avatar.className = `chat-avatar ${role}-avatar`;
    
    if (role === 'user') {
      avatar.textContent = 'U';
    } else {
      // Use PAL Logo for assistant avatar
      avatar.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="92" y="65" width="37" height="50" rx="8" fill="currentColor"/>
          <rect x="37" y="11" width="50" height="50" rx="8" fill="currentColor"/>
          <rect x="37" y="118" width="50" height="50" rx="8" fill="currentColor"/>
          <rect x="47" y="23" width="32" height="26" rx="8" fill="white"/>
          <rect x="72" y="46" width="30" height="30" rx="8" fill="currentColor"/>
          <rect x="113" y="76" width="30" height="30" rx="8" transform="rotate(-90 113 76)" fill="currentColor"/>
          <rect x="73" y="100" width="30" height="30" rx="8" fill="currentColor"/>
          <rect x="113" y="130" width="30" height="30" rx="8" transform="rotate(-90 113 130)" fill="currentColor"/>
          <rect width="32" height="26" rx="8" transform="matrix(1 0 0 -1 47 153)" fill="white"/>
          <rect width="20" height="19" rx="4" transform="matrix(1 0 0 -1 76 126)" fill="white"/>
          <rect x="76" y="50" width="20" height="19" rx="4" fill="white"/>
        </svg>
      `;
    }
    
    const contentEl = document.createElement('div');
    contentEl.className = 'chat-message-content';
    contentEl.textContent = content;
    
    messageEl.appendChild(avatar);
    messageEl.appendChild(contentEl);
    
    sectionEl.appendChild(messageEl);
    this.chatHistoryContainer.appendChild(sectionEl);
    
    this.scrollToBottom();
  }
} 