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

// Audio recording directory
const recordingsDir = path.join(app.getPath('userData'), 'recordings');

// Create recordings directory if it doesn't exist
function ensureRecordingsDirExists(): void {
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }
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
    icon: path.join(__dirname, '../assets', 'PAL Transparent Logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Set the app dock icon on macOS
  if (process.platform === 'darwin') {
    app.dock.setIcon(nativeImage.createFromPath(path.join(__dirname, '../assets', 'PAL Transparent Logo.png')));
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
  const pngPath = path.join(__dirname, '../assets', 'PAL Transparent Logo.png');
  const svgPath = path.join(__dirname, '../assets', 'PAL Transparent Logo.svg');
  
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
  
  // Create a temporary menu with loading state
  const loadingMenu = Menu.buildFromTemplate([
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
    {
      label: 'Open Recordings Folder',
      click: async () => {
        try {
          await openRecordingsFolder();
        } catch (error) {
          if (mainWindow) {
            mainWindow.webContents.send('show-error', {
              title: 'Error',
              message: 'Failed to open recordings folder'
            });
          }
        }
      }
    },
    { 
      label: 'Loading audio devices...', 
      enabled: false 
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
    tray.setContextMenu(loadingMenu);
  }
  
  // Then load the actual devices asynchronously
  getAudioOutputDevices().then(outputDevices => {
    const speakerItems = outputDevices.map(device => ({
      label: `Use ${device.name}${device.isDefault ? ' (Default)' : ''}`,
      click: async () => {
        try {
          await setupBlackHoleRouting(device.name);
          // Notify the renderer
          if (mainWindow) {
            mainWindow.webContents.send('blackhole-setup-complete', {
              success: true,
              deviceName: device.name
            });
          }
        } catch (error) {
          console.error(`Failed to setup BlackHole with ${device.name}:`, error);
          // Notify the renderer of failure
          if (mainWindow) {
            mainWindow.webContents.send('blackhole-setup-complete', {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
    }));
    
    // If no devices were found, use a different approach for the menu
    const audioSubmenu = speakerItems.length > 0 ? [
      {
        label: 'Available Speakers',
        enabled: false
      },
      { type: 'separator' as const },
      ...speakerItems
    ] : [
      {
        label: 'No output devices found',
        enabled: false
      }
    ];
    
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
      {
        label: 'Open Recordings Folder',
        click: async () => {
          try {
            await openRecordingsFolder();
          } catch (error) {
            if (mainWindow) {
              mainWindow.webContents.send('show-error', {
                title: 'Error',
                message: 'Failed to open recordings folder'
              });
            }
          }
        }
      },
      { 
        label: 'Audio Output Setup',
        submenu: audioSubmenu
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
  }).catch(err => {
    console.error('Error getting output devices for menu:', err);
    
    // Fallback menu without speaker options
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
      {
        label: 'Open Recordings Folder',
        click: async () => {
          try {
            await openRecordingsFolder();
          } catch (error) {
            if (mainWindow) {
              mainWindow.webContents.send('show-error', {
                title: 'Error',
                message: 'Failed to open recordings folder'
              });
            }
          }
        }
      },
      {
        label: 'Setup BlackHole Audio',
        click: async () => {
          try {
            await setupBlackHoleRouting();
            // Notify the renderer
            if (mainWindow) {
              mainWindow.webContents.send('blackhole-setup-complete', { success: true });
            }
          } catch (error) {
            console.error('Failed to setup BlackHole:', error);
            // Notify the renderer of failure
            if (mainWindow) {
              mainWindow.webContents.send('blackhole-setup-complete', { success: false });
            }
          }
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
  });
}

// Toggle recording from the tray menu
async function toggleRecording(): Promise<void> {
  try {
    if (audioRecording) {
      await stopAudioRecording();
    } else {
      // Get the default device or the last selected one
      const deviceId = ''; // Use default device
      await startAudioRecording(deviceId);
    }
    
    // Update the tray menu to reflect the new state
    updateTrayMenu();
    
  } catch (error) {
    console.error('Error toggling recording from tray:', error);
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
    fs.mkdirSync(sessionDir, { recursive: true });
    
    // Create separate files for different sources
    const systemAudioFile = path.join(sessionDir, `system-audio.wav`);
    const micAudioFile = path.join(sessionDir, `microphone.wav`);
    const mixedAudioFile = path.join(sessionDir, `mixed-recording.wav`);
    
    try {
      // First get a list of available audio devices to confirm they exist
      const availableDevices = await getAudioDevices();
      console.log('Available audio devices for recording:', availableDevices.map(d => d.name).join(', '));
      
      // Check if BlackHole is among the available devices
      const hasBlackHole = availableDevices.some(device => device.name.includes('BlackHole'));
      if (!hasBlackHole) {
        console.warn('BlackHole audio device not found among available devices');
      }
      
      // For debugging, print the selected device info
      let micDeviceId = deviceId;
      if (!micDeviceId) {
        // Try to find a microphone device
        const micDevice = availableDevices.find(d => 
          d.name.includes('Microphone') || 
          d.name.includes('mic') || 
          d.name.includes('input')
        );
        
        if (micDevice) {
          micDeviceId = micDevice.id;
          console.log(`Selected microphone: ${micDevice.name}`);
        }
      }
      
      let recordingProcesses = 0;
      let completedProcesses = 0;
      let hasError = false;
      
      // Function to check if all recordings are done
      const checkAllDone = () => {
        completedProcesses++;
        if (completedProcesses >= recordingProcesses) {
          audioRecording = false;
          audioProcess = null;
          
          if (mainWindow && !hasError) {
            mainWindow.webContents.send('audio-recording-stopped', { 
              filePath: sessionDir,
              success: !hasError
            });
          }
          
          // Update the tray menu when recording stops
          updateTrayMenu();
        }
      };
      
      // On macOS, list available devices first to help with debugging
      console.log('Listing available audio devices for ffmpeg:');
      const listProcess = spawn('ffmpeg', ['-f', 'avfoundation', '-list_devices', 'true', '-i', '']);
      
      listProcess.stderr.on('data', (data: Buffer) => {
        console.log(`ffmpeg device list: ${data.toString()}`);
      });
      
      // Wait for listing to complete
      await new Promise(resolve => {
        listProcess.on('close', () => resolve(null));
      });
      
      // Start recording system audio (BlackHole)
      if (hasBlackHole) {
        recordingProcesses++;
        
        const systemArgs = [
          '-f', 'avfoundation',
          '-i', ':BlackHole 16ch', // Try to use BlackHole by name
          '-ac', '2',             // 2 audio channels (stereo)
          '-ar', '44100',         // 44.1 kHz sample rate
          '-y',                   // Overwrite output file if it exists
          '-loglevel', 'info',    // More detailed logging
          systemAudioFile
        ];
        
        console.log(`Starting system audio recording: ffmpeg ${systemArgs.join(' ')}`);
        
        const systemProcess = spawn('ffmpeg', systemArgs);
        
        systemProcess.stderr.on('data', (data: Buffer) => {
          console.log(`System audio info: ${data.toString()}`);
        });
        
        systemProcess.on('error', (err: Error) => {
          console.error(`System audio error: ${err.message}`);
          hasError = true;
          checkAllDone();
        });
        
        systemProcess.on('close', (code: number) => {
          console.log(`System audio recording process exited with code ${code}`);
          if (code !== 0) hasError = true;
          checkAllDone();
        });
      }
      
      // Start recording microphone
      if (micDeviceId) {
        recordingProcesses++;
        
        const micArgs = [
          '-f', 'avfoundation',
          '-i', micDeviceId, // Use the identified microphone
          '-ac', '1',       // 1 audio channel (mono) for mic
          '-ar', '44100',   // 44.1 kHz sample rate
          '-y',             // Overwrite output file if it exists
          '-loglevel', 'info', // More detailed logging
          micAudioFile
        ];
        
        console.log(`Starting microphone recording: ffmpeg ${micArgs.join(' ')}`);
        
        const micProcess = spawn('ffmpeg', micArgs);
        
        micProcess.stderr.on('data', (data: Buffer) => {
          console.log(`Microphone audio info: ${data.toString()}`);
        });
        
        micProcess.on('error', (err: Error) => {
          console.error(`Microphone audio error: ${err.message}`);
          hasError = true;
          checkAllDone();
        });
        
        micProcess.on('close', (code: number) => {
          console.log(`Microphone recording process exited with code ${code}`);
          if (code !== 0) hasError = true;
          checkAllDone();
        });
      }
      
      // If no specific recording method was started, try a fallback method
      if (recordingProcesses === 0) {
        recordingProcesses++;
        
        const fallbackArgs = [
          '-f', 'avfoundation',
          '-i', deviceId || ':0', // Use default device if not specified
          '-ac', '2',
          '-ar', '44100',
          '-y',
          '-loglevel', 'info',
          mixedAudioFile
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
          hasError = true;
          reject(err);
        });
        
        audioProcess.on('close', (code: number) => {
          console.log(`Fallback audio recording process exited with code ${code}`);
          audioRecording = false;
          audioProcess = null;
          
          if (mainWindow) {
            mainWindow.webContents.send('audio-recording-stopped', { 
              filePath: sessionDir,
              success: code === 0
            });
          }
          
          updateTrayMenu();
          
          if (code !== 0) {
            hasError = true;
            fs.rmdir(sessionDir, { recursive: true }, (err) => {
              if (err) console.error(`Failed to remove failed recording directory: ${err.message}`);
            });
          }
          
          checkAllDone();
        });
      }
      
      audioRecording = true;
      
      if (mainWindow) {
        mainWindow.webContents.send('audio-recording-started');
      }
      
      // Create a README file in the recordings folder with info
      const readmeContent = `
Recording Session: ${timestamp}
------------------------------
This folder contains audio recordings captured by Agent Pal:

- system-audio.wav: System audio captured through BlackHole
- microphone.wav: Audio captured from your microphone
- mixed-recording.wav: Mixed audio (if available)

Available devices: ${availableDevices.map(d => d.name).join(', ')}
`;
      
      fs.writeFileSync(path.join(sessionDir, 'README.txt'), readmeContent);
      
      resolve(true);
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
function stopAudioRecording(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!audioRecording || !audioProcess) {
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
    
    try {
      console.log('Attempting to stop audio recording process');
      // Send SIGTERM to gracefully stop the recording process
      audioProcess.kill('SIGTERM');
      
      // Set a timeout in case the process doesn't exit
      const killTimeout = setTimeout(() => {
        if (audioProcess) {
          console.log('Recording process did not exit, forcing termination');
          try {
            audioProcess.kill('SIGKILL');
          } catch (e) {
            console.error('Error killing process:', e);
          }
          
          audioRecording = false;
          audioProcess = null;
          
          if (mainWindow) {
            mainWindow.webContents.send('audio-recording-stopped', {
              filePath: '',
              success: false,
              error: 'Recording process timed out'
            });
          }
          
          updateTrayMenu();
        }
      }, 5000); // 5 second timeout
      
      // Clear the timeout when the process exits
      audioProcess.on('close', () => {
        clearTimeout(killTimeout);
      });
      
      // The 'close' event handler will set audioRecording to false
      resolve(true);
    } catch (error) {
      console.error('Error stopping recording:', error);
      audioRecording = false;
      audioProcess = null;
      
      if (mainWindow) {
        mainWindow.webContents.send('audio-recording-stopped', {
          filePath: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error stopping recording'
        });
      }
      
      updateTrayMenu();
      resolve(false);
    }
  });
}

// Get available audio output devices (speakers)
async function getAudioOutputDevices(): Promise<any[]> {
  try {
    // Execute command to list audio devices focusing on outputs
    const command = 'system_profiler';
    const args = ['SPAudioDataType'];
    
    const outputDevices = await parseAudioOutputDevices(await new Promise<string>((resolve, reject) => {
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
          resolve(stdout);
        } else {
          console.error(`Error getting audio output devices: ${stderr}`);
          reject(new Error(stderr));
        }
      });
    }));
    
    return outputDevices;
  } catch (error) {
    console.error('Failed to get audio output devices:', error);
    return [];
  }
}

// Helper function to parse audio output device data
async function parseAudioOutputDevices(output: string): Promise<any[]> {
  // Log the complete output for debugging
  console.log('Raw audio device output:', output);
  
  try {
    // For macOS, try direct approach to get audio devices using system command
    // This is a more reliable approach for macOS to get output devices
    const result = await new Promise<any[]>((resolve, reject) => {
      const command = 'osascript';
      const args = [
        '-e',
        `tell application "System Events"
          set outputDevices to a reference to (audio output devices whose enabled is true)
          set deviceList to {}
          
          repeat with aDevice in outputDevices
            set deviceName to name of aDevice
            set isDefault to (output muted of aDevice is false)
            set deviceInfo to {name:deviceName, id:deviceName, isDefault:isDefault, isBlackHole:(deviceName contains "BlackHole")}
            copy deviceInfo to the end of deviceList
          end repeat
          
          return deviceList
        end tell`
      ];
      
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
          try {
            // Clean and parse AppleScript output
            const cleanOutput = stdout.trim()
              .replace(/^\{|\}$/g, '')  // Remove outer braces
              .replace(/\{/g, '[')     // Replace inner opening braces
              .replace(/\}/g, ']');    // Replace inner closing braces
            
            // Replace AppleScript property notation with JSON
            const jsonString = cleanOutput
              .replace(/([a-zA-Z0-9]+):/g, '"$1":')  // Convert property names to JSON format
              .replace(/:([a-zA-Z0-9]+)/g, ':"$1"'); // Add quotes to string values
            
            // Parse the JSON
            const parsed = JSON.parse(`[${jsonString}]`);
            console.log('Parsed output devices:', parsed);
            resolve(parsed);
          } catch (e) {
            console.error('Failed to parse AppleScript output:', e);
            // Fallback method - direct parsing
            fallbackParseDevices(output).then(resolve).catch(reject);
          }
        } else {
          console.error(`AppleScript error: ${stderr}`);
          // Fallback to the original method
          fallbackParseDevices(output).then(resolve).catch(reject);
        }
      });
    });
    
    return result;
  } catch (error) {
    console.error('Error in parseAudioOutputDevices:', error);
    return fallbackParseDevices(output);
  }
}

// Fallback function to parse device output directly
async function fallbackParseDevices(output: string): Promise<any[]> {
  const devices: any[] = [];
  
  // Look for output devices
  const lines = output.split('\n');
  let currentDevice: any = null;
  let isOutput = false;
  
  for (const line of lines) {
    if (line.includes('Name:')) {
      if (currentDevice && isOutput) {
        devices.push(currentDevice);
      }
      
      isOutput = false;
      const name = line.replace('Name:', '').trim();
      currentDevice = { 
        name, 
        id: name, 
        isBlackHole: name.includes('BlackHole'),
        isDefault: false
      };
    }
    
    if (line.includes('Output Channels:') && parseInt(line.replace('Output Channels:', '').trim()) > 0) {
      isOutput = true;
    }
    
    if (currentDevice && line.includes('Default Output:') && line.includes('Yes')) {
      currentDevice.isDefault = true;
    }
  }
  
  // Add the last device if it exists and is an output
  if (currentDevice && isOutput) {
    devices.push(currentDevice);
  }
  
  // As a last resort, add some known devices if none were found
  if (devices.length === 0) {
    console.log('No devices found, adding fallback devices');
    devices.push({ name: 'MacBook Pro Speakers', id: 'MacBook Pro Speakers', isDefault: true, isBlackHole: false });
    devices.push({ name: 'BlackHole 16ch', id: 'BlackHole 16ch', isDefault: false, isBlackHole: true });
    
    try {
      // Try to detect multi-output device using an alternative method
      const deviceList = await new Promise<string[]>((resolve) => {
        const multiCmd = spawn('osascript', [
          '-e', 'tell application "System Events" to get name of every audio device'
        ]);
        
        let output = '';
        multiCmd.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        multiCmd.on('close', () => {
          const list = output.trim().split(', ');
          console.log('Alternative device detection:', list);
          resolve(list);
        });
      });
      
      deviceList.forEach((name: string) => {
        if (name.includes('Multi-Output') || name.includes('Headphones') || name.includes('External')) {
          devices.push({ name, id: name, isDefault: false, isBlackHole: false });
        }
      });
    } catch (error) {
      console.error('Error in alternative device detection:', error);
    }
  }
  
  console.log('Fallback parsed output devices:', devices);
  return devices;
}

// Setup BlackHole as audio output with specified speaker
function setupBlackHoleRouting(outputDeviceName?: string): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      // Get available output devices
      const outputDevices = await getAudioOutputDevices();
      console.log('Available output devices:', outputDevices.map(d => d.name));
      
      // If no specific device is specified, use the default
      let targetOutputName = outputDeviceName;
      if (!targetOutputName) {
        const defaultDevice = outputDevices.find(d => d.isDefault);
        targetOutputName = defaultDevice ? defaultDevice.name : 'Built-in Output';
      }
      
      console.log(`Setting up multi-output with BlackHole and "${targetOutputName}"`);
      
      // Use Audio MIDI Setup script more reliably
      const createMultiOutputCmd = 'osascript';
      const createMultiOutputArgs = [
        '-e', 
        `tell application "Audio MIDI Setup"
            try
                -- First clean up any existing PAL device
                set allDevices to get name of every aggregate device
                repeat with deviceName in allDevices
                    if deviceName contains "PAL-Recording" then
                        set deviceToRemove to first aggregate device whose name contains "PAL-Recording"
                        delete deviceToRemove
                    end if
                end repeat
                
                -- Create new aggregate device
                set newDevice to make new aggregate device with properties {name:"PAL-Recording-Output"}
                
                -- Find specific devices
                set allAudioDevices to get name of every audio device
                
                -- Try to find output device
                set foundOutput to false
                repeat with deviceName in allAudioDevices
                    if deviceName contains "${targetOutputName}" then
                        set outputDevice to first audio device whose name contains "${targetOutputName}"
                        add audio device outputDevice to newDevice
                        set foundOutput to true
                    end if
                end repeat
                
                -- Try to find BlackHole device
                set foundBlackHole to false
                repeat with deviceName in allAudioDevices
                    if deviceName contains "BlackHole" then
                        set blackholeDevice to first audio device whose name contains "BlackHole"
                        add audio device blackholeDevice to newDevice
                        set foundBlackHole to true
                    end if
                end repeat
                
                -- Set as default device if found both
                if foundOutput and foundBlackHole then
                    set default output device to newDevice
                    return true
                else
                    return false
                end if
            on error errMsg
                log "Error in AppleScript: " & errMsg
                return false
            end try
        end tell`
      ];
      
      const createMultiOutput = spawn(createMultiOutputCmd, createMultiOutputArgs);
      
      createMultiOutput.stdout.on('data', (data) => {
        console.log(`AppleScript output: ${data}`);
      });
      
      createMultiOutput.stderr.on('data', (data) => {
        console.error(`AppleScript error: ${data}`);
      });
      
      createMultiOutput.on('close', (code: number) => {
        if (code === 0) {
          console.log(`Successfully created multi-output device with BlackHole and ${targetOutputName}`);
          resolve(true);
        } else {
          // Fallback: If AppleScript approach fails, try the command line tool
          console.log('AppleScript method failed, trying fallback method');
          const command = 'SwitchAudioSource';
          const args = ['-s', 'BlackHole 16ch'];
          
          const process = spawn(command, args);
          
          process.on('close', (code: number) => {
            if (code === 0) {
              console.log('Successfully switched to BlackHole audio device (fallback method)');
              resolve(true);
            } else {
              console.error(`Failed to switch audio device, exit code: ${code}`);
              reject(new Error(`Failed to switch audio device, exit code: ${code}`));
            }
          });
        }
      });
    } catch (error) {
      console.error('Error setting up BlackHole routing:', error);
      reject(error);
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

  ipcMain.handle('get-audio-output-devices', async () => {
    return await getAudioOutputDevices();
  });

  ipcMain.handle('start-audio-recording', async (event, deviceId) => {
    return await startAudioRecording(deviceId);
  });

  ipcMain.handle('stop-audio-recording', async () => {
    return await stopAudioRecording();
  });

  ipcMain.handle('setup-blackhole', async (event, outputDeviceName) => {
    return await setupBlackHoleRouting(outputDeviceName);
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