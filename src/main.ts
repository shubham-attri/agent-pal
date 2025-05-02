import { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, nativeImage, screen, Rectangle, systemPreferences, desktopCapturer } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting: boolean = false;
let audioRecording: boolean = false;
let audioProcess: any = null;

// Window dimensions and positions
interface WindowConfig {
  width: number;
  height: number;
  resizable: boolean;
}

interface WindowConfigs {
  small: WindowConfig;
  full: WindowConfig;
}

const windowConfig: WindowConfigs = {
  small: {
    width: 600,  // Reduced width to match the chatbar
    height: 53,  // Height remains the same
    resizable: false
  },
  full: {
    width: 600,  // Keep consistent with small width
    height: 500,
    resizable: true
  }
};

// Define audio recording path more directly to save in Agent Pal folder
const appDir = app.getAppPath();
const recordingsDir = path.join(appDir, 'recordings');

// Create recordings directory if it doesn't exist
function ensureRecordingsDirExists(): void {
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }
  console.log(`Recordings will be saved to: ${recordingsDir}`);
}

function createWindow(): void {
  // Get display size
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  // Create the browser window with small dimensions
  mainWindow = new BrowserWindow({
    width: windowConfig.small.width,
    height: windowConfig.small.height,
    resizable: windowConfig.small.resizable,
    frame: false, // Frameless window for a cleaner look
    skipTaskbar: false, // Show in taskbar/dock
    transparent: true, // Make window transparent
    alwaysOnTop: true, // Keep window on top
    icon: path.join(__dirname, '../assets', 'PAL Logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Set the app dock icon on macOS
  if (process.platform === 'darwin') {
    app.dock.setIcon(nativeImage.createFromPath(path.join(__dirname, '../assets', 'PAL Logo.png')));
  }

  // Position window at the bottom center of the screen (above dock)
  positionWindowAboveDock(mainWindow, windowConfig.small.width, windowConfig.small.height);

  mainWindow.loadFile(path.join(__dirname, '../src/ui/index.html'));
  
  // Hide the window when close is clicked, don't quit the app
  mainWindow.on('close', (event) => {
    if (!isQuitting && mainWindow) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });
}

// Position the window above the dock
function positionWindowAboveDock(window: BrowserWindow, width: number, height: number): void {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  // Position at bottom center, 100px above the bottom edge (which should be above dock)
  window.setPosition(
    Math.floor(screenWidth / 2 - width / 2),
    Math.floor(screenHeight - height - 100)
  );
}

function createTray(): void {
  // Try to use both PNG and SVG for best compatibility
  let trayIcon: Electron.NativeImage; 
  
  // Try PNG first (often works better for tray icons)
  const pngPath = path.join(__dirname, '../assets', 'PAL Logo.png');
  const svgPath = path.join(__dirname, '../assets', 'PAL Logo.svg');
  
  try {
    if (fs.existsSync(pngPath)) {
      console.log('Loading tray icon from PNG:', pngPath);
      trayIcon = nativeImage.createFromPath(pngPath);
      
      // Resize for tray icon (platform specific sizes)
      if (process.platform === 'darwin') {
        // macOS prefers 16x16 or 22x22 template images
        trayIcon = trayIcon.resize({ width: 22, height: 22 });
        trayIcon.setTemplateImage(true);
      } else {
        // Windows/Linux typically use larger icons
        trayIcon = trayIcon.resize({ width: 16, height: 16 });
      }
    } 
    else if (fs.existsSync(svgPath)) {
      console.log('Loading tray icon from SVG:', svgPath);
      trayIcon = nativeImage.createFromPath(svgPath);
      trayIcon.setTemplateImage(true); // For better macOS integration
    } 
    else {
      console.warn('No icon files found. Using fallback icon.');
      // Create a fallback icon
      trayIcon = nativeImage.createEmpty().resize({ width: 16, height: 16 });
    }
  } catch (error) {
    console.error('Error loading icon:', error);
    trayIcon = nativeImage.createEmpty().resize({ width: 16, height: 16 });
  }
  
  tray = new Tray(trayIcon);
  
  // Create the context menu with recording options
  updateTrayMenu();
  
  // Toggle window on tray icon click
  tray.on('click', () => {
    toggleWindow();
  });
}

// Open the recordings folder in system file explorer
function openRecordingsFolder(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      ensureRecordingsDirExists();
      
      // Use shell.openPath which is the recommended way in Electron
      const { shell } = require('electron');
      shell.openPath(recordingsDir)
        .then(() => {
          console.log(`Opened recordings folder: ${recordingsDir}`);
          resolve(true);
        })
        .catch((err: Error) => {
          console.error('Failed to open recordings folder:', err);
          reject(err);
        });
    } catch (error) {
      console.error('Error opening recordings folder:', error);
      reject(error);
    }
  });
}

