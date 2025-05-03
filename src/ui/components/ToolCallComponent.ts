/**
 * ToolCallComponent - Handles the display and interaction for AI tool calls in the chat interface
 * Supports both viewing tool call results and human-in-the-loop approval
 */
export class ToolCallComponent {
  private container: HTMLElement;
  private toolName: string;
  private toolParameters: Record<string, any>;
  private status: 'pending' | 'approved' | 'rejected' | 'running' | 'completed' | 'error';
  private result: any;
  private needsApproval: boolean;
  private onApprove: (params: Record<string, any>) => void;
  private onReject: () => void;
  private element: HTMLElement | null = null;
  private paramInputs: Record<string, HTMLInputElement> = {};

  // SVG Icons
  private readonly icons = {
    spinner: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-circle spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`,
    error: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`,
    edit: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    terminal: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-terminal"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>`
  };

  constructor(
    container: HTMLElement,
    toolName: string,
    toolParameters: Record<string, any>,
    needsApproval: boolean = true,
    onApprove?: (params: Record<string, any>) => void,
    onReject?: () => void
  ) {
    this.container = container;
    this.toolName = toolName;
    this.toolParameters = toolParameters;
    this.status = needsApproval ? 'pending' : 'running';
    this.needsApproval = needsApproval;
    this.onApprove = onApprove || (() => {});
    this.onReject = onReject || (() => {});

    this.render();
  }

  /**
   * Create and render the tool call UI
   */
  private render(): void {
    this.element = document.createElement('div');
    this.element.className = `tool-call ${this.status}`;

    // Tool call header with name and icon
    const header = document.createElement('div');
    header.className = 'tool-call-header';
    
    const toolIcon = document.createElement('div');
    toolIcon.className = 'tool-icon';
    toolIcon.innerHTML = this.getIconForTool(this.toolName);
    
    const toolNameElement = document.createElement('div');
    toolNameElement.className = 'tool-name';
    toolNameElement.textContent = this.formatToolName(this.toolName);
    
    const statusIcon = document.createElement('div');
    statusIcon.className = 'tool-status-icon';
    statusIcon.innerHTML = this.getStatusIcon();
    
    header.appendChild(toolIcon);
    header.appendChild(toolNameElement);
    header.appendChild(statusIcon);
    
    this.element.appendChild(header);

    // Tool parameters section
    const paramsContainer = document.createElement('div');
    paramsContainer.className = 'tool-params';
    
    // Format parameters based on whether it needs approval or just display
    if (this.needsApproval && this.status === 'pending') {
      this.renderEditableParams(paramsContainer);
    } else {
      this.renderReadOnlyParams(paramsContainer);
    }
    
    this.element.appendChild(paramsContainer);

    // Action buttons for approval/rejection
    if (this.needsApproval && this.status === 'pending') {
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'tool-actions';
      
      const approveButton = document.createElement('button');
      approveButton.className = 'approve-button';
      approveButton.textContent = 'Approve';
      approveButton.addEventListener('click', () => this.handleApprove());
      
      const rejectButton = document.createElement('button');
      rejectButton.className = 'reject-button';
      rejectButton.textContent = 'Reject';
      rejectButton.addEventListener('click', () => this.handleReject());
      
      actionsContainer.appendChild(approveButton);
      actionsContainer.appendChild(rejectButton);
      
      this.element.appendChild(actionsContainer);
    }

    // Result section (only shown after completion)
    if (this.status === 'completed' || this.status === 'error') {
      this.renderResult();
    }

    // Add the entire element to the container
    this.container.appendChild(this.element);
  }

