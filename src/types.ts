// Define interface for exposed API
export interface IpcApi {
  askQuestion: (question: string) => Promise<string>;
  toggleWindowSize: () => Promise<void>;
  createNewChat: () => Promise<{ success: boolean }>;
  on: (channel: string, callback: (...args: any[]) => void) => (() => void) | undefined;
  requestMicrophonePermission: () => Promise<boolean>;
  getAudioDevices: () => Promise<AudioDevice[]>;
  getAudioOutputDevices: () => Promise<AudioOutputDevice[]>;
  startAudioRecording: (deviceId?: string) => Promise<boolean>;
  stopAudioRecording: () => Promise<boolean>;
  setupBlackhole: (outputDeviceName?: string) => Promise<boolean>;
  toggleRecordingFromExternal: () => Promise<boolean>;
  getRecordingStatus: () => Promise<boolean>;
}

// Audio device interface
export interface AudioDevice {
  id: string;
  name: string;
  isBlackHole: boolean;
}

// Audio output device interface
export interface AudioOutputDevice {
  id: string;
  name: string;
  isBlackHole: boolean;
  isDefault: boolean;
}

// Audio recording response interface
export interface AudioRecordingResponse {
  filePath: string;
  success?: boolean;
  error?: string;
}

// Add global type declaration for window.api
declare global {
  interface Window {
    api: IpcApi;
  }
} 