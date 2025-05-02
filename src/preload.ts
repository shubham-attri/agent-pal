import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Define API types
interface IpcApi {
  askQuestion: (question: string) => Promise<string>;
  minimizeWindow: () => Promise<void>;
  toggleWindowSize: () => Promise<void>;
  closeWindow: () => Promise<void>;
  createNewChat: () => Promise<{ success: boolean }>;
  on: (channel: string, callback: (...args: any[]) => void) => (() => void) | undefined;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Question answering
  askQuestion: (question: string) => ipcRenderer.invoke('ask-question', question),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  toggleWindowSize: () => ipcRenderer.invoke('toggle-window-size'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // Chat management
  createNewChat: () => ipcRenderer.invoke('create-new-chat'),
  
  // Event listeners
  on: (channel: string, callback: (...args: any[]) => void) => {
    // Whitelist channels
    const validChannels = ['new-chat'];
    if (validChannels.includes(channel)) {
      // Remove the event listener to avoid memory leaks
      ipcRenderer.removeAllListeners(channel);
      
      // Add a new listener
      ipcRenderer.on(channel, (_: IpcRendererEvent, ...args: any[]) => callback(...args));
      
      return () => {
        ipcRenderer.removeAllListeners(channel);
      };
    }
    return undefined;
  }
} as IpcApi);

// Add this to global types
declare global {
  interface Window {
    api: IpcApi;
  }
} 