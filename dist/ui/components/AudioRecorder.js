"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioRecorder = void 0;
require("../../../src/types");
/**
 * AudioRecorder component - handles microphone access and recording with BlackHole integration
 */
class AudioRecorder {
    constructor() {
        this.audioButton = null;
        this.isRecording = false;
        this.audioDevices = [];
        this.selectedDeviceId = '';
        this.recordingStatus = null;
        // Initialize the component
        this.createAudioButton();
        this.init();
    }
    /**
     * Initialize the AudioRecorder component
     */
    async init() {
        try {
            // Request microphone permission
            const permission = await window.api.requestMicrophonePermission();
            if (!permission) {
                console.error('Microphone permission denied');
                this.updateStatus('Microphone permission denied', true);
                return;
            }
            // Get available audio devices
            this.audioDevices = await window.api.getAudioDevices();
            console.log('Available audio devices:', this.audioDevices);
            // Find BlackHole device if available
            const blackholeDevice = this.audioDevices.find(device => device.isBlackHole);
            if (blackholeDevice) {
                this.selectedDeviceId = blackholeDevice.id;
                console.log('BlackHole device found:', blackholeDevice);
            }
            // Set up event listeners
            this.setupEventListeners();
            this.setupBlackholeEventListeners();
        }
        catch (error) {
            console.error('Error initializing audio recorder:', error);
            this.updateStatus('Error initializing audio', true);
        }
    }
    /**
     * Create the audio button in the UI
     */
    createAudioButton() {
        // The audio button already exists in the UI as the audio-icon
        this.audioButton = document.querySelector('.audio-icon');
        if (!this.audioButton) {
            console.error('Audio button element not found');
            return;
        }
        // Create a status element to show recording state
        this.recordingStatus = document.createElement('div');
        this.recordingStatus.className = 'recording-status';
        this.recordingStatus.style.display = 'none';
        // Add the recording status element after the search bar
        const searchBar = document.querySelector('.search-bar');
        if (searchBar && searchBar.parentNode) {
            searchBar.parentNode.insertBefore(this.recordingStatus, searchBar.nextSibling);
        }
    }
    /**
     * Set up event listeners for the audio functions
     */
    setupEventListeners() {
        // Toggle recording when audio button is clicked
        if (this.audioButton) {
            this.audioButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleRecording();
            });
        }
        // Listen for recording events from main process
        window.api.on('audio-recording-started', () => {
            this.isRecording = true;
            this.updateAudioButtonState();
            this.updateStatus('Recording in progress');
        });
        window.api.on('audio-recording-stopped', (data) => {
            this.isRecording = false;
            this.updateAudioButtonState();
            if (data.error) {
                this.updateStatus(`Recording failed: ${data.error}`, true);
            }
            else if (data.success === false) {
                this.updateStatus('Recording failed. Check console for details.', true);
            }
            else {
                this.updateStatus(`Recording saved to: ${data.filePath}`);
            }
            setTimeout(() => {
                this.hideStatus();
            }, 5000); // Show status for longer time (5 seconds)
        });
    }
    /**
     * Toggle audio recording on/off
     */
    async toggleRecording() {
        try {
            if (this.isRecording) {
                // Stop recording
                this.updateStatus('Stopping recording...');
                await window.api.stopAudioRecording();
            }
            else {
                // Start recording with the selected device (or default if none selected)
                this.updateStatus('Starting recording...');
                const result = await window.api.startAudioRecording(this.selectedDeviceId);
                if (!result) {
                    this.updateStatus('Failed to start recording', true);
                }
            }
        }
        catch (error) {
            console.error('Error toggling recording:', error);
            this.updateStatus(error instanceof Error ? error.message : 'Error with recording', true);
        }
    }
    /**
     * Set up BlackHole as the system audio output
     */
    async setupBlackhole(outputDeviceName) {
        try {
            this.updateStatus('Setting up BlackHole audio routing...');
            const result = await window.api.setupBlackhole(outputDeviceName);
            // Get the list of available output devices for future selections
            const outputDevices = await window.api.getAudioOutputDevices();
            console.log('Available output devices:', outputDevices);
            if (result) {
                const deviceLabel = outputDeviceName || 'default speakers';
                this.updateStatus(`Audio routing set up: sending to both BlackHole and ${deviceLabel}`);
                // Get updated device list which should now include BlackHole
                this.audioDevices = await window.api.getAudioDevices();
                // Find BlackHole device if available
                const blackholeDevice = this.audioDevices.find(device => device.isBlackHole);
                if (blackholeDevice) {
                    this.selectedDeviceId = blackholeDevice.id;
                    console.log('BlackHole device found and selected:', blackholeDevice);
                }
                else {
                    this.updateStatus('BlackHole device configured but not detected in device list', true);
                }
            }
            else {
                this.updateStatus('Failed to set up BlackHole - please install BlackHole audio driver', true);
            }
            setTimeout(() => {
                this.hideStatus();
            }, 5000);
        }
        catch (error) {
            console.error('Error setting up BlackHole:', error);
            this.updateStatus('Failed to set up BlackHole - do you have it installed?', true);
        }
    }
    /**
     * Set up event listeners for blackhole complete events
     */
    setupBlackholeEventListeners() {
        window.api.on('blackhole-setup-complete', (data) => {
            if (data.success) {
                const deviceLabel = data.deviceName || 'default speakers';
                this.updateStatus(`Audio routing set up: sending to both BlackHole and ${deviceLabel}`);
            }
            else {
                this.updateStatus(`Failed to set up audio routing: ${data.error || 'Unknown error'}`, true);
            }
            setTimeout(() => {
                this.hideStatus();
            }, 5000);
        });
    }
    /**
     * Update the audio button appearance based on recording state
     */
    updateAudioButtonState() {
        if (!this.audioButton)
            return;
        if (this.isRecording) {
            // Change to recording state (red color)
            this.audioButton.classList.add('recording');
        }
        else {
            // Change back to normal state
            this.audioButton.classList.remove('recording');
        }
    }
    /**
     * Update the status message
     */
    updateStatus(message, isError = false) {
        if (!this.recordingStatus)
            return;
        this.recordingStatus.textContent = message;
        this.recordingStatus.style.display = 'block';
        if (isError) {
            this.recordingStatus.classList.add('error');
        }
        else {
            this.recordingStatus.classList.remove('error');
        }
    }
    /**
     * Hide the status message
     */
    hideStatus() {
        if (!this.recordingStatus)
            return;
        this.recordingStatus.style.display = 'none';
    }
}
exports.AudioRecorder = AudioRecorder;