// Update the tray menu to show the current recording state
function updateTrayMenu(): void {
  if (!tray) return;
  
  const recordingLabel = audioRecording 
    ? 'Stop Recording' 
    : 'Start Recording';
  
  // Create a simple menu without BlackHole options
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open Agent Pal', 
      click: () => {
        showWindow();
      }
    },
    { 
      label: 'New Chat', 
      click: () => {
        showWindow();
        // Tell renderer to create new chat
        if (mainWindow) {
          mainWindow.webContents.send('new-chat');
        }
      }
    },
    { type: 'separator' },
    {
      label: recordingLabel,
      click: () => {
        toggleRecording();
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  if (tray) {
    tray.setToolTip('Agent Pal');
    tray.setContextMenu(contextMenu);
  }
}

// Toggle recording from the tray menu
async function toggleRecording(): Promise<void> {
  try {
    if (audioRecording) {
      const success = await stopAudioRecording();
      
      if (!success && mainWindow) {
        mainWindow.webContents.send('show-error', {
          title: 'Recording Error',
          message: 'Failed to stop recording properly. Check console for details.'
        });
      }
    } else {
      // Get the default device or the last selected one
      const deviceId = ''; // Use default device
      const success = await startAudioRecording(deviceId);
      
      if (!success && mainWindow) {
        mainWindow.webContents.send('show-error', {
          title: 'Recording Error',
          message: 'Failed to start audio recording. Check console for details.'
        });
      }
    }
    
    // Update the tray menu to reflect the new state
    updateTrayMenu();
    
  } catch (error) {
    console.error('Error toggling recording from tray:', error);
    
    if (mainWindow) {
      mainWindow.webContents.send('show-error', {
        title: 'Recording Error',
        message: error instanceof Error ? error.message : 'Unknown error toggling recording'
      });
    }
  }
}

function toggleWindow(): void {
  if (!mainWindow) return;
  
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    showWindow();
  }
}

function showWindow(): void {
  if (!mainWindow) return;
  
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  mainWindow.focus();
}

function toggleWindowSize(): void {
  if (!mainWindow) return;
  
  const currentSize = mainWindow.getSize();
  const isSmall = currentSize[0] === windowConfig.small.width && currentSize[1] === windowConfig.small.height;

  if (isSmall) {
    // Switch to large size
    mainWindow.setSize(windowConfig.full.width, windowConfig.full.height);
    // Position window with the same horizontal center, but higher up
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    mainWindow.setPosition(
      Math.floor(screenWidth / 2 - windowConfig.full.width / 2),
      Math.floor(screenHeight - windowConfig.full.height - 120)
    );
    mainWindow.setResizable(windowConfig.full.resizable);
  } else {
    // Switch to small size
    mainWindow.setSize(windowConfig.small.width, windowConfig.small.height);
    // Position in center above dock
    positionWindowAboveDock(mainWindow, windowConfig.small.width, windowConfig.small.height);
    mainWindow.setResizable(windowConfig.small.resizable);
  }
}

function registerShortcuts(): void {
  // Register global shortcut to show/hide window (Alt+Space or Option+Space)
  globalShortcut.register('Alt+Space', () => {
    toggleWindow();
  });
  
  // Add additional shortcut for Mac users
  globalShortcut.register('Option+Space', () => {
    toggleWindow();
  });
}

