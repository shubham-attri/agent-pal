/**
 * ChatBar component - handles the main searchbar/chatbar UI and interactions
 */
import { ToolCallComponent } from './ToolCallComponent';

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

  // Track active tool calls
  private activeToolCalls: Map<string, ToolCallComponent> = new Map();
  // Flag to track if we're waiting for user approval
  private waitingForUserApproval: boolean = false;
  // Message sequence in the current conversation
  private messageSequence: number = 0;

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
   * Handle user question submission with enhanced agentic capabilities
   */
  public async handleQuestion(): Promise<void> {
    const question = this.questionInput.value.trim();
    
    // Prevent sending if empty or mini-window is already doing something
    if (!question || (this.miniWindow && this.miniWindow.isVisible)) {
      console.log('Question empty or MiniWindow busy, not sending.'); // Debug log
      return;
    }

    // Don't allow new questions while waiting for tool approval
    if (this.waitingForUserApproval) {
      alert('Please approve or reject the pending tool calls before continuing.');
      return;
    }

    // Add user message to chat
    this.addMessageToChat('user', question);
    
    // Clear input immediately
    this.questionInput.value = '';
    this.searchLabel.style.opacity = '1'; // Show label again

    // Add typing indicator
    const typingIndicator = this.addTypingIndicator();
    
    try {
      // If the app is in small mode, expand it to show the full chat
      if (!this.isExpanded) {
        this.toggleExpandedState();
      }
      
      // Uncomment to simulate tool calls for testing
      // setTimeout(() => {
      //   // Remove typing indicator
      //   typingIndicator.remove();
      //   // Simulate tool calls 
      //   this.simulateToolCalls();
      // }, 1000);
      
      // Process with MiniWindow or directly (depending on app state)
      // For now we'll just pass to MiniWindow if it exists
      if (this.miniWindow) {
        // For integration testing - would normally just send to backend
        setTimeout(() => {
          // Remove typing indicator
          typingIndicator.remove();
          
          // Add a response with tool calls
          this.addMessageToChat('assistant', 'I need to perform these operations to answer your question:', [
            {
              id: 'tool1',
              name: 'run_terminal_cmd',
              parameters: {
                command: 'ls -la',
                explanation: 'List files in the current directory'
              },
              needsApproval: true
            }
          ]);
        }, 1500);
      } else {
        console.error("MiniWindow instance not available in ChatBar");
        typingIndicator.remove();
        this.addMessageToChat('assistant', 'Sorry, I encountered an error processing your request.');
      }
    } catch (error) {
      console.error('Error handling question:', error);
      // Remove typing indicator on error
      typingIndicator.remove();
      // Add error message
      this.addMessageToChat('system', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Adds a message to the chat display area.
   * @param role - The role of the message sender ('user', 'assistant', 'system')
   * @param content - The message content
   * @param toolCalls - Optional array of tool calls associated with this message
   */
  public addMessageToChat(
    role: 'user' | 'assistant' | 'system', 
    content: string,
    toolCalls?: Array<{
      id: string,
      name: string,
      parameters: Record<string, any>,
      needsApproval?: boolean
    }>
  ): void {
    // Remove welcome message if it's the first user message
    const welcomeElement = this.messagesContainer.querySelector('#welcome-message');
    if (role === 'user' && welcomeElement) {
      const capabilitiesElement = this.messagesContainer.querySelector('.capabilities');
      if (welcomeElement) (welcomeElement as HTMLElement).style.display = 'none';
      if (capabilitiesElement) (capabilitiesElement as HTMLElement).style.display = 'none';
    }

    // Create message container with unique ID based on sequence
    const messageId = `message-${this.currentChatId}-${this.messageSequence++}`;
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', role);
    messageDiv.id = messageId;

    // Message content container
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.textContent = content;
    messageDiv.appendChild(contentDiv);

    // If there are tool calls, add a tool calls container
    if (toolCalls && toolCalls.length > 0) {
      const toolCallsContainer = document.createElement('div');
      toolCallsContainer.classList.add('tool-calls-container');
      messageDiv.appendChild(toolCallsContainer);

      // Reset waiting flag if we're adding new tool calls
      this.waitingForUserApproval = false;

      // Process each tool call
      toolCalls.forEach(toolCall => {
        const needsApproval = toolCall.needsApproval !== undefined ? toolCall.needsApproval : true;
        
        if (needsApproval) {
          this.waitingForUserApproval = true;
        }

        // Create and render the tool call component
        const toolCallComponent = new ToolCallComponent(
          toolCallsContainer,
          toolCall.name,
          toolCall.parameters,
          needsApproval,
          // On approve callback
          (updatedParams) => {
            this.onToolCallApproved(toolCall.id, updatedParams);
          },
          // On reject callback
          () => {
            this.onToolCallRejected(toolCall.id);
          }
        );

        // Store reference to the component
        this.activeToolCalls.set(toolCall.id, toolCallComponent);
      });
    }

    this.messagesContainer.appendChild(messageDiv);
    this.scrollChatToBottom(); // Scroll after adding message
  }

  /**
   * Updates the status of a tool call
   */
  public updateToolCallStatus(
    toolCallId: string, 
    status: 'running' | 'completed' | 'error',
    result?: any
  ): void {
    const toolCall = this.activeToolCalls.get(toolCallId);
    if (toolCall) {
      toolCall.updateStatus(status, result);
      
      // If a tool call completes or errors, check if we're still waiting for approval
      if (status === 'completed' || status === 'error') {
        this.checkWaitingStatus();
      }

      this.scrollChatToBottom();
    }
  }

  /**
   * Check if we're still waiting for any user approvals
   */
  private checkWaitingStatus(): void {
    let stillWaiting = false;
    
    for (const [id, toolCall] of this.activeToolCalls.entries()) {
      // You would need to add a method to ToolCallComponent to check its status
      // For now, we'll just set waitingForUserApproval to false
    }
    
    this.waitingForUserApproval = stillWaiting;
  }

  /**
   * Handle tool call approval
   */
  private onToolCallApproved(toolCallId: string, parameters: Record<string, any>): void {
    // Send to your backend or process the tool call
    console.log(`Tool call ${toolCallId} approved with parameters:`, parameters);
    
    // Update UI to show running state
    this.updateToolCallStatus(toolCallId, 'running');
    
    // Here you would typically send the approval to your backend
    // For demo purposes, let's simulate a successful completion after a delay
    setTimeout(() => {
      this.updateToolCallStatus(toolCallId, 'completed', { success: true, data: "Operation completed successfully" });
    }, 1500);
    
    // Check if we're still waiting for other tool call approvals
    this.checkWaitingStatus();
  }

  /**
   * Handle tool call rejection
   */
  private onToolCallRejected(toolCallId: string): void {
    console.log(`Tool call ${toolCallId} rejected`);
    
    // Here you would typically notify your backend about the rejection
    
    // Check if we're still waiting for other tool call approvals
    this.checkWaitingStatus();
  }

  /**
   * Simulate a tool call sequence for testing (will be replaced with real API)
   */
  public simulateToolCalls(): void {
    // Add an assistant message first
    this.addMessageToChat('assistant', 'I need to run a few commands to help answer your question.');
    
    // Add a message with tool calls that need approval
    this.addMessageToChat('assistant', 'I need to perform these operations:', [
      {
        id: 'tool1',
        name: 'run_terminal_cmd',
        parameters: {
          command: 'ls -la',
          explanation: 'List files in the current directory'
        },
        needsApproval: true
      },
      {
        id: 'tool2',
        name: 'read_file',
        parameters: {
          target_file: 'package.json',
          offset: 0,
          limit: 100
        },
        needsApproval: true
      }
    ]);
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