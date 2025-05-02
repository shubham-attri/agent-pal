"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const isDev = process.env.NODE_ENV === 'development';
let mainWindow = null;
let tray = null;
let isQuitting = false;
let audioRecording = false;
let audioProcess = null;
const windowConfig = {
    small: {
        width: 600, // Reduced width to match the chatbar
        height: 53, // Height remains the same
        resizable: false
    },
    full: {
        width: 600, // Keep consistent with small width
        height: 500,
        resizable: true
    }
};
// Audio recording directory
const recordingsDir = path.join(electron_1.app.getPath('userData'), 'recordings');
// Create recordings directory if it doesn't exist
function ensureRecordingsDirExists() {
    if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir, { recursive: true });
    }
}
function createWindow() {
    // Get display size
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    // Create the browser window with small dimensions
    mainWindow = new electron_1.BrowserWindow({
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
        electron_1.app.dock.setIcon(electron_1.nativeImage.createFromPath(path.join(__dirname, '../assets', 'PAL Transparent Logo.png')));
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
function positionWindowAboveDock(window, width, height) {
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    // Position at bottom center, 100px above the bottom edge (which should be above dock)
    window.setPosition(Math.floor(screenWidth / 2 - width / 2), Math.floor(screenHeight - height - 100));
}
function createTray() {
    // Try to use both PNG and SVG for best compatibility
    let trayIcon;
    // Try PNG first (often works better for tray icons)
    const pngPath = path.join(__dirname, '../assets', 'PAL Transparent Logo.png');
    const svgPath = path.join(__dirname, '../assets', 'PAL Transparent Logo.svg');
    try {
        if (fs.existsSync(pngPath)) {
            console.log('Loading tray icon from PNG:', pngPath);
            trayIcon = electron_1.nativeImage.createFromPath(pngPath);
            // Resize for tray icon (platform specific sizes)
            if (process.platform === 'darwin') {
                // macOS prefers 16x16 or 22x22 template images
                trayIcon = trayIcon.resize({ width: 22, height: 22 });
                trayIcon.setTemplateImage(true);
            }
            else {
                // Windows/Linux typically use larger icons
                trayIcon = trayIcon.resize({ width: 16, height: 16 });
            }
        }
        else if (fs.existsSync(svgPath)) {
            console.log('Loading tray icon from SVG:', svgPath);
            trayIcon = electron_1.nativeImage.createFromPath(svgPath);
            trayIcon.setTemplateImage(true); // For better macOS integration
        }
        else {
            console.warn('No icon files found. Using fallback icon.');
            // Create a fallback icon
            trayIcon = electron_1.nativeImage.createEmpty().resize({ width: 16, height: 16 });
        }
    }
    catch (error) {
        console.error('Error loading icon:', error);
        trayIcon = electron_1.nativeImage.createEmpty().resize({ width: 16, height: 16 });
    }
    tray = new electron_1.Tray(trayIcon);
    const contextMenu = electron_1.Menu.buildFromTemplate([
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
            label: 'Quit',
            click: () => {
                isQuitting = true;
                electron_1.app.quit();
            }
        }
    ]);
    tray.setToolTip('Agent Pal');
    tray.setContextMenu(contextMenu);
    // Toggle window on tray icon click
    tray.on('click', () => {
        toggleWindow();
    });
}
function toggleWindow() {
    if (!mainWindow)
        return;
    if (mainWindow.isVisible()) {
        mainWindow.hide();
    }
    else {
        showWindow();
    }
}
function showWindow() {
    if (!mainWindow)
        return;
    if (!mainWindow.isVisible()) {
        mainWindow.show();
    }
    mainWindow.focus();
}
function toggleWindowSize() {
    if (!mainWindow)
        return;
    const currentSize = mainWindow.getSize();
    const isSmall = currentSize[0] === windowConfig.small.width && currentSize[1] === windowConfig.small.height;
    if (isSmall) {
        // Switch to large size
        mainWindow.setSize(windowConfig.full.width, windowConfig.full.height);
        // Position window with the same horizontal center, but higher up
        const primaryDisplay = electron_1.screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
        mainWindow.setPosition(Math.floor(screenWidth / 2 - windowConfig.full.width / 2), Math.floor(screenHeight - windowConfig.full.height - 120));
        mainWindow.setResizable(windowConfig.full.resizable);
    }
    else {
        // Switch to small size
        mainWindow.setSize(windowConfig.small.width, windowConfig.small.height);
        // Position in center above dock
        positionWindowAboveDock(mainWindow, windowConfig.small.width, windowConfig.small.height);
        mainWindow.setResizable(windowConfig.small.resizable);
    }
}
function registerShortcuts() {
    // Register global shortcut to show/hide window (Alt+Space or Option+Space)
    electron_1.globalShortcut.register('Alt+Space', () => {
        toggleWindow();
    });
    // Add additional shortcut for Mac users
    electron_1.globalShortcut.register('Option+Space', () => {
        toggleWindow();
    });
}
// Audio related functions
function requestMicrophonePermission() {
    if (process.platform !== 'darwin') {
        return Promise.resolve(true); // Skip permission check on non-macOS
    }
    return electron_1.systemPreferences.askForMediaAccess('microphone')
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
async function getAudioDevices() {
    try {
        // Instead of using desktopCapturer for audio sources,
        // we'll execute a command to list audio devices
        const command = 'system_profiler';
        const args = ['SPAudioDataType'];
        return new Promise((resolve, reject) => {
            const process = (0, child_process_1.spawn)(command, args);
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
                }
                else {
                    console.error(`Error getting audio devices: ${stderr}`);
                    reject(new Error(stderr));
                }
            });
        });
    }
    catch (error) {
        console.error('Failed to get audio devices:', error);
        return [];
    }
}
// Helper function to parse audio device output
function parseAudioDevices(output) {
    const devices = [];
    // Look for BlackHole and other audio devices
    const lines = output.split('\n');
    let currentDevice = null;
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
function startAudioRecording(deviceId = '') {
    return new Promise((resolve, reject) => {
        if (audioRecording) {
            resolve(true);
            return;
        }
        ensureRecordingsDirExists();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFile = path.join(recordingsDir, `recording-${timestamp}.wav`);
        // Use ffmpeg or other command-line tools to capture audio
        // This is a simplified example - you might need to adjust the command based on your needs
        try {
            let command = 'ffmpeg';
            let args = [
                '-f', 'avfoundation',
                '-i', deviceId || ':0', // Use default device if not specified
                '-ac', '2',
                '-ar', '44100',
                outputFile
            ];
            audioProcess = (0, child_process_1.spawn)(command, args);
            audioRecording = true;
            audioProcess.stdout.on('data', (data) => {
                console.log(`stdout: ${data.toString()}`);
            });
            audioProcess.stderr.on('data', (data) => {
                console.error(`stderr: ${data.toString()}`);
            });
            audioProcess.on('close', (code) => {
                console.log(`Audio recording process exited with code ${code}`);
                audioRecording = false;
                audioProcess = null;
                if (mainWindow) {
                    mainWindow.webContents.send('audio-recording-stopped', { filePath: outputFile });
                }
            });
            if (mainWindow) {
                mainWindow.webContents.send('audio-recording-started');
            }
            resolve(true);
        }
        catch (error) {
            console.error('Failed to start audio recording:', error);
            audioRecording = false;
            reject(error);
        }
    });
}
// Stop recording audio
function stopAudioRecording() {
    return new Promise((resolve) => {
        if (!audioRecording || !audioProcess) {
            resolve(false);
            return;
        }
        // Send SIGTERM to gracefully stop the recording process
        audioProcess.kill('SIGTERM');
        // The 'close' event handler will set audioRecording to false
        resolve(true);
    });
}
// Setup BlackHole as audio output
function setupBlackHoleRouting() {
    return new Promise((resolve, reject) => {
        try {
            // On macOS, we can use the 'SwitchAudioSource' command-line tool
            // You may need to install it: brew install switchaudio-osx
            const command = 'SwitchAudioSource';
            const args = ['-s', 'BlackHole 16ch'];
            const process = (0, child_process_1.spawn)(command, args);
            process.on('close', (code) => {
                if (code === 0) {
                    console.log('Successfully switched to BlackHole audio device');
                    resolve(true);
                }
                else {
                    console.error(`Failed to switch audio device, exit code: ${code}`);
                    reject(new Error(`Failed to switch audio device, exit code: ${code}`));
                }
            });
        }
        catch (error) {
            console.error('Error setting up BlackHole routing:', error);
            reject(error);
        }
    });
}
electron_1.app.whenReady().then(async () => {
    // Set app name that appears in menu bar
    electron_1.app.name = 'Agent Pal';
    // Make sure app is visible in dock
    if (process.platform === 'darwin') {
        electron_1.app.dock.show();
    }
    // Create the recordings directory
    ensureRecordingsDirExists();
    createWindow();
    createTray();
    registerShortcuts();
    // Request microphone permission on start
    await requestMicrophonePermission();
    electron_1.app.on('activate', function () {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', function () {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
electron_1.app.on('before-quit', () => {
    isQuitting = true;
});
electron_1.app.on('will-quit', () => {
    // Unregister all shortcuts
    electron_1.globalShortcut.unregisterAll();
});
// Handle question answering IPC
electron_1.ipcMain.handle('ask-question', async (event, question) => {
    // This will be where you connect to your AI/knowledge graph
    return `Simulated answer to: ${question}`;
});
// Add handlers for window controls
electron_1.ipcMain.handle('minimize-window', () => {
    if (!mainWindow)
        return;
    mainWindow.minimize();
});
electron_1.ipcMain.handle('toggle-window-size', () => {
    toggleWindowSize();
});
electron_1.ipcMain.handle('close-window', () => {
    if (!mainWindow)
        return;
    mainWindow.hide();
});
// Add handler for new chat
electron_1.ipcMain.handle('create-new-chat', () => {
    // This will be expanded in the future
    return { success: true };
});
// Handle IPC messages for audio recording
electron_1.ipcMain.handle('request-microphone-permission', async () => {
    return await requestMicrophonePermission();
});
electron_1.ipcMain.handle('get-audio-devices', async () => {
    return await getAudioDevices();
});
electron_1.ipcMain.handle('start-audio-recording', async (event, deviceId) => {
    return await startAudioRecording(deviceId);
});
electron_1.ipcMain.handle('stop-audio-recording', async () => {
    return await stopAudioRecording();
});
electron_1.ipcMain.handle('setup-blackhole', async () => {
    return await setupBlackHoleRouting();
});