// Audio related functions
function requestMicrophonePermission(): Promise<boolean> {
  if (process.platform !== 'darwin') {
    return Promise.resolve(true); // Skip permission check on non-macOS
  }
  
  return systemPreferences.askForMediaAccess('microphone')
    .then(granted => {
      console.log('Microphone permission:', granted ? 'granted' : 'denied');
      return granted;
    })
    .catch(err => {
      console.error('Error requesting microphone permission:', err);
      return false;
    });
}

// Get available audio devices including BlackHole
async function getAudioDevices(): Promise<any[]> {
  try {
    // Instead of using desktopCapturer for audio sources,
    // we'll execute a command to list audio devices
    const command = 'system_profiler';
    const args = ['SPAudioDataType'];
    
    return new Promise((resolve, reject) => {
      const process = spawn(command, args);
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          // Parse the output to find audio devices
          const devices = parseAudioDevices(stdout);
          resolve(devices);
        } else {
          console.error(`Error getting audio devices: ${stderr}`);
          reject(new Error(stderr));
        }
      });
    });
  } catch (error) {
    console.error('Failed to get audio devices:', error);
    return [];
  }
}

// Helper function to parse audio device output
function parseAudioDevices(output: string): any[] {
  const devices = [];
  
  // Look for BlackHole and other audio devices
  const lines = output.split('\n');
  let currentDevice: any = null;
  
  for (const line of lines) {
    if (line.includes('Name:')) {
      if (currentDevice) {
        devices.push(currentDevice);
      }
      
      const name = line.replace('Name:', '').trim();
      currentDevice = { name, id: name, isBlackHole: name.includes('BlackHole') };
    }
  }
  
  // Add the last device if it exists
  if (currentDevice) {
    devices.push(currentDevice);
  }
  
  return devices;
}

// Interface for recording session data
interface RecordingSession {
  path: string;
  timestamp: string;
  files: string[];
}

// Use a module-level variable instead of global
let currentRecordingSession: RecordingSession | null = null;

