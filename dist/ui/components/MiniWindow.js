"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiniWindow = void 0;
/**
 * MiniWindow component - handles the mini question answering window with tool call status
 */
class MiniWindow {
    constructor() {
        this.container = null;
        this.isVisible = false; // Made public for ChatBar check
        this.processingQuestion = false;
        this.toolStatus = null;
        this.answerContainer = null;
        this.currentToolStep = '';
        this.steps = [];
        this.closeButton = null;
        this.expandButton = null;
        this.lastQuestion = '';
        this.lastAnswer = '';
        this.currentQuestion = null;
        this.currentAnswer = null;
        // Callback for the expand action, set by renderer.ts
        this.onExpandCallback = null;
        this.createMiniWindow();
        this.setupEventListeners();
    }
    /**
     * Create the mini window UI
     */
    createMiniWindow() {
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'mini-window';
        this.container.style.display = 'none'; // Start hidden
        this.container.style.opacity = '0'; // Start transparent
        // Create header
        const header = document.createElement('div');
        header.className = 'mini-window-header';
        // Add title
        const title = document.createElement('div');
        title.className = 'mini-window-title';
        title.textContent = 'Processing Question';
        header.appendChild(title);
        // Header actions container
        const headerActions = document.createElement('div');
        headerActions.className = 'mini-window-actions';
        // Add expand button with SVG
        this.expandButton = document.createElement('div');
        this.expandButton.className = 'mini-window-expand';
        this.expandButton.title = 'Expand to Full Chat'; // Tooltip
        this.expandButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19.1304 0.869565V5.21739C19.1304 5.69565 18.7391 6.08696 18.2609 6.08696C17.7826 6.08696 17.3913 5.69565 17.3913 5.21739V2.97826L12.3478 8.02174C12.1739 8.19565 11.9565 8.28261 11.7391 8.28261C11.5217 8.28261 11.3043 8.19565 11.1304 8.02174C10.7826 7.67391 10.7826 7.13043 11.1304 6.78261L16.1522 1.73913H13.913C13.4348 1.73913 13.0435 1.34783 13.0435 0.869565C13.0435 0.391304 13.4348 0 13.913 0H18.2609C18.5 0 18.7174 0.0869565 18.8696 0.26087C19.0435 0.413043 19.1304 0.630435 19.1304 0.869565ZM18.2609 13.0435C17.7826 13.0435 17.3913 13.4348 17.3913 13.913V16.1522L12.4348 11.2391C12.087 10.8913 11.5217 10.8913 11.1739 11.2391C10.8261 11.587 10.8261 12.1304 11.1522 12.4783L16.0652 17.3913H13.8261C13.3478 17.3913 12.9565 17.7826 12.9565 18.2609C12.9565 18.7391 13.3478 19.1304 13.8261 19.1304H18.1739C18.413 19.1304 18.6739 19.0435 18.8261 18.8696C19 18.6957 19.1304 18.4783 19.1304 18.2609V13.913C19.1304 13.4348 18.7391 13.0435 18.2609 13.0435ZM6.69565 11.1957L1.73913 16.1522V13.913C1.73913 13.4348 1.34783 13.0435 0.869565 13.0435C0.391304 13.0435 0 13.4348 0 13.913V18.2609C0 18.5 0.0869565 18.7174 0.26087 18.8696C0.434783 19.0435 0.652174 19.1304 0.891304 19.1304H5.23913C5.71739 19.1304 6.1087 18.7391 6.1087 18.2609C6.1087 17.7826 5.71739 17.3913 5.23913 17.3913H2.97826L7.93478 12.4348C8.28261 12.087 8.26087 11.5435 7.93478 11.1957C7.6087 10.8478 7.04348 10.8478 6.69565 11.1957ZM2.97826 1.82609H5.21739C5.69565 1.82609 6.08696 1.43478 6.08696 0.956522C6.08696 0.478261 5.69565 0.0869565 5.21739 0.0869565H0.869565C0.630435 0.0869565 0.413043 0.173913 0.26087 0.347826C0.0869565 0.5 0 0.717391 0 0.956522V5.30435C0 5.78261 0.391304 6.17391 0.869565 6.17391C1.34783 6.17391 1.73913 5.78261 1.73913 5.30435V3.04348L6.76087 8.06522C6.93478 8.23913 7.15217 8.32609 7.36957 8.32609C7.58696 8.32609 7.80435 8.23913 7.97826 8.06522C8.32609 7.71739 8.32609 7.17391 7.97826 6.82609L2.97826 1.82609Z" fill="white"/>
      </svg>
    `;
        headerActions.appendChild(this.expandButton);
        // Add close button
        this.closeButton = document.createElement('div');
        this.closeButton.className = 'mini-window-close';
        this.closeButton.innerHTML = '&times;';
        this.closeButton.title = 'Close'; // Tooltip
        headerActions.appendChild(this.closeButton);
        header.appendChild(headerActions);
        this.container.appendChild(header);
        // Create content area
        const content = document.createElement('div');
        content.className = 'mini-window-content';
        // Tool status section
        this.toolStatus = document.createElement('div');
        this.toolStatus.className = 'tool-status';
        content.appendChild(this.toolStatus);
        // Answer container
        this.answerContainer = document.createElement('div');
        this.answerContainer.className = 'mini-window-answer';
        content.appendChild(this.answerContainer);
        this.container.appendChild(content);
        // Add to document
        document.body.appendChild(this.container);
        // Add styles
        this.addStyles();
    }
    /**
     * Add the required CSS for the component
     */
    addStyles() {
        const styleId = 'mini-window-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
        .mini-window {
          position: fixed;
          bottom: 80px; /* Adjust distance from bottom */
          left: 50%;
          transform: translateX(-50%);
          width: 400px;
          max-height: 400px;
          background-color: rgba(0, 0, 0, 0.25);
          border-radius: var(--radius);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          z-index: 1000;
          overflow: hidden;
          transition: opacity 0.3s, transform 0.3s;
          display: flex;
          flex-direction: column;
          font-family: "Jersey 20", sans-serif;
          opacity: 0;
          transform: translateX(-50%) translateY(20px); /* Start slightly lower */
          pointer-events: none; /* Ignore clicks when hidden */
        }
        .mini-window.visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
            pointer-events: auto; /* Allow clicks when visible */
        }

        .mini-window-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(24, 26, 27, 0.4);
          cursor: default; /* Default cursor for header */
        }

        .mini-window-title {
          font-weight: 500;
          font-size: 14px;
          color: var(--foreground);
        }

        .mini-window-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .mini-window-expand,
        .mini-window-close {
          cursor: pointer;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background-color 0.2s;
          color: var(--muted-foreground);
          background-color: rgba(60, 60, 60, 0.2);
        }

        .mini-window-expand:hover,
        .mini-window-close:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: var(--foreground);
        }

        .mini-window-close {
          font-size: 18px;
        }

        .mini-window-content {
          padding: 16px;
          overflow-y: auto;
          max-height: 350px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: linear-gradient(
            to bottom,
            rgba(24, 26, 27, 0.3),
            rgba(37, 38, 39, 0.2)
          );
        }

        .tool-status {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tool-step {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 13px;
          padding: 8px 12px;
          border-radius: calc(var(--radius) - 4px);
          background-color: rgba(0, 0, 0, 0.2);
          transition: background-color 0.3s, border-left 0.3s;
          color: var(--muted-foreground);
          border-left: 2px solid transparent;
        }

        .tool-step.active {
          background-color: rgba(58, 143, 251, 0.2);
          border-left: 2px solid var(--primary);
          color: var(--foreground);
        }

        .tool-step.completed {
          background-color: rgba(0, 0, 0, 0.15);
          color: var(--muted-foreground);
          border-left: 2px solid rgba(255, 255, 255, 0.1);
        }
        
        .tool-step.error {
            background-color: rgba(255, 80, 80, 0.15);
            border-left: 2px solid red;
            color: white;
        }

        .tool-icon {
          width: 16px;
          height: 16px;
          margin-top: 2px;
        }

        .mini-window-answer {
          font-size: 14px;
          color: var(--foreground);
          background-color: rgba(0, 0, 0, 0.1);
          padding: 12px;
          border-radius: calc(var(--radius) - 4px);
          white-space: pre-wrap; /* Preserve whitespace and wrap */
          word-wrap: break-word;
        }
      `;
            document.head.appendChild(style);
        }
    }
    /**
     * Set up event listeners for close and expand buttons
     */
    setupEventListeners() {
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => {
                this.hide();
            });
        }
        if (this.expandButton) {
            this.expandButton.addEventListener('click', () => {
                this.expandToFullChat();
            });
        }
    }
    /**
     * Registers the callback function to be executed when the expand button is clicked.
     * This should be called by the renderer process during initialization.
     * @param callback - The function to call, accepting question and answer strings.
     */
    setupExpandAction(callback) {
        this.onExpandCallback = callback;
        console.log('MiniWindow expand callback registered.');
    }
    /**
     * Show the mini window with animation
     */
    show() {
        if (!this.container)
            return;
        this.isVisible = true;
        this.container.style.display = 'flex';
        // Use setTimeout to allow display change before triggering transition
        setTimeout(() => {
            if (this.container) {
                this.container.classList.add('visible');
            }
        }, 10);
    }
    /**
     * Hide the mini window with animation
     */
    hide() {
        if (!this.container)
            return;
        this.isVisible = false;
        this.processingQuestion = false; // Reset processing state on hide
        this.container.classList.remove('visible');
        // Wait for transition to finish before setting display: none
        setTimeout(() => {
            if (this.container && !this.isVisible) { // Check isVisible again in case it was shown quickly
                this.container.style.display = 'none';
            }
        }, 300); // Match transition duration
    }
    /**
     * Add a status step to the tool status display
     * @param text The text content of the step
     * @param status 'active', 'completed', 'error', or 'pending'
     */
    addToolStep(text, status = 'pending') {
        if (!this.toolStatus)
            return document.createElement('div'); // Should not happen
        const stepDiv = document.createElement('div');
        stepDiv.className = 'tool-step';
        stepDiv.textContent = text;
        if (status !== 'pending') {
            stepDiv.classList.add(status);
        }
        this.toolStatus.appendChild(stepDiv);
        return stepDiv;
    }
    /**
     * Update the status of the last added tool step
     * @param status The new status for the last step
     */
    updateLastToolStep(status) {
        if (!this.toolStatus || !this.toolStatus.lastElementChild)
            return;
        const lastStep = this.toolStatus.lastElementChild;
        lastStep.classList.remove('active', 'completed', 'error', 'pending'); // Remove existing status
        lastStep.classList.add(status);
    }
    /**
     * Clear all tool steps and answer content
     */
    clearContent() {
        if (this.toolStatus) {
            this.toolStatus.innerHTML = '';
        }
        if (this.answerContainer) {
            this.answerContainer.innerHTML = '';
            this.answerContainer.style.display = 'none'; // Hide answer area initially
        }
        this.steps = [];
        this.lastQuestion = '';
        this.lastAnswer = '';
    }
    /**
     * Process a new question: show window, call API, display results.
     * @param question The user's question
     */
    async processQuestion(question) {
        if (this.processingQuestion || !this.container)
            return;
        this.processingQuestion = true;
        this.lastQuestion = question;
        this.currentQuestion = question;
        this.clearContent();
        this.show();
        const processingStep = this.addToolStep('Processing query...', 'active');
        try {
            // TODO: Add actual tool call steps/updates if the API provides them
            // For now, just simulate a call
            // this.addToolStep('Thinking...', 'active');
            // await new Promise(resolve => setTimeout(resolve, 500));
            // this.updateLastToolStep('completed');
            // Call the actual backend
            const answer = await window.api.askQuestion(question);
            this.lastAnswer = answer;
            this.currentAnswer = answer;
            this.updateLastToolStep('completed'); // Mark 'Processing query...' as completed
            // Display the answer
            if (this.answerContainer) {
                this.answerContainer.textContent = answer;
                this.answerContainer.style.display = 'block';
            }
        }
        catch (error) {
            console.error('Error processing question:', error);
            this.updateLastToolStep('error'); // Mark 'Processing query...' as error
            const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred.';
            this.addToolStep(`Error: ${errorMsg}`, 'error');
            // Optionally display error in answer container
            if (this.answerContainer) {
                this.answerContainer.textContent = `Error: ${errorMsg}`;
                this.answerContainer.style.display = 'block';
            }
        }
        finally {
            this.processingQuestion = false;
            // Optionally auto-hide after a delay?
            // setTimeout(() => this.hide(), 5000);
        }
    }
    /**
     * Returns the last question and answer processed by the mini window.
     */
    getLastInteraction() {
        return { question: this.lastQuestion, answer: this.lastAnswer };
    }
    /**
     * Called when the expand button is clicked.
     * Executes the registered callback with the current question and answer,
     * then hides the MiniWindow.
     */
    expandToFullChat() {
        console.log('Expand button clicked in MiniWindow');
        // Ensure callback exists AND we have a question and answer to pass
        if (this.onExpandCallback && this.currentQuestion !== null && this.currentAnswer !== null) {
            console.log('Calling expand callback with:', this.currentQuestion, this.currentAnswer);
            try {
                // Pass the stored question and answer to the callback provided by renderer.ts
                this.onExpandCallback(this.currentQuestion, this.currentAnswer); // *** FIXED: Pass arguments ***
            }
            catch (error) {
                console.error('Error executing expand callback:', error);
            }
            this.hide(); // Hide the mini-window after attempting expand
        }
        else {
            console.warn('Cannot expand: Expand callback not set or question/answer missing.', {
                hasCallback: !!this.onExpandCallback,
                hasQuestion: this.currentQuestion !== null,
                hasAnswer: this.currentAnswer !== null
            });
            // Still hide the window even if expansion fails to avoid leaving it orphaned
            this.hide();
        }
    }
}
exports.MiniWindow = MiniWindow;
