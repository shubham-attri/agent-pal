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
      let blackholeIndex = '';
      let microphoneIndex = '';
      
      const audioDeviceLines = deviceList.split('\n')
        .filter(line => line.includes('[AVFoundation indev @') && !line.includes('video devices'));
      
      const deviceEntries = deviceList.split('\n')
        .filter(line => line.match(/\[\d+\]/))
        .map(line => {
          const match = line.match(/\[(\d+)\] (.*)/);
          return match ? { index: match[1], name: match[2].trim() } : null;
        })
        .filter(entry => entry !== null);
      
      console.log('Detected devices:', deviceEntries);
      
      // Find BlackHole device
      const blackholeDevice = deviceEntries.find(d => d?.name.includes('BlackHole'));
      if (blackholeDevice) {
        blackholeIndex = blackholeDevice.index;
        console.log(`Found BlackHole device at index: ${blackholeIndex}`);
      }
      
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
      
      // Start recording system audio (BlackHole)
      if (blackholeIndex) {
        recordingProcesses++;
        
        const systemArgs = [
          '-f', 'avfoundation',
          '-i', `:${blackholeIndex}`, // Use found BlackHole index
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
      } else {
        console.warn('BlackHole device not found for system audio recording');
      }
      
      // Start recording microphone
      if (microphoneIndex) {
        recordingProcesses++;
        
        const micArgs = [
          '-f', 'avfoundation',
          '-i', microphoneIndex, // Use the identified microphone index
          '-ac', '1',       // 1 audio channel (mono) for mic
          '-ar', '44100',   // 44.1 kHz sample rate
          '-y',             // Overwrite output file if it exists
          '-loglevel', 'info', // More detailed logging
          micAudioFile
        ];
        
        console.log(`Starting microphone recording: ffmpeg ${micArgs.join(' ')}`);
        
        // Explicitly just use audio (no video) when recording from microphone
        const micProcess = spawn('ffmpeg', micArgs, {
          env: { ...process.env, FFREPORT: 'file=mic_recording.log' }
        });
        
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
      } else {
        console.warn('Microphone device not found');
      }
      
      // If neither specific recording method was started, try a fallback method
      if (recordingProcesses === 0 || (!blackholeIndex && !microphoneIndex)) {
        recordingProcesses++;
        
        console.log('Using fallback recording method (attempting to record default devices)');
        
        // Try different device specifications for maximum compatibility
        const fallbackOptions = [
          // Try MacOS default indices (usually 0 is mic, 1 is BlackHole if installed)
          ['0:1', 'microphone-and-system'],
          // Just default microphone 
          ['0', 'microphone-only'],
          // Just default input (which might be BlackHole)
          [':0', 'system-only']
        ];
        
        // Use the first fallback option
        const [deviceSpec, recordingType] = fallbackOptions[0];
        const fallbackFile = path.join(sessionDir, `${recordingType}.wav`);
        
        const fallbackArgs = [
          '-f', 'avfoundation',
          '-i', deviceSpec,
          '-ac', '2',
          '-ar', '44100',
          '-y',
          '-loglevel', 'info',
          fallbackFile
        ];
        
        console.log(`Starting fallback audio recording: ffmpeg ${fallbackArgs.join(' ')}`);
        
        audioProcess = spawn('ffmpeg', fallbackArgs);
        
        audioProcess.stderr.on('data', (data: Buffer) => {
          console.log(`Fallback audio info: ${data.toString()}`);
        });
        
        audioProcess.on('error', (err: Error) => {
          console.error(`Fallback audio error: ${err.message}`);
          
          // If the first fallback fails, try the next one
          if (fallbackOptions.length > 1) {
            const [nextDeviceSpec, nextRecordingType] = fallbackOptions[1];
            const nextFallbackFile = path.join(sessionDir, `${nextRecordingType}.wav`);
            
            console.log(`Trying alternate fallback: ffmpeg -f avfoundation -i ${nextDeviceSpec} ...`);
            
            const nextArgs = [
              '-f', 'avfoundation',
              '-i', nextDeviceSpec,
              '-ac', '2',
              '-ar', '44100',
              '-y',
              '-loglevel', 'info',
              nextFallbackFile
            ];
            
            // Try the next fallback option
            audioProcess = spawn('ffmpeg', nextArgs);
            
            // Set up error handlers for this process too
            audioProcess.stderr.on('data', (data: Buffer) => {
              console.log(`Alt fallback info: ${data.toString()}`);
            });
            
            audioProcess.on('error', (altErr: Error) => {
              console.error(`Alt fallback error: ${altErr.message}`);
              audioRecording = false;
              audioProcess = null;
              
              if (mainWindow) {
                mainWindow.webContents.send('audio-recording-stopped', { 
                  filePath: sessionDir,
                  error: altErr.message
                });
              }
              
              updateTrayMenu();
              hasError = true;
              reject(altErr);
            });
            
            audioProcess.on('close', (code: number) => {
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
              }
              
              checkAllDone();
            });
            
            return; // Return to prevent the initial audioProcess error from being handled further
          }
          
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
            // Only clean up directory if this was the only recording process and it failed
            if (recordingProcesses === 1) {
              fs.rmdir(sessionDir, { recursive: true }, (err) => {
                if (err) console.error(`Failed to remove failed recording directory: ${err.message}`);
              });
            }
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

- system-audio.wav: System audio captured through BlackHole (index: ${blackholeIndex || 'not found'})
- microphone.wav: Audio captured from your microphone (index: ${microphoneIndex || 'not found'})
- mixed-recording.wav: Mixed audio (if available)

Available devices detected by ffmpeg:
${deviceEntries.map(d => `- [${d?.index}] ${d?.name}`).join('\n')}

Available audio devices:
${availableDevices.length > 0 
  ? availableDevices.map(d => `- ${d.name}`).join('\n') 
  : '- No devices detected from system_profiler'}
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
    
    try {
      console.log('Attempting to stop audio recording process');
      
      // Use multiple methods to stop ffmpeg processes
      const stopMethods = [
        // Method 1: Try the direct reference if we have it
        () => {
          if (audioProcess) {
            try {
              console.log('Stopping audio process via direct reference');
              audioProcess.kill('SIGTERM');
              return true;
            } catch (e) {
              console.error('Failed to stop via direct reference:', e);
              return false;
            }
          }
          return false;
        },
        
        // Method 2: Try find-process module
        async () => {
          try {
            const findProcess = require('find-process');
            const processList = await findProcess('name', 'ffmpeg');
            
            if (processList.length > 0) {
              console.log(`Found ${processList.length} ffmpeg processes to stop`);
              
              // Kill all ffmpeg processes
              processList.forEach((proc: { pid: number }) => {
                try {
                  console.log(`Stopping ffmpeg process with PID ${proc.pid}`);
                  process.kill(proc.pid, 'SIGTERM');
                } catch (e) {
                  console.error(`Error killing process ${proc.pid}:`, e);
                }
              });
              return true;
            }
            return false;
          } catch (e) {
            console.error('Failed to find ffmpeg processes:', e);
            return false;
          }
        },
        
        // Method 3: Use pkill command directly
        async () => {
          try {
            console.log('Trying pkill to stop ffmpeg');
            const pkillProcess = spawn('pkill', ['-f', 'ffmpeg']);
            
            return new Promise(resolve => {
              pkillProcess.on('close', (code) => {
                if (code === 0) {
                  console.log('Successfully stopped ffmpeg processes via pkill');
                  resolve(true);
                } else {
                  console.log(`pkill exited with code ${code}`);
                  resolve(false);
                }
              });
            });
          } catch (e) {
            console.error('pkill failed:', e);
            return false;
          }
        }
      ];
      
      // Try each method in sequence
      Promise.all(stopMethods.map(method => method()))
        .then(() => {
          // Reset state regardless
          audioRecording = false;
          audioProcess = null;
          
          // Notify renderer after a short delay to allow processes to clean up
          setTimeout(() => {
            if (mainWindow) {
              mainWindow.webContents.send('audio-recording-stopped', {
                filePath: '',
                success: true
              });
            }
            
            updateTrayMenu();
            resolve(true);
          }, 500);
        });
      
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
  
  // Extract device details directly from system_profiler output
  const devices: any[] = [];
  
  // Split the output by device sections
  const deviceSections = output.split('\n\n').filter(section => section.trim() !== '');
  
  for (const section of deviceSections) {
    // Only process sections that look like audio devices
    if (section.includes('Channels:')) {
      try {
        // Extract device name - first line of the section
        const firstLine = section.split('\n')[0].trim();
        const name = firstLine.replace(':', '').trim();
        
        if (name && name !== 'Audio:' && name !== 'Devices:') {
          const isDefault = section.includes('Default Output Device: Yes') || 
                            section.includes('Default System Output Device: Yes');
          const isBlackHole = name.includes('BlackHole');
          const isMultiOutput = name.includes('Multi-Output');
          
          devices.push({
            name,
            id: name,
            isDefault,
            isBlackHole,
            isMultiOutput
          });
          
          console.log(`Found output device: ${name} (Default: ${isDefault}, BlackHole: ${isBlackHole}, Multi-Output: ${isMultiOutput})`);
        }
      } catch (err) {
        console.error('Error parsing device section:', err);
      }
    }
  }
  
  // If no devices detected, try an alternative method
  if (devices.length === 0) {
    console.log('No devices found with primary method, trying alternative approach...');
    try {
      // Get devices using AppleScript directly
      const scriptResult = await new Promise<string>((resolve, reject) => {
        const script = spawn('osascript', [
          '-e', 'tell application "System Events" to get name of every audio device'
        ]);
        
        let output = '';
        script.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        script.stderr.on('data', (data) => {
          console.error('AppleScript error:', data.toString());
        });
        
        script.on('close', (code) => {
          if (code === 0) {
            resolve(output);
          } else {
            reject(new Error(`AppleScript exited with code ${code}`));
          }
        });
      });
      
      // Parse the device names
      const deviceNames = scriptResult.trim().split(', ');
      console.log('Detected audio devices:', deviceNames);
      
      for (const name of deviceNames) {
        if (name && name !== '') {
          const isBlackHole = name.includes('BlackHole');
          const isMultiOutput = name.includes('Multi-Output');
          
          devices.push({
            name,
            id: name,
            isDefault: false, // Can't determine default device with this method
            isBlackHole,
            isMultiOutput
          });
          
          console.log(`Found device (alt method): ${name}`);
        }
      }
    } catch (err) {
      console.error('Alternative device detection failed:', err);
    }
  }
  
  // If still no devices, add fallback devices
  if (devices.length === 0) {
    console.log('No devices found, adding known devices');
    devices.push({ name: 'MacBook Pro Speakers', id: 'MacBook Pro Speakers', isDefault: true, isBlackHole: false, isMultiOutput: false });
    devices.push({ name: 'BlackHole 16ch', id: 'BlackHole 16ch', isDefault: false, isBlackHole: true, isMultiOutput: false });
    devices.push({ name: 'Multi-Output Device', id: 'Multi-Output Device', isDefault: false, isBlackHole: false, isMultiOutput: true });
  }
  
  console.log('Detected output devices:', devices);
  return devices;
}

// Setup BlackHole as audio output with specified speaker
function setupBlackHoleRouting(outputDeviceName?: string): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      // Get available output devices
      const outputDevices = await getAudioOutputDevices();
      console.log('Available output devices:', outputDevices.map(d => d.name));
      
      // Check if Multi-Output already exists and includes BlackHole
      const existingMultiOutput = outputDevices.find(d => d.isMultiOutput);
      if (existingMultiOutput) {
        console.log('Using existing Multi-Output Device');
        
        // Use existing multi-output device
        const setDefaultCmd = spawn('osascript', [
          '-e', 'tell application "System Events" to set volume input volume 100',
          '-e', 'tell application "System Events" to set volume output volume 100',
          '-e', `tell application "System Events" to set properties of audio device "${existingMultiOutput.name}" to {output volume:100, input volume:100}`,
          '-e', `tell application "System Events" to set properties of (get audio output device) to {output muted:false}`,
          '-e', `tell application "System Events" to set default audio device to audio device "${existingMultiOutput.name}"`
        ]);
        
        setDefaultCmd.on('close', (code) => {
          if (code === 0) {
            console.log(`Successfully set existing multi-output device as default`);
            resolve(true);
            return;
          } else {
            console.log('Failed to set existing multi-output, creating new one...');
          }
        });
      }
      
      // If we get here, we need to create a new multi-output device
      // If no specific device is specified, use the default
      let targetOutputName = outputDeviceName;
      if (!targetOutputName) {
        const defaultDevice = outputDevices.find(d => d.isDefault && !d.isBlackHole && !d.isMultiOutput);
        targetOutputName = defaultDevice ? defaultDevice.name : 'Built-in Output';
      }
      
      console.log(`Setting up multi-output with BlackHole and "${targetOutputName}"`);
      
      // Create AppleScript content in a more reliable way
      const script = `
      tell application "Audio MIDI Setup"
        try
          -- First clean up any existing PAL device
          set allDevices to get every device
          repeat with deviceItem in allDevices
            set deviceName to (get name of deviceItem)
            if deviceName contains "PAL-Recording" then
              delete deviceItem
            end if
          end repeat
          
          -- Create new aggregate device
          set newDevice to make new aggregate device
          set name of newDevice to "PAL-Recording-Output"
          
          -- Find specific devices by name
          set targetDevice to null
          set blackholeDevice to null
          
          -- Loop through all devices
          set allDevices to get every device
          repeat with deviceItem in allDevices
            set deviceName to (get name of deviceItem)
            if deviceName contains "${targetOutputName}" then
              set targetDevice to deviceItem
            end if
            if deviceName contains "BlackHole" then
              set blackholeDevice to deviceItem
            end if
          end repeat
          
          -- Add devices to aggregate if found
          if targetDevice is not null then
            add device targetDevice to newDevice
            log "Added output device to multi-output"
          end if
          
          if blackholeDevice is not null then
            add device blackholeDevice to newDevice
            log "Added BlackHole to multi-output"
          end if
          
          -- Set default output device
          set default output device to newDevice
          return "success"
        on error errMsg
          return "Error: " & errMsg
        end try
      end tell`;
      
      const createMultiOutputCmd = spawn('osascript', ['-e', script]);
      
      let stdout = '';
      let stderr = '';
      
      createMultiOutputCmd.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log(`AppleScript output: ${data}`);
      });
      
      createMultiOutputCmd.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error(`AppleScript error: ${data}`);
      });
      
      createMultiOutputCmd.on('close', (code: number) => {
        if (code === 0 && stdout.includes('success')) {
          console.log(`Successfully created multi-output device with BlackHole and ${targetOutputName}`);
          resolve(true);
        } else {
          // Fallback: If AppleScript approach fails, try the command line tool
          console.log('AppleScript method failed, trying fallback method');
          
          // Try using Audio MIDI Setup application directly
          const script2 = `
          do shell script "open -a 'Audio MIDI Setup'"
          delay 1
          tell application "System Events"
            tell process "Audio MIDI Setup"
              -- Click the + button to create a new aggregate device
              click button 1 of group 1 of window 1
              delay 0.5
              click menu item "Create Multi-Output Device" of menu 1 of menu bar item "Audio" of menu bar 1
              delay 0.5
              
              -- Attempt to select both target and BlackHole devices
              tell window 1
                repeat with uiRow in (get rows of table 1 of scroll area 1)
                  if name of static text 1 of uiRow contains "BlackHole" or name of static text 1 of uiRow contains "${targetOutputName}" then
                    set selected of uiRow to true
                  end if
                end repeat
              end tell
            end tell
          end tell`;
          
          const openMidiSetup = spawn('osascript', ['-e', script2]);
          
          openMidiSetup.on('close', (code) => {
            if (code === 0) {
              console.log('Opened Audio MIDI Setup for manual device configuration');
              resolve(true);
            } else {
              // Last resort fallback - just switch to BlackHole
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