// Define interface for exposed API
export interface IpcApi {
  askQuestion: (question: string) => Promise<string>;
  toggleWindowSize: () => void;
  createNewChat: () => void;
  hideWindow: () => void;
  openMainChat: () => void;
  on: (channel: string, callback: (...args: any[]) => void) => (() => void) | undefined;
  requestMicrophonePermission: () => Promise<boolean>;
  getAudioDevices: () => Promise<AudioDevice[]>;
  startAudioRecording: (deviceId?: string) => Promise<boolean>;
  stopAudioRecording: () => Promise<boolean>;
  toggleRecordingFromExternal: () => Promise<boolean>;
  getRecordingStatus: () => Promise<boolean>;
  sendChatMessage: (message: string) => Promise<{content: string, toolCalls?: ToolCall[]}>;
  sendToolCallResponse: (response: { id: string, action: 'approve' | 'reject', parameters?: Record<string, any> }) => Promise<any>;
}

// Audio device interface
export interface AudioDevice {
  id: string;
  name: string;
}

// Audio recording response interface
export interface AudioRecordingResponse {
  filePath: string;
  success?: boolean;
  error?: string;
}

/**
 * Tool Call related types
 */

export interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, any>;
  needsApproval?: boolean;
}

export interface ToolCallResult {
  id: string;
  status: 'completed' | 'error';
  result: any;
}

export type ToolCallStatus = 'pending' | 'approved' | 'rejected' | 'running' | 'completed' | 'error';

/**
 * Message types for chat interface
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCall[];
  timestamp: number;
}

// Add global type declaration for window.api
declare global {
  interface Window {
    api: IpcApi;
  }
}