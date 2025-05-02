"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionProcessor = void 0;
/**
 * QuestionProcessor component - handles the mini question answering window with tool call status
 */
class QuestionProcessor {
    constructor() {
        this.container = null;
        this.isVisible = false;
        this.processingQuestion = false;
        this.toolStatus = null;
        this.answerContainer = null;
        this.currentToolStep = '';
        this.steps = [];
        this.closeButton = null;
        this.expandButton = null;
        this.createProcessorWindow();
        this.setupEventListeners();
    }
    /**
     * Create the mini processor window UI
     */
    createProcessorWindow() {
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'question-processor';
        this.container.style.display = 'none';
        // Create header
        const header = document.createElement('div');
        header.className = 'processor-header';
        // Add title
        const title = document.createElement('div');
        title.className = 'processor-title';
        title.textContent = 'Processing Question';
        header.appendChild(title);
        // Header actions container
        const headerActions = document.createElement('div');
        headerActions.className = 'processor-actions';
        // Add expand button with SVG
        this.expandButton = document.createElement('div');
        this.expandButton.className = 'processor-expand';
        this.expandButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19.1304 0.869565V5.21739C19.1304 5.69565 18.7391 6.08696 18.2609 6.08696C17.7826 6.08696 17.3913 5.69565 17.3913 5.21739V2.97826L12.3478 8.02174C12.1739 8.19565 11.9565 8.28261 11.7391 8.28261C11.5217 8.28261 11.3043 8.19565 11.1304 8.02174C10.7826 7.67391 10.7826 7.13043 11.1304 6.78261L16.1522 1.73913H13.913C13.4348 1.73913 13.0435 1.34783 13.0435 0.869565C13.0435 0.391304 13.4348 0 13.913 0H18.2609C18.5 0 18.7174 0.0869565 18.8696 0.26087C19.0435 0.413043 19.1304 0.630435 19.1304 0.869565ZM18.2609 13.0435C17.7826 13.0435 17.3913 13.4348 17.3913 13.913V16.1522L12.4348 11.2391C12.087 10.8913 11.5217 10.8913 11.1739 11.2391C10.8261 11.587 10.8261 12.1304 11.1522 12.4783L16.0652 17.3913H13.8261C13.3478 17.3913 12.9565 17.7826 12.9565 18.2609C12.9565 18.7391 13.3478 19.1304 13.8261 19.1304H18.1739C18.413 19.1304 18.6739 19.0435 18.8261 18.8696C19 18.6957 19.1304 18.4783 19.1304 18.2609V13.913C19.1304 13.4348 18.7391 13.0435 18.2609 13.0435ZM6.69565 11.1957L1.73913 16.1522V13.913C1.73913 13.4348 1.34783 13.0435 0.869565 13.0435C0.391304 13.0435 0 13.4348 0 13.913V18.2609C0 18.5 0.0869565 18.7174 0.26087 18.8696C0.434783 19.0435 0.652174 19.1304 0.891304 19.1304H5.23913C5.71739 19.1304 6.1087 18.7391 6.1087 18.2609C6.1087 17.7826 5.71739 17.3913 5.23913 17.3913H2.97826L7.93478 12.4348C8.28261 12.087 8.26087 11.5435 7.93478 11.1957C7.6087 10.8478 7.04348 10.8478 6.69565 11.1957ZM2.97826 1.82609H5.21739C5.69565 1.82609 6.08696 1.43478 6.08696 0.956522C6.08696 0.478261 5.69565 0.0869565 5.21739 0.0869565H0.869565C0.630435 0.0869565 0.413043 0.173913 0.26087 0.347826C0.0869565 0.5 0 0.717391 0 0.956522V5.30435C0 5.78261 0.391304 6.17391 0.869565 6.17391C1.34783 6.17391 1.73913 5.78261 1.73913 5.30435V3.04348L6.76087 8.06522C6.93478 8.23913 7.15217 8.32609 7.36957 8.32609C7.58696 8.32609 7.80435 8.23913 7.97826 8.06522C8.32609 7.71739 8.32609 7.17391 7.97826 6.82609L2.97826 1.82609Z" fill="white"/>
      </svg>
    `;
        headerActions.appendChild(this.expandButton);
        // Add close button
        this.closeButton = document.createElement('div');
        this.closeButton.className = 'processor-close';
        this.closeButton.innerHTML = '&times;';
        headerActions.appendChild(this.closeButton);
        header.appendChild(headerActions);
        this.container.appendChild(header);
        // Create content area
        const content = document.createElement('div');
        content.className = 'processor-content';
        // Tool status section
        this.toolStatus = document.createElement('div');
        this.toolStatus.className = 'tool-status';
        content.appendChild(this.toolStatus);
        // Answer container
        this.answerContainer = document.createElement('div');
        this.answerContainer.className = 'processor-answer';
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
        const styleId = 'question-processor-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
        .question-processor {
          position: fixed;
          bottom: 80px;
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
          transform: translateX(-50%) translateY(20px);
        }
        
        .processor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(24, 26, 27, 0.4);
        }
        
        .processor-title {
          font-weight: 500;
          font-size: 14px;
          color: var(--foreground);
        }
        
        .processor-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        
        .processor-expand,
        .processor-close {
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
        
        .processor-expand:hover,
        .processor-close:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: var(--foreground);
        }
        
        .processor-close {
          font-size: 18px;
        }
        
        .processor-content {
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
          transition: background-color 0.3s;
        }
        
        .tool-step.active {
          background-color: rgba(58, 143, 251, 0.2);
          border-left: 2px solid var(--primary);
        }
        
        .tool-step.completed {
          background-color: rgba(0, 0, 0, 0.15);
          color: var(--muted-foreground);
        }
        
        .step-icon {
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background-color: var(--secondary);
          color: var(--secondary-foreground);
          font-size: 10px;
        }
        
        .step-icon.completed {
          background-color: var(--primary);
        }
        
        .step-text {
          flex: 1;
        }
        
        .processor-answer {
          margin-top: 10px;
          padding: 12px;
          background-color: rgba(0, 0, 0, 0.15);
          border-radius: calc(var(--radius) - 4px);
          font-size: 14px;
          line-height: 1.5;
          color: var(--foreground);
        }
        
        .answer-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: var(--muted-foreground);
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
      `;
            document.head.appendChild(style);
        }
    }
    /**
     * Set up event listeners for the component
     */
    setupEventListeners() {
        // Close button
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => {
                this.hide();
            });
        }
        // Expand button
        if (this.expandButton) {
            this.expandButton.addEventListener('click', () => {
                this.expandView();
            });
        }
        // Allow clicking outside to close
        document.addEventListener('click', (e) => {
            if (this.isVisible && this.container && !this.container.contains(e.target)) {
                this.hide();
            }
        });
        // Prevent clicks inside from closing
        if (this.container) {
            this.container.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }
    /**
     * Expand the view to full chat
     */
    expandView() {
        // Hide this mini window
        this.hide();
        // Get the ChatBar instance from window and toggle expanded state
        if (window.__chatBar) {
            const chatBar = window.__chatBar;
            if (!chatBar.isExpanded) {
                chatBar.toggleExpandedState();
            }
        }
    }
    /**
     * Process a question and show tool steps
     */
    async processQuestion(question) {
        if (this.processingQuestion)
            return;
        this.processingQuestion = true;
        this.show();
        // Reset state
        this.steps = [];
        this.currentToolStep = '';
        if (this.toolStatus) {
            this.toolStatus.innerHTML = '';
        }
        if (this.answerContainer) {
            this.answerContainer.innerHTML = '<div class="answer-loading"><span class="dot-flashing"></span></div>';
        }
        // Simulate some tool steps for demo
        await this.addToolStep('Analyzing question');
        await new Promise(resolve => setTimeout(resolve, 800));
        await this.addToolStep('Searching knowledge base');
        await new Promise(resolve => setTimeout(resolve, 1200));
        await this.addToolStep('Generating response');
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Set the answer
        this.setAnswer('Here is the answer to your question about ' + question);
        // Mark as complete
        this.processingQuestion = false;
    }
    /**
     * Add a new tool step
     */
    async addToolStep(stepText) {
        // Complete the current step if there is one
        if (this.currentToolStep && this.toolStatus) {
            const currentStepEl = this.toolStatus.querySelector(`.tool-step[data-step="${this.currentToolStep}"]`);
            if (currentStepEl) {
                currentStepEl.classList.remove('active');
                currentStepEl.classList.add('completed');
                const icon = currentStepEl.querySelector('.step-icon');
                if (icon) {
                    icon.textContent = '✓';
                    icon.classList.add('completed');
                }
            }
        }
        // Add the new step
        this.steps.push(stepText);
        this.currentToolStep = stepText;
        // Create step element
        if (this.toolStatus) {
            const stepEl = document.createElement('div');
            stepEl.className = 'tool-step active';
            stepEl.setAttribute('data-step', stepText);
            const icon = document.createElement('div');
            icon.className = 'step-icon';
            icon.textContent = (this.steps.length).toString();
            const text = document.createElement('div');
            text.className = 'step-text';
            text.textContent = stepText;
            stepEl.appendChild(icon);
            stepEl.appendChild(text);
            this.toolStatus.appendChild(stepEl);
        }
    }
    /**
     * Set the answer content
     */
    setAnswer(answer) {
        if (this.answerContainer) {
            this.answerContainer.innerHTML = '';
            this.answerContainer.textContent = answer;
        }
    }
    /**
     * Show the processor window
     */
    show() {
        if (this.container) {
            this.container.style.display = 'flex';
            this.isVisible = true;
            // Add animation
            setTimeout(() => {
                if (this.container) {
                    this.container.style.opacity = '1';
                    this.container.style.transform = 'translateX(-50%) translateY(0)';
                }
            }, 10);
        }
    }
    /**
     * Hide the processor window
     */
    hide() {
        if (this.container) {
            this.container.style.opacity = '0';
            this.container.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => {
                if (this.container) {
                    this.container.style.display = 'none';
                    this.isVisible = false;
                }
            }, 300);
        }
    }
}
exports.QuestionProcessor = QuestionProcessor;