  /**
   * Renders editable parameter fields
   */
  private renderEditableParams(container: HTMLElement): void {
    const form = document.createElement('form');
    form.className = 'tool-params-form';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleApprove();
    });
    
    for (const [key, value] of Object.entries(this.toolParameters)) {
      const paramRow = document.createElement('div');
      paramRow.className = 'param-row';
      
      const label = document.createElement('label');
      label.textContent = this.formatParamName(key);
      label.htmlFor = `param-${key}`;
      
      const input = document.createElement('input');
      input.id = `param-${key}`;
      input.value = value !== null ? String(value) : '';
      input.name = key;
      
      // Store reference to input for later retrieval
      this.paramInputs[key] = input;
      
      paramRow.appendChild(label);
      paramRow.appendChild(input);
      form.appendChild(paramRow);
    }
    
    container.appendChild(form);
  }

  /**
   * Renders read-only parameter display
   */
  private renderReadOnlyParams(container: HTMLElement): void {
    const table = document.createElement('table');
    table.className = 'tool-params-table';
    
    for (const [key, value] of Object.entries(this.toolParameters)) {
      const row = document.createElement('tr');
      
      const keyCell = document.createElement('td');
      keyCell.className = 'param-key';
      keyCell.textContent = this.formatParamName(key);
      
      const valueCell = document.createElement('td');
      valueCell.className = 'param-value';
      
      // Format value based on type
      if (value === null) {
        valueCell.textContent = 'null';
        valueCell.classList.add('null-value');
      } else if (typeof value === 'object') {
        valueCell.textContent = JSON.stringify(value);
        valueCell.classList.add('json-value');
      } else {
        valueCell.textContent = String(value);
      }
      
      row.appendChild(keyCell);
      row.appendChild(valueCell);
      table.appendChild(row);
    }
    
    container.appendChild(table);
  }

  /**
   * Renders the result section
   */
  private renderResult(): void {
    if (!this.element || !this.result) return;
    
    const resultContainer = document.createElement('div');
    resultContainer.className = 'tool-result';
    
    const resultLabel = document.createElement('div');
    resultLabel.className = 'result-label';
    resultLabel.textContent = 'Result';
    
    const resultContent = document.createElement('div');
    resultContent.className = 'result-content';
    
    // Format result based on type
    if (typeof this.result === 'object') {
      resultContent.textContent = JSON.stringify(this.result, null, 2);
      resultContent.classList.add('json-result');
    } else {
      resultContent.textContent = String(this.result);
    }
    
    resultContainer.appendChild(resultLabel);
    resultContainer.appendChild(resultContent);
    
    this.element.appendChild(resultContainer);
  }

  /**
   * Handle approve button click
   */
  private handleApprove(): void {
    // Collect current parameters from inputs
    const currentParams: Record<string, any> = {};
    for (const [key, input] of Object.entries(this.paramInputs)) {
      currentParams[key] = input.value;
    }
    
    // Update UI state
    this.status = 'running';
    this.updateUI();
    
    // Call the callback with current parameters
    this.onApprove(currentParams);
  }

  /**
   * Handle reject button click
   */
  private handleReject(): void {
    this.status = 'rejected';
    this.updateUI();
    this.onReject();
  }

  /**
   * Update the tool call's status and UI
   */
  public updateStatus(
    status: 'pending' | 'approved' | 'rejected' | 'running' | 'completed' | 'error',
    result?: any
  ): void {
    this.status = status;
    if (result !== undefined) {
      this.result = result;
    }
    this.updateUI();
  }

  /**
   * Update the UI to reflect current state
   */
  private updateUI(): void {
    if (!this.element) return;
    
    // Update class
    this.element.className = `tool-call ${this.status}`;
    
    // Update status icon
    const statusIcon = this.element.querySelector('.tool-status-icon');
    if (statusIcon) {
      statusIcon.innerHTML = this.getStatusIcon();
    }
    
    // Remove action buttons if no longer pending
    if (this.status !== 'pending') {
      const actionsContainer = this.element.querySelector('.tool-actions');
      if (actionsContainer) {
        actionsContainer.remove();
      }
      
      // Replace editable params with read-only if approved or running
      if ((this.status === 'approved' || this.status === 'running') && this.needsApproval) {
        const paramsContainer = this.element.querySelector('.tool-params');
        if (paramsContainer) {
          paramsContainer.innerHTML = '';
          this.renderReadOnlyParams(paramsContainer as HTMLElement);
        }
      }
    }
    
    // Add result if completed or error  
    if ((this.status === 'completed' || this.status === 'error') && this.result) {
      // Remove any existing result first
      const existingResult = this.element.querySelector('.tool-result');
      if (existingResult) {
        existingResult.remove();
      }
      this.renderResult();
    }
  }

  /**
   * Get the appropriate icon for the current status
   */
  private getStatusIcon(): string {
    switch (this.status) {
      case 'pending':
        return ''; // No icon for pending
      case 'running':
        return this.icons.spinner;
      case 'completed':
        return this.icons.check;
      case 'error':
      case 'rejected':
        return this.icons.error;
      default:
        return '';
    }
  }

  /**
   * Get an appropriate icon for the tool type
   */
  private getIconForTool(toolName: string): string {
    // Simplified logic - could be expanded with more icons
    if (toolName.includes('terminal') || toolName.includes('cmd')) {
      return this.icons.terminal;
    }
    if (toolName.includes('edit') || toolName.includes('file')) {
      return this.icons.edit;
    }
    // Default tool icon
    return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tool"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
  }

  /**
   * Format tool name for display
   */
  private formatToolName(name: string): string {
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }

  /**
   * Format parameter name for display
   */
  private formatParamName(name: string): string {
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }

  /**
   * Remove this component from the DOM and clean up any resources
   */
  public destroy(): void {
    // Remove element from DOM if it exists
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    // Clear parameter inputs
    this.paramInputs = {};
    
    // Clear element reference
    this.element = null;
  }
} 