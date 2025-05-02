import '../../../src/types';
import { AudioDevice, AudioRecordingResponse } from '../../../src/types';

/**
 * AudioRecorder component - handles microphone access and recording
 */
export class AudioRecorder {
  private audioButton: HTMLElement | null = null;
  private isRecording: boolean = false;
  private audioDevices: AudioDevice[] = [];
  private selectedDeviceId: string = '';
  private recordingStatus: HTMLElement | null = null;

  constructor() {
    // Initialize the component
    this.createAudioButton();
    this.init();
  }

  /**
   * Initialize the AudioRecorder component
   */
  private async init(): Promise<void> {
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
      
      // Find default microphone or first available device
      const defaultMic = this.audioDevices.find(device => 
        device.name.includes('Microphone') || 
        device.name.includes('mic'));
      
      if (defaultMic) {
        this.selectedDeviceId = defaultMic.id;
        console.log('Selected microphone device:', defaultMic);
      } else if (this.audioDevices.length > 0) {
        this.selectedDeviceId = this.audioDevices[0].id;
        console.log('No specific microphone found, using first device:', this.audioDevices[0]);
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Error initializing audio recorder:', error);
      this.updateStatus('Error initializing audio', true);
    }
  }

  /**
   * Create the audio button in the UI
   */
  private createAudioButton(): void {
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
  private setupEventListeners(): void {
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
    
    window.api.on('audio-recording-stopped', (data: AudioRecordingResponse) => {
      this.isRecording = false;
      this.updateAudioButtonState();
      
      if (data.error) {
        this.updateStatus(`Recording failed: ${data.error}`, true);
        console.error('Recording error:', data.error);
      } else if (data.success === false) {
        this.updateStatus('Recording failed. Could not save file.', true);
        console.error('Recording failed without specific error');
      } else {
        // Create a shorter path for display
        const pathParts = data.filePath.split('/');
        const folderName = pathParts[pathParts.length - 1];
        const shortPath = folderName ? `.../${folderName}` : data.filePath;
        
        this.updateStatus(`Recording saved to: ${shortPath}`);
        console.log(`Recording successfully saved to ${data.filePath}`);
        
        // Add a notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Recording Saved', {
            body: `Your recording has been saved to ${shortPath}`,
            icon: '../../assets/PAL Logo.png'
          });
        }
      }
      
      // Show status for longer time (8 seconds)
      setTimeout(() => {
        this.hideStatus();
      }, 8000);
    });
    
    // Request notification permission
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }

  /**
   * Toggle audio recording on/off
   */
  private async toggleRecording(): Promise<void> {
    try {
      if (this.isRecording) {
        // Stop recording
        this.updateStatus('Stopping recording...');
        await window.api.stopAudioRecording();
      } else {
        // Start recording with the selected device (or default if none selected)
        this.updateStatus('Starting recording...');
        const result = await window.api.startAudioRecording(this.selectedDeviceId);
        
        if (!result) {
          this.updateStatus('Failed to start recording', true);
        }
      }
    } catch (error) {
      console.error('Error toggling recording:', error);
      this.updateStatus(error instanceof Error ? error.message : 'Error with recording', true);
    }
  }

  /**
   * Update the audio button appearance based on recording state
   */
  private updateAudioButtonState(): void {
    if (!this.audioButton) return;
    
    if (this.isRecording) {
      // Change to recording state (red color)
      this.audioButton.classList.add('recording');
    } else {
      // Change back to normal state
      this.audioButton.classList.remove('recording');
    }
  }

  /**
   * Update the status message
   */
  private updateStatus(message: string, isError: boolean = false): void {
    if (!this.recordingStatus) return;
    
    this.recordingStatus.textContent = message;
    this.recordingStatus.style.display = 'block';
    
    if (isError) {
      this.recordingStatus.classList.add('error');
    } else {
      this.recordingStatus.classList.remove('error');
    }

    // Add styles for the status message if not already added
    const styleId = 'recording-status-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .recording-status {
          position: absolute;
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          transition: opacity 0.3s ease;
          z-index: 1000;
        }
        .recording-status.error {
          background-color: rgba(220, 53, 69, 0.9);
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Hide the status message
   */
  private hideStatus(): void {
    if (!this.recordingStatus) return;
    
    this.recordingStatus.style.display = 'none';
  }
} 