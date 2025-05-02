import '../../../src/types';

/**
 * AudioRecorder component - handles microphone access and recording with BlackHole integration
 */
export class AudioRecorder {
  private audioButton: HTMLElement | null = null;
  private isRecording: boolean = false;
  private audioDevices: any[] = [];
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
      
      // Find BlackHole device if available
      const blackholeDevice = this.audioDevices.find(device => device.isBlackHole);
      if (blackholeDevice) {
        this.selectedDeviceId = blackholeDevice.id;
        console.log('BlackHole device found:', blackholeDevice);
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
    
    window.api.on('audio-recording-stopped', (data: { filePath: string }) => {
      this.isRecording = false;
      this.updateAudioButtonState();
      this.updateStatus(`Recording saved to: ${data.filePath}`);
      
      setTimeout(() => {
        this.hideStatus();
      }, 3000);
    });
  }

  /**
   * Toggle audio recording on/off
   */
  private async toggleRecording(): Promise<void> {
    try {
      if (this.isRecording) {
        // Stop recording
        await window.api.stopAudioRecording();
      } else {
        // Start recording with the selected device (or default if none selected)
        await window.api.startAudioRecording(this.selectedDeviceId);
      }
    } catch (error) {
      console.error('Error toggling recording:', error);
      this.updateStatus('Error with recording', true);
    }
  }

  /**
   * Set up BlackHole as the system audio output
   */
  public async setupBlackhole(): Promise<void> {
    try {
      const result = await window.api.setupBlackhole();
      if (result) {
        this.updateStatus('BlackHole audio routing set up');
        setTimeout(() => {
          this.hideStatus();
        }, 3000);
      }
    } catch (error) {
      console.error('Error setting up BlackHole:', error);
      this.updateStatus('Failed to set up BlackHole', true);
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
  }

  /**
   * Hide the status message
   */
  private hideStatus(): void {
    if (!this.recordingStatus) return;
    
    this.recordingStatus.style.display = 'none';
  }
} 