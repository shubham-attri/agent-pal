"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('api', {
    // Question answering
    askQuestion: (question) => electron_1.ipcRenderer.invoke('ask-question', question),
    // Window controls
    minimizeWindow: () => electron_1.ipcRenderer.invoke('minimize-window'),
    toggleWindowSize: () => electron_1.ipcRenderer.invoke('toggle-window-size'),
    closeWindow: () => electron_1.ipcRenderer.invoke('close-window'),
    // Chat management
    createNewChat: () => electron_1.ipcRenderer.invoke('create-new-chat'),
    // Event listeners
    on: (channel, callback) => {
        // Whitelist channels
        const validChannels = ['new-chat'];
        if (validChannels.includes(channel)) {
            // Remove the event listener to avoid memory leaks
            electron_1.ipcRenderer.removeAllListeners(channel);
            // Add a new listener
            electron_1.ipcRenderer.on(channel, (_, ...args) => callback(...args));
            return () => {
                electron_1.ipcRenderer.removeAllListeners(channel);
            };
        }
        return undefined;
    }
});