// Start recording audio
function startAudioRecording(deviceId: string = ''): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    if (audioRecording) {
      resolve(true);
      return;
    }

    ensureRecordingsDirExists();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // Store recordings in a subfolder for this session
    const sessionDir = path.join(recordingsDir, timestamp);
    
    // Ensure session directory exists with proper permissions
    try {
      // Use synchronous mkdir with explicit permissions
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true, mode: 0o777 });
        console.log(`Created recording session directory: ${sessionDir}`);
        
        // Also set permissions explicitly as a fallback
        fs.chmodSync(sessionDir, 0o777);
      } else {
        console.log(`Session directory already exists: ${sessionDir}`);
      }
      
      // Store current session path in module-level variable
      currentRecordingSession = {
        path: sessionDir,
        timestamp: timestamp,
        files: []
      };
    } catch (error) {
      console.error(`Failed to create session directory: ${error}`);
      reject(error);
      return;
    }
    
    // Create absolute file path for microphone audio
    const micAudioFile = path.resolve(sessionDir, 'microphone.wav');
    if (currentRecordingSession) {
      currentRecordingSession.files.push(micAudioFile);
    }
    
    console.log(`Will save recording to: ${micAudioFile}`);
    
    try {
      // First get a list of available audio devices
      const availableDevices = await getAudioDevices();
      console.log('Available audio devices for recording:', availableDevices.map(d => d.name).join(', '));
      
      // Specifically look for available input devices with ffmpeg
      console.log('Listing available audio devices for ffmpeg:');
      const listProcess = spawn('ffmpeg', ['-f', 'avfoundation', '-list_devices', 'true', '-i', '']);
      
      let deviceList = '';
      listProcess.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        deviceList += output;
        console.log(`ffmpeg device list: ${output}`);
      });
      
      // Wait for listing to complete
      await new Promise(resolve => {
        listProcess.on('close', () => resolve(null));
      });
      
      // Parse the ffmpeg device list to get device indices
      let microphoneIndex = '';
      
      const deviceEntries = deviceList.split('\n')
        .filter(line => line.match(/\[\d+\]/))
        .map(line => {
          const match = line.match(/\[(\d+)\] (.*)/);
          return match ? { index: match[1], name: match[2].trim() } : null;
        })
        .filter(entry => entry !== null);
      
      console.log('Detected devices:', deviceEntries);
      
      // Find microphone device (either user-selected or default)
      let micDevice = null;
      if (deviceId) {
        micDevice = deviceEntries.find(d => d?.name === deviceId);
      } else {
        // Try to find a microphone device
        micDevice = deviceEntries.find(d => 
          d?.name.includes('Microphone') || 
          d?.name.includes('mic') || 
          (d?.name.includes('Built-in') && !d?.name.includes('Output'))
        );
      }
      
      if (micDevice) {
        microphoneIndex = micDevice.index;
        console.log(`Found microphone device at index: ${microphoneIndex}`);
      }
      
      // Start recording microphone
      if (microphoneIndex) {
        // Important: Format as ":index" to specify audio-only recording
        const micArgs = [
          '-f', 'avfoundation',
          '-i', `:${microphoneIndex}`, // Prefix with : to specify audio-only
          '-ac', '2',         // 2 audio channels (stereo) for better sound quality
          '-ar', '48000',     // 48 kHz sample rate (professional standard)
          '-acodec', 'pcm_s24le', // 24-bit depth for better dynamic range
          
          // Add audio filters for improved quality
          '-af', 'highpass=f=50,lowpass=f=15000,volume=1.5,afftdn=nf=-25', // Noise reduction and filters
          
          '-y',               // Overwrite output file if it exists
          '-loglevel', 'info',// More detailed logging
          micAudioFile
        ];
        
        console.log(`Starting microphone recording: ffmpeg ${micArgs.join(' ')}`);
        
        // Explicitly set audio only recording flag
        audioProcess = spawn('ffmpeg', micArgs, {
          env: { ...process.env, FFREPORT: 'file=mic_recording.log' }
        });
        
        audioProcess.stderr.on('data', (data: Buffer) => {
          console.log(`Microphone audio info: ${data.toString()}`);
        });
        
        audioProcess.on('error', (err: Error) => {
          console.error(`Microphone audio error: ${err.message}`);
          audioRecording = false;
          audioProcess = null;
          
          if (mainWindow) {
            mainWindow.webContents.send('audio-recording-stopped', { 
              filePath: sessionDir,
              error: err.message
            });
          }
          
          updateTrayMenu();
          reject(err);
        });
        
        audioProcess.on('close', (code: number) => {
          console.log(`Microphone recording process exited with code ${code}`);
          
          // Don't reset the state here - let stopAudioRecording handle it
          // This prevents potential race conditions
          
          // IMPORTANT: Never clean up directories during normal closing
          if (code === 255 || code === 0) {
            console.log('Recording process closed normally, keeping files');
            // Do nothing - keep the recording files
          } else if (!audioRecording && code !== 0 && code !== 255) {
            console.log(`Recording failed with error code ${code}, cleaning up`);
            try {
              // Don't delete the directory, just log that there was an error
              console.error(`Recording failed with code ${code}`);
            } catch (err) {
              console.error(`Error while handling recording failure: ${err}`);
            }
          }
        });
        
        audioRecording = true;
        
        if (mainWindow) {
          mainWindow.webContents.send('audio-recording-started');
        }

        // Create a README file in the recordings folder with info
        const readmeContent = `
Recording Session: ${timestamp}
------------------------------
This folder contains audio recordings captured by Agent Pal:

- microphone.wav: Audio captured from your microphone (index: ${microphoneIndex || '0 (default)'})

Available devices detected by ffmpeg:
${deviceEntries.map(d => `- [${d?.index}] ${d?.name}`).join('\n')}

Available audio devices:
${availableDevices.length > 0 
  ? availableDevices.map(d => `- ${d.name}`).join('\n') 
  : '- No devices detected from system'}
`;
        
        fs.writeFileSync(path.join(sessionDir, 'README.txt'), readmeContent);
        
        resolve(true);
      } else {
        // Fallback: Try direct recording with default audio device
        console.log('No specific microphone found, using default audio device');
        
        const fallbackArgs = [
          '-f', 'avfoundation',
          '-i', ':0', // Use the default audio device with audio-only format
          '-ac', '2',         // 2 audio channels (stereo) for better sound quality
          '-ar', '48000',     // 48 kHz sample rate (professional standard)
          '-acodec', 'pcm_s24le', // 24-bit depth for better dynamic range
          
          // Add audio filters for improved quality
          '-af', 'highpass=f=50,lowpass=f=15000,volume=1.5,afftdn=nf=-25', // Noise reduction and filters
          
          '-y',               // Overwrite output file if it exists
          '-loglevel', 'info',// More detailed logging
          micAudioFile
        ];
        
        console.log(`Starting fallback audio recording: ffmpeg ${fallbackArgs.join(' ')}`);
        
        audioProcess = spawn('ffmpeg', fallbackArgs);
        
        audioProcess.stderr.on('data', (data: Buffer) => {
          console.log(`Fallback audio info: ${data.toString()}`);
        });
        
        audioProcess.on('error', (err: Error) => {
          console.error(`Fallback audio error: ${err.message}`);
          audioRecording = false;
          audioProcess = null;
          
          if (mainWindow) {
            mainWindow.webContents.send('audio-recording-stopped', { 
              filePath: sessionDir,
              error: err.message
            });
          }
          
          updateTrayMenu();
          reject(err);
        });
        
        audioProcess.on('close', (code: number) => {
          console.log(`Microphone recording process exited with code ${code}`);
          
          // Don't reset the state here - let stopAudioRecording handle it
          // This prevents potential race conditions
          
          // IMPORTANT: Never clean up directories during normal closing
          if (code === 255 || code === 0) {
            console.log('Recording process closed normally, keeping files');
            // Do nothing - keep the recording files
          } else if (!audioRecording && code !== 0 && code !== 255) {
            console.log(`Recording failed with error code ${code}, cleaning up`);
            try {
              // Don't delete the directory, just log that there was an error
              console.error(`Recording failed with code ${code}`);
            } catch (err) {
              console.error(`Error while handling recording failure: ${err}`);
            }
          }
        });
        
        audioRecording = true;
        
        if (mainWindow) {
          mainWindow.webContents.send('audio-recording-started');
        }
        
        // Create a README file in the recordings folder with info
        const readmeContent = `
Recording Session: ${timestamp}
------------------------------
This folder contains audio recordings captured by Agent Pal:

- microphone.wav: Audio captured from your microphone (default)

Available devices detected by ffmpeg:
${deviceEntries.map(d => `- [${d?.index}] ${d?.name}`).join('\n')}

Available audio devices:
${availableDevices.length > 0 
  ? availableDevices.map(d => `- ${d.name}`).join('\n') 
  : '- No devices detected from system'}
`;
        
        fs.writeFileSync(path.join(sessionDir, 'README.txt'), readmeContent);
        
        resolve(true);
      }
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      audioRecording = false;
      
      // Clean up session directory if it exists and the error occurred before recording started
      if (fs.existsSync(sessionDir)) {
        fs.rmdir(sessionDir, { recursive: true }, (err) => {
          if (err) console.error(`Failed to remove failed recording directory: ${err.message}`);
        });
      }
      
      reject(error);
    }
  });
}

