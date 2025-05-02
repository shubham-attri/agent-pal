import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    on: (channel: string, callback: (...args: any[]) => void) => {
      // Whitelist channels
      const validChannels = [
        'new-chat',
        'audio-recording-started', 
        'audio-recording-stopped'
      ];
      if (validChannels.includes(channel)) {
        const subscription = (_event: any, ...args: any[]) => callback(...args);
        ipcRenderer.on(channel, subscription);
        
        // Return a function to remove the event listener
        return () => {
          ipcRenderer.removeListener(channel, subscription);
        };
      }
      return undefined;
    },
    
    // General app functions
    askQuestion: (question: string) => ipcRenderer.invoke('ask-question', question),
    toggleWindowSize: () => ipcRenderer.send('toggle-window-size'),
    hideWindow: () => ipcRenderer.send('hide-window'),
    createNewChat: () => ipcRenderer.send('create-new-chat'),
    
    // Audio-related functions
    requestMicrophonePermission: () => ipcRenderer.invoke('request-microphone-permission'),
    getAudioDevices: () => ipcRenderer.invoke('get-audio-devices'),
    startAudioRecording: (deviceId?: string) => ipcRenderer.invoke('start-audio-recording', deviceId),
    stopAudioRecording: () => ipcRenderer.invoke('stop-audio-recording'),
    
    // Toolbar recording functions
    toggleRecordingFromExternal: () => ipcRenderer.invoke('toggle-recording-from-external'),
    getRecordingStatus: () => ipcRenderer.invoke('get-recording-status')
  }
);