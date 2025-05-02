"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ChatBar_1 = require("./components/ChatBar");
const AudioRecorder_1 = require("./components/AudioRecorder");
/**
 * Initialize the UI when the DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the ChatBar component
    const chatBar = new ChatBar_1.ChatBar();
    // Initialize the AudioRecorder component
    const audioRecorder = new AudioRecorder_1.AudioRecorder();
    // Store in window for debugging purposes (can be removed in production)
    window.__chatBar = chatBar;
    window.__audioRecorder = audioRecorder;
});