// Stop recording audio
async function stopAudioRecording(): Promise<boolean> {
  return new Promise(async (resolve) => {
    if (!audioRecording) {
      console.log('No active recording to stop');
      if (mainWindow) {
        mainWindow.webContents.send('audio-recording-stopped', { 
          filePath: '',
          success: false,
          error: 'No active recording'
        });
      }
      resolve(false);
      return;
    }
    
    // Get current session directory
    let currentSessionDir = '';
    if (currentRecordingSession && currentRecordingSession.path) {
      currentSessionDir = currentRecordingSession.path;
      console.log(`Current recording session directory: ${currentSessionDir}`);
      
      // Make sure the directory exists 
      if (!fs.existsSync(currentSessionDir)) {
        console.error(`Session directory doesn't exist, attempting to create: ${currentSessionDir}`);
        try {
          fs.mkdirSync(currentSessionDir, { recursive: true, mode: 0o777 });
        } catch (err) {
          console.error(`Failed to recreate session directory: ${err}`);
        }
      }
    } else {
      console.warn('No current recording session found in variable state');
      
      // Fallback: try to find the latest recording directory
      try {
        if (fs.existsSync(recordingsDir)) {
          const files = fs.readdirSync(recordingsDir);
          const directories = files.filter(file => 
            fs.statSync(path.join(recordingsDir, file)).isDirectory()
          );
          
          if (directories.length > 0) {
            // Sort by creation time, newest first
            directories.sort((a, b) => {
              const timeA = fs.statSync(path.join(recordingsDir, a)).birthtimeMs;
              const timeB = fs.statSync(path.join(recordingsDir, b)).birthtimeMs;
              return timeB - timeA;
            });
            
            currentSessionDir = path.join(recordingsDir, directories[0]);
            console.log(`Found latest recording session directory: ${currentSessionDir}`);
          } else {
            console.error('No recording directories found');
          }
        } else {
          console.error(`Recordings directory doesn't exist: ${recordingsDir}`);
          ensureRecordingsDirExists();
        }
      } catch (error) {
        console.error('Error finding current recording session directory:', error);
      }
    }
    
    if (!currentSessionDir) {
      console.error('Unable to determine recording directory');
      audioRecording = false;
      audioProcess = null;
      
      if (mainWindow) {
        mainWindow.webContents.send('audio-recording-stopped', {
          filePath: '',
          success: false,
          error: 'Unable to determine recording directory'
        });
      }
      
      updateTrayMenu();
      resolve(false);
      return;
    }
    
    try {
      console.log('Attempting to stop audio recording process');
      
      // Check if ffmpeg process is still running
      let processKilled = false;
      
      // First try to stop via the direct reference
      if (audioProcess) {
        try {
          console.log('Stopping audio process via direct reference');
          
          // Use SIGINT first for a more graceful shutdown
          audioProcess.kill('SIGINT');
          processKilled = true;
        } catch (e) {
          console.error('Failed to stop via direct reference:', e);
        }
      }
      
      // If direct reference failed, try pkill
      if (!processKilled) {
        console.log('Using pkill as fallback to stop ffmpeg');
        const pkillProcess = spawn('pkill', ['-INT', '-f', 'ffmpeg']);
        
        // Wait for pkill to complete
        await new Promise<void>((pkillResolve) => {
          pkillProcess.on('close', (code) => {
            if (code === 0) {
              console.log('Successfully stopped ffmpeg processes via pkill');
              processKilled = true;
            } else {
              console.log(`pkill exited with code ${code}`);
            }
            pkillResolve();
          });
        });
      }
      
      // Final option: force kill
      if (!processKilled) {
        console.log('Force killing ffmpeg processes with SIGKILL');
        spawn('pkill', ['-9', '-f', 'ffmpeg']);
      }
      
      // Reset recording state
      audioRecording = false;
      audioProcess = null;
      
      // Ensure ffmpeg has time to finalize the file
      console.log('Waiting for recording file to finalize...');
      // Increase wait time to ensure file is properly saved
      setTimeout(() => {
        // Make sure the directory still exists
        if (!fs.existsSync(currentSessionDir)) {
          console.error(`Directory disappeared, attempting to recreate: ${currentSessionDir}`);
          try {
            fs.mkdirSync(currentSessionDir, { recursive: true, mode: 0o777 });
          } catch (mkdirErr) {
            console.error(`Failed to recreate directory: ${mkdirErr}`);
          }
        }
        
        // Check for the recording file in the system temporary directory
        // This helps in cases where the main file might have been deleted
        const tempDir = require('os').tmpdir();
        const backupDir = path.join(tempDir, 'agent-pal-recordings');
        
        try {
          // Create backup directory if it doesn't exist
          if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
          }
          
          // Get file information
          const expectedWavPath = path.join(currentSessionDir, 'microphone.wav');
          const backupWavPath = path.join(backupDir, `recording-${Date.now()}.wav`);
          
          // If the original WAV exists, make a backup
          if (fs.existsSync(expectedWavPath)) {
            console.log(`Making backup of recording to: ${backupWavPath}`);
            fs.copyFileSync(expectedWavPath, backupWavPath);
          } else {
            console.log(`Original WAV not found at ${expectedWavPath}`);
          }
        } catch (backupErr) {
          console.error(`Error backing up recording: ${backupErr}`);
        }
        
        // Reset current recording session
        currentRecordingSession = null;
        
        // Notify renderer
        if (mainWindow) {
          mainWindow.webContents.send('audio-recording-stopped', {
            filePath: currentSessionDir,
            success: true,
            error: undefined
          });
        }
        
        updateTrayMenu();
        resolve(true);
      }, 3000); // Increased to 3 seconds for file to be properly closed
    } catch (error) {
      console.error('Error stopping recording:', error);
      audioRecording = false;
      audioProcess = null;
      
      if (mainWindow) {
        mainWindow.webContents.send('audio-recording-stopped', {
          filePath: currentSessionDir || '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error stopping recording'
        });
      }
      
      updateTrayMenu();
      resolve(false);
    }
  });
}

