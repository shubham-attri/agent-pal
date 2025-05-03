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
   * Add a message to the chat history
   */
  public addMessage(
    role: 'user' | 'assistant' | 'system',
    content: string
  ): void {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Store message
    this.messages.push({
      id: messageId,
      role,
      content
    });
    
    // For system messages, we use a different structure
    if (role === 'system') {
      const systemEl = document.createElement('div');
      systemEl.className = 'system-message';
      systemEl.textContent = content;
      this.chatHistoryContainer.appendChild(systemEl);
      this.scrollToBottom();
      return;
    }
    
    // Create the role-specific container (this is the colored background section)
    const sectionEl = document.createElement('div');
    sectionEl.className = `${role}-message`;
    sectionEl.setAttribute('data-message-id', messageId);
    
    // Create the inner message container (for content layout)
    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message';
    
    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    if (role === 'user') {
      avatar.textContent = 'U'; // User avatar
      avatar.className += ' user-avatar';
    } else if (role === 'assistant') {
      // ChatGPT logo avatar
      avatar.innerHTML = `<svg width="24" height="24" viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M37.5324 16.8707C37.9808 15.5241 38.1363 14.0974 37.9886 12.6859C37.8409 11.2744 37.3934 9.91076 36.676 8.68622C35.6126 6.83404 33.9882 5.3676 32.0373 4.4985C30.0864 3.62941 27.9098 3.40259 25.8215 3.85078C24.8796 2.7893 23.7219 1.94125 22.4257 1.36341C21.1295 0.785575 19.7249 0.491269 18.3058 0.500197C16.1708 0.495044 14.0893 1.16803 12.3614 2.42214C10.6335 3.67624 9.34853 5.44666 8.6917 7.47815C7.30085 7.76286 5.98686 8.3414 4.8377 9.17505C3.68854 10.0087 2.73073 11.0782 2.02839 12.312C0.956464 14.1591 0.498905 16.2988 0.721698 18.4228C0.944492 20.5467 1.83612 22.5449 3.268 24.1293C2.81966 25.4759 2.66413 26.9026 2.81182 28.3141C2.95951 29.7256 3.40701 31.0892 4.12437 32.3138C5.18791 34.1659 6.8123 35.6322 8.76321 36.5013C10.7141 37.3704 12.8907 37.5973 14.9789 37.1492C15.9208 38.2107 17.0786 39.0587 18.3747 39.6366C19.6709 40.2144 21.0755 40.5087 22.4946 40.4998C24.6307 40.5054 26.7133 39.8321 28.4418 38.5772C30.1704 37.3223 31.4556 35.5506 32.1119 33.5179C33.5027 33.2332 34.8167 32.6547 35.9659 31.821C37.115 30.9874 38.0728 29.9178 38.7752 28.684C39.8458 26.8371 40.3023 24.6979 40.0789 22.5748C39.8556 20.4517 38.9639 18.4544 37.5324 16.8707ZM22.4978 37.8849C20.7443 37.8874 19.0459 37.2733 17.6994 36.1501C17.7601 36.117 17.8666 36.0586 17.936 36.0161L25.9004 31.4156C26.1003 31.3019 26.2663 31.137 26.3813 30.9378C26.4964 30.7386 26.5563 30.5124 26.5549 30.2825V19.0542L29.9213 20.998C29.9389 21.0068 29.9541 21.0198 29.9656 21.0359C29.977 21.052 29.9842 21.0707 29.9867 21.0902V30.3889C29.9842 32.375 29.1946 34.2791 27.7909 35.6841C26.3872 37.0892 24.4838 37.8806 22.4978 37.8849ZM6.39227 31.0064C5.51397 29.5047 5.19742 27.7511 5.49804 26.0429C5.55718 26.0832 5.66048 26.1425 5.73461 26.1839L13.699 30.7844C13.8975 30.8985 14.1233 30.9582 14.3532 30.9582C14.583 30.9582 14.8088 30.8985 15.0073 30.7844L24.731 25.1121V28.9979C24.7321 29.0177 24.7283 29.0376 24.7199 29.0556C24.7115 29.0736 24.6988 29.0893 24.6829 29.1012L16.6317 33.7497C14.9096 34.7416 12.8643 35.0097 10.9447 34.4954C9.02506 33.9811 7.38785 32.7263 6.39227 31.0064ZM4.29707 13.6194C5.17156 12.0998 6.55279 10.9364 8.19885 10.3327C8.19885 10.4013 8.19491 10.5228 8.19491 10.6071V19.808C8.19351 20.0378 8.25334 20.2638 8.36823 20.4629C8.48312 20.6619 8.64893 20.8267 8.84863 20.9404L18.5723 26.6127L15.206 28.5566C15.1894 28.5653 15.1703 28.5695 15.1505 28.5679C15.1307 28.5664 15.1119 28.5593 15.0965 28.5472L7.04532 23.8987C5.32173 22.9086 4.06448 21.2932 3.55633 19.3782C3.04819 17.4632 3.33188 15.4242 4.29707 13.6194ZM31.955 20.0556L22.2312 14.3833L25.5976 12.4395C25.6142 12.4309 25.6333 12.4267 25.6531 12.4283C25.6729 12.4298 25.6917 12.4369 25.7071 12.449L33.7583 17.0975C35.0314 17.8286 36.0322 18.9613 36.5993 20.3012C37.1664 21.6412 37.2717 23.1259 36.8142 24.4659C36.3567 25.8059 35.465 27.0074 34.2429 27.8407C33.0208 28.674 31.5486 29.099 30.1086 29.0565C28.6686 29.014 27.312 28.504 26.2399 27.6045L18.1887 32.253C16.4666 33.2449 14.4213 33.513 12.5017 32.9987C10.5821 32.4844 9.04488 31.2296 8.0493 29.5075C7.05372 27.7854 6.62874 25.7401 7.04376 23.8205C7.45878 21.9009 8.65356 20.2636 10.3757 19.268L10.3757 19.268L10.3757 19.268" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>`;
      avatar.className += ' assistant-avatar';
    } else {
      avatar.textContent = 'S'; // System avatar
      avatar.className += ' system-avatar';
    }
    
    // Content
    const contentEl = document.createElement('div');
    contentEl.className = 'chat-message-content';
    contentEl.textContent = content;
    
    messageEl.appendChild(avatar);
    messageEl.appendChild(contentEl);
    
    // Add to UI
    sectionEl.appendChild(messageEl);
    
    // Add to chat history
    this.chatHistoryContainer.appendChild(sectionEl);
    
    // Scroll to bottom
    this.scrollToBottom();
  }
  
  /**
   * Show typing indicator while waiting for response
   */
  public showTypingIndicator(): HTMLElement {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar assistant-avatar';
    avatar.innerHTML = `<svg width="24" height="24" viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M37.5324 16.8707C37.9808 15.5241 38.1363 14.0974 37.9886 12.6859C37.8409 11.2744 37.3934 9.91076 36.676 8.68622C35.6126 6.83404 33.9882 5.3676 32.0373 4.4985C30.0864 3.62941 27.9098 3.40259 25.8215 3.85078C24.8796 2.7893 23.7219 1.94125 22.4257 1.36341C21.1295 0.785575 19.7249 0.491269 18.3058 0.500197C16.1708 0.495044 14.0893 1.16803 12.3614 2.42214C10.6335 3.67624 9.34853 5.44666 8.6917 7.47815C7.30085 7.76286 5.98686 8.3414 4.8377 9.17505C3.68854 10.0087 2.73073 11.0782 2.02839 12.312C0.956464 14.1591 0.498905 16.2988 0.721698 18.4228C0.944492 20.5467 1.83612 22.5449 3.268 24.1293C2.81966 25.4759 2.66413 26.9026 2.81182 28.3141C2.95951 29.7256 3.40701 31.0892 4.12437 32.3138C5.18791 34.1659 6.8123 35.6322 8.76321 36.5013C10.7141 37.3704 12.8907 37.5973 14.9789 37.1492C15.9208 38.2107 17.0786 39.0587 18.3747 39.6366C19.6709 40.2144 21.0755 40.5087 22.4946 40.4998C24.6307 40.5054 26.7133 39.8321 28.4418 38.5772C30.1704 37.3223 31.4556 35.5506 32.1119 33.5179C33.5027 33.2332 34.8167 32.6547 35.9659 31.821C37.115 30.9874 38.0728 29.9178 38.7752 28.684C39.8458 26.8371 40.3023 24.6979 40.0789 22.5748C39.8556 20.4517 38.9639 18.4544 37.5324 16.8707ZM22.4978 37.8849C20.7443 37.8874 19.0459 37.2733 17.6994 36.1501C17.7601 36.117 17.8666 36.0586 17.936 36.0161L25.9004 31.4156C26.1003 31.3019 26.2663 31.137 26.3813 30.9378C26.4964 30.7386 26.5563 30.5124 26.5549 30.2825V19.0542L29.9213 20.998C29.9389 21.0068 29.9541 21.0198 29.9656 21.0359C29.977 21.052 29.9842 21.0707 29.9867 21.0902V30.3889C29.9842 32.375 29.1946 34.2791 27.7909 35.6841C26.3872 37.0892 24.4838 37.8806 22.4978 37.8849ZM6.39227 31.0064C5.51397 29.5047 5.19742 27.7511 5.49804 26.0429C5.55718 26.0832 5.66048 26.1425 5.73461 26.1839L13.699 30.7844C13.8975 30.8985 14.1233 30.9582 14.3532 30.9582C14.583 30.9582 14.8088 30.8985 15.0073 30.7844L24.731 25.1121V28.9979C24.7321 29.0177 24.7283 29.0376 24.7199 29.0556C24.7115 29.0736 24.6988 29.0893 24.6829 29.1012L16.6317 33.7497C14.9096 34.7416 12.8643 35.0097 10.9447 34.4954C9.02506 33.9811 7.38785 32.7263 6.39227 31.0064ZM4.29707 13.6194C5.17156 12.0998 6.55279 10.9364 8.19885 10.3327C8.19885 10.4013 8.19491 10.5228 8.19491 10.6071V19.808C8.19351 20.0378 8.25334 20.2638 8.36823 20.4629C8.48312 20.6619 8.64893 20.8267 8.84863 20.9404L18.5723 26.6127L15.206 28.5566C15.1894 28.5653 15.1703 28.5695 15.1505 28.5679C15.1307 28.5664 15.1119 28.5593 15.0965 28.5472L7.04532 23.8987C5.32173 22.9086 4.06448 21.2932 3.55633 19.3782C3.04819 17.4632 3.33188 15.4242 4.29707 13.6194ZM31.955 20.0556L22.2312 14.3833L25.5976 12.4395C25.6142 12.4309 25.6333 12.4267 25.6531 12.4283C25.6729 12.4298 25.6917 12.4369 25.7071 12.449L33.7583 17.0975C35.0314 17.8286 36.0322 18.9613 36.5993 20.3012C37.1664 21.6412 37.2717 23.1259 36.8142 24.4659C36.3567 25.8059 35.465 27.0074 34.2429 27.8407C33.0208 28.674 31.5486 29.099 30.1086 29.0565C28.6686 29.014 27.312 28.504 26.2399 27.6045L18.1887 32.253C16.4666 33.2449 14.4213 33.513 12.5017 32.9987C10.5821 32.4844 9.04488 31.2296 8.0493 29.5075C7.05372 27.7854 6.62874 25.7401 7.04376 23.8205C7.45878 21.9009 8.65356 20.2636 10.3757 19.268L10.3757 19.268L10.3757 19.268" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>`;
    
    const dots = document.createElement('div');
    dots.className = 'dots';
    
    // Create three dots
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'dot';
      dots.appendChild(dot);
    }
    
    indicator.appendChild(avatar);
    indicator.appendChild(dots);
    
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
} 