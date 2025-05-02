"use strict";
document.addEventListener('DOMContentLoaded', () => {
    // Chat functionality
    const questionInput = document.getElementById('question-input');
    const searchLabel = document.querySelector('.search-label');
    const messagesContainer = document.getElementById('messages-container');
    const chatContainer = document.getElementById('chat-container');
    const chatTitle = document.querySelector('.chat-title');
    const searchBar = document.querySelector('.search-bar');
    // Action buttons
    const newChatButton = document.getElementById('new-chat-button');
    const clearChatButton = document.getElementById('clear-chat-button');
    const closeChatButton = document.getElementById('close-chat-button');
    // Track window state
    let isExpanded = false;
    let currentChatId = generateChatId();
    // Add click events to the search bar
    searchBar.addEventListener('click', () => {
        questionInput.focus();
    });
    // When input is focused, hide the label and when blurred with no content, show it again
    questionInput.addEventListener('focus', () => {
        searchLabel.style.opacity = '0';
    });
    questionInput.addEventListener('blur', () => {
        if (questionInput.value.trim() === '') {
            searchLabel.style.opacity = '1';
        }
    });
    // Set up action buttons
    newChatButton.addEventListener('click', () => {
        createNewChat();
    });
    clearChatButton.addEventListener('click', () => {
        clearChat();
    });
    closeChatButton.addEventListener('click', () => {
        closeChat();
    });
    // Listen for new chat events from main process
    window.api.on('new-chat', () => {
        createNewChat();
    });
    function toggleExpandedState() {
        isExpanded = !isExpanded;
        if (isExpanded) {
            document.body.classList.add('expanded');
            window.api.toggleWindowSize(); // Make window larger
            // Scroll to bottom of chat
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }
        else {
            document.body.classList.remove('expanded');
            window.api.toggleWindowSize(); // Make window smaller
        }
    }
    function clearChat() {
        // Clear all messages except the welcome message
        const welcomeMessage = document.getElementById('welcome-message');
        const capabilities = document.querySelector('.capabilities');
        // Remove all child nodes
        while (messagesContainer.firstChild) {
            messagesContainer.removeChild(messagesContainer.firstChild);
        }
        // Add back welcome message and capabilities
        messagesContainer.appendChild(welcomeMessage);
        messagesContainer.appendChild(capabilities);
        // Reset welcome message visibility
        welcomeMessage.style.display = 'block';
        capabilities.style.display = 'block';
        // Generate new chat ID
        currentChatId = generateChatId();
        chatTitle.textContent = 'New conversation';
        // Reset input and label
        questionInput.value = '';
        searchLabel.style.opacity = '1';
    }
    function closeChat() {
        // Hide chat and collapse window
        if (isExpanded) {
            toggleExpandedState();
        }
    }
    function createNewChat() {
        // Clear chat content
        clearChat();
        // Expand if not already expanded
        if (!isExpanded) {
            toggleExpandedState();
        }
        // Focus input
        questionInput.focus();
        // Notify backend (for future implementation)
        window.api.createNewChat();
    }
    // Handle user question
    async function handleQuestion() {
        const question = questionInput.value.trim();
        if (!question)
            return;
        // Expand UI if not already expanded
        if (!isExpanded) {
            toggleExpandedState();
        }
        // Update chat title with first few words of first question
        if (chatTitle.textContent === 'New conversation') {
            const titleText = question.length > 30
                ? question.substring(0, 30) + '...'
                : question;
            chatTitle.textContent = titleText;
        }
        // Add user question to chat with animated entry
        addMessageToChat('user', question);
        // Clear input
        questionInput.value = '';
        // Show typing indicator
        const typingIndicator = addTypingIndicator();
        try {
            // Simulate a small delay for realistic typing
            await new Promise(resolve => setTimeout(resolve, 800));
            // Get answer from main process
            const answer = await window.api.askQuestion(question);
            // Remove typing indicator
            typingIndicator.remove();
            // Add response
            addMessageToChat('assistant', answer);
        }
        catch (error) {
            // Remove typing indicator
            typingIndicator.remove();
            if (error instanceof Error) {
                addMessageToChat('system', 'Error: ' + error.message);
            }
            else {
                addMessageToChat('system', 'An unknown error occurred');
            }
        }
    }
    // Add typing indicator that shows the assistant is "typing"
    function addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'assistant', 'typing');
        typingDiv.innerHTML = '<span class="dot-flashing"></span>';
        // Style the typing indicator
        const style = document.createElement('style');
        style.textContent = `
      .typing {
        padding: 8px 14px;
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
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return typingDiv;
    }
    // Trigger on Enter key
    questionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleQuestion();
        }
    });
    function addMessageToChat(role, content) {
        // Remove welcome and capabilities if this is the first actual exchange
        if (role === 'user' && messagesContainer.querySelector('#welcome-message')) {
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
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    // Generate a random ID for each chat
    function generateChatId() {
        return 'chat_' + Math.random().toString(36).substring(2, 12);
    }
    // Focus the input automatically
    questionInput.focus();
    // Re-focus input when clicking anywhere in the app
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (target.id !== 'question-input' &&
            !target.closest('button') &&
            !target.closest('.message')) {
            questionInput.focus();
        }
    });
});