// Add IPC handlers
// This function should be called during app initialization
function setupIpcHandlers(): void {
  // Handle question answering IPC
  ipcMain.handle('ask-question', async (event, question: string): Promise<string> => {
    // This will be where you connect to your AI/knowledge graph
    return `Simulated answer to: ${question}`;
  });

  // Add handlers for window controls
  ipcMain.handle('minimize-window', (): void => {
    if (!mainWindow) return;
    mainWindow.minimize();
  });

  ipcMain.handle('toggle-window-size', (): void => {
    toggleWindowSize();
  });

  ipcMain.handle('close-window', (): void => {
    if (!mainWindow) return;
    mainWindow.hide();
  });

  // Add handler for new chat
  ipcMain.handle('create-new-chat', (): { success: boolean } => {
    // This will be expanded in the future
    return { success: true };
  });

  // Handle IPC messages for audio recording
  ipcMain.handle('request-microphone-permission', async () => {
    return await requestMicrophonePermission();
  });

  ipcMain.handle('get-audio-devices', async () => {
    return await getAudioDevices();
  });

  ipcMain.handle('start-audio-recording', async (event, deviceId) => {
    return await startAudioRecording(deviceId);
  });

  ipcMain.handle('stop-audio-recording', async () => {
    return await stopAudioRecording();
  });
  
  // Handle request to open the recordings folder
  ipcMain.handle('open-recordings-folder', async () => {
    return await openRecordingsFolder();
  });
  
  // Handle external triggers (like keyboard shortcuts)
  ipcMain.handle('toggle-recording-from-external', async () => {
    await toggleRecording();
    return audioRecording;
  });
  
  // Get current recording status
  ipcMain.handle('get-recording-status', () => {
    return audioRecording;
  });
}

app.whenReady().then(async () => {
  // Set app name that appears in menu bar
  app.name = 'Agent Pal';
  
  // Make sure app is visible in dock
  if (process.platform === 'darwin') {
    app.dock.show();
  }
  
  // Create the recordings directory
  ensureRecordingsDirExists();
  
  createWindow();
  createTray();
  registerShortcuts();
  
  // Setup IPC handlers
  setupIpcHandlers();
  
  // Request microphone permission on start
  await requestMicrophonePermission();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
}); 