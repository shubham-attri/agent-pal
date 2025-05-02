"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('api', {
    on: (channel, callback) => {
        // Whitelist channels
        const validChannels = [
            'new-chat',
            'audio-recording-started',
            'audio-recording-stopped'
        ];
        if (validChannels.includes(channel)) {
            const subscription = (_event, ...args) => callback(...args);
            electron_1.ipcRenderer.on(channel, subscription);
            // Return a function to remove the event listener
            return () => {
                electron_1.ipcRenderer.removeListener(channel, subscription);
            };
        }
        return undefined;
    },
    // General app functions
    askQuestion: (question) => electron_1.ipcRenderer.invoke('ask-question', question),
    toggleWindowSize: () => electron_1.ipcRenderer.send('toggle-window-size'),
    hideWindow: () => electron_1.ipcRenderer.send('hide-window'),
    createNewChat: () => electron_1.ipcRenderer.send('create-new-chat'),
    // Audio-related functions
    requestMicrophonePermission: () => electron_1.ipcRenderer.invoke('request-microphone-permission'),
    getAudioDevices: () => electron_1.ipcRenderer.invoke('get-audio-devices'),
    startAudioRecording: (deviceId) => electron_1.ipcRenderer.invoke('start-audio-recording', deviceId),
    stopAudioRecording: () => electron_1.ipcRenderer.invoke('stop-audio-recording'),
    // Toolbar recording functions
    toggleRecordingFromExternal: () => electron_1.ipcRenderer.invoke('toggle-recording-from-external'),
    getRecordingStatus: () => electron_1.ipcRenderer.invoke('get-recording-status')
});
