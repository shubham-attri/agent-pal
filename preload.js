const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Question answering
  askQuestion: (question) => ipcRenderer.invoke('ask-question', question),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  toggleWindowSize: () => ipcRenderer.invoke('toggle-window-size'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // Chat management
  createNewChat: () => ipcRenderer.invoke('create-new-chat'),
  
  // Event listeners
  on: (channel, callback) => {
    // Whitelist channels
    const validChannels = ['new-chat'];
    if (validChannels.includes(channel)) {
      // Remove the event listener to avoid memory leaks
      ipcRenderer.removeAllListeners(channel);
      
      // Add a new listener
      ipcRenderer.on(channel, (_, ...args) => callback(...args));
      
      return () => {
        ipcRenderer.removeAllListeners(channel);
      };
    }
  }
}) 