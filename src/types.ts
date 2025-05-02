// Define interface for exposed API
export interface IpcApi {
  askQuestion: (question: string) => Promise<string>;
  toggleWindowSize: () => Promise<void>;
  createNewChat: () => Promise<{ success: boolean }>;
  on: (channel: string, callback: (...args: any[]) => void) => (() => void) | undefined;
  requestMicrophonePermission: () => Promise<boolean>;
  getAudioDevices: () => Promise<any[]>;
  startAudioRecording: (deviceId?: string) => Promise<boolean>;
  stopAudioRecording: () => Promise<boolean>;
  setupBlackhole: () => Promise<boolean>;
}

// Add global type declaration for window.api
declare global {
  interface Window {
    api: IpcApi;
  }
} 