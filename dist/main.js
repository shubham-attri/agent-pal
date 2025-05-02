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
const isDev = process.env.NODE_ENV === 'development';
let mainWindow = null;
let tray = null;
let isQuitting = false;
const windowConfig = {
    small: {
        width: 600,
        height: 53,
        resizable: false
    },
    full: {
        width: 600,
        height: 500,
        resizable: true
    }
};
function createWindow() {
    if (mainWindow) {
        return;
    }
    mainWindow = new electron_1.BrowserWindow({
        width: windowConfig.small.width,
        height: windowConfig.small.height,
        resizable: windowConfig.small.resizable,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        show: false,
        icon: path.join(__dirname, '../assets', 'PAL Logo.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    if (process.platform === 'darwin') {
        const iconPath = path.join(__dirname, '../assets', 'PAL Logo.png');
        if (fs.existsSync(iconPath)) {
            electron_1.app.dock.setIcon(electron_1.nativeImage.createFromPath(iconPath));
        }
        else {
            console.warn('Dock icon file not found:', iconPath);
        }
    }
    mainWindow.loadFile(path.join(__dirname, '../src/ui/index.html'));
    mainWindow.on('blur', () => {
        // Optional: Hide the small window when it loses focus?
    });
    mainWindow.on('close', (event) => {
        if (!isQuitting && mainWindow) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
function positionChatBarOnCurrentScreen(window) {
    try {
        const point = electron_1.screen.getCursorScreenPoint();
        const display = electron_1.screen.getDisplayNearestPoint(point);
        const { workArea } = display;
        const { width: windowWidth, height: windowHeight } = windowConfig.small;
        const x = Math.floor(workArea.x + (workArea.width / 2) - (windowWidth / 2));
        // Position slightly above the bottom edge
        const y = Math.floor(workArea.y + workArea.height - windowHeight - 50); // 50px margin from bottom
        window.setPosition(x, y);
    }
    catch (error) {
        console.error("Error positioning window:", error);
        // Fallback positioning if screen API fails
        window.center();
    }
}
function showChatBarWindow() {
    if (!mainWindow) {
        createWindow();
    }
    if (!mainWindow) {
        console.error("Failed to create mainWindow for showChatBarWindow");
        return; // Guard if creation failed
    }
    mainWindow.setAlwaysOnTop(true); // Make sure it's on top when shown
    // mainWindow.setSkipTaskbar(false); // Keep in taskbar
    mainWindow.resizable = windowConfig.small.resizable;
    // Ensure the size is set correctly before positioning
    mainWindow.setSize(windowConfig.small.width, windowConfig.small.height, false); // Set size without animation
    positionChatBarOnCurrentScreen(mainWindow); // *** Use new positioning logic ***
    mainWindow.show();
    mainWindow.focus();
}
function hideChatBarWindow() {
    if (mainWindow) {
        mainWindow.hide();
    }
}
function toggleChatBarVisibility() {
    if (!mainWindow) {
        console.log("Toggle: MainWindow doesn't exist, creating and showing Chat Bar.");
        showChatBarWindow(); // Create and show if it doesn't exist
        return;
    }
    // If it's visible AND it's the small chat bar (not resizable)
    if (mainWindow.isVisible() && !mainWindow.isResizable()) {
        console.log("Toggle: Chat Bar is visible, hiding.");
        hideChatBarWindow();
    }
    else { // If it's hidden, or it's the full window (resizable)
        console.log("Toggle: Window hidden or full size, showing Chat Bar.");
        showChatBarWindow(); // Show (or bring to front) the chat bar configuration
    }
}
function showFullChatWindow() {
    if (!mainWindow) {
        createWindow(); // Create if it doesn't exist
    }
    if (!mainWindow) {
        console.error("Failed to create mainWindow for showFullChatWindow");
        return; // Guard
    }
    mainWindow.setAlwaysOnTop(false); // *** Full window shouldn't be always on top ***
    mainWindow.setSkipTaskbar(false); // *** Ensure it's in taskbar ***
    mainWindow.resizable = windowConfig.full.resizable;
    mainWindow.setSize(windowConfig.full.width, windowConfig.full.height, true); // Animate?
    mainWindow.center();
    mainWindow.show();
    mainWindow.focus();
}
function createTray() {
    let trayIcon;
    // Use specific template naming for macOS for auto dark/light mode handling
    const iconFileName = process.platform === 'darwin' ? 'PAL Logo_Template.png' : 'PAL Logo.png';
    // Construct path relative to the build output directory
    const iconPath = path.join(__dirname, '../assets', iconFileName);
    console.log(`Attempting to load tray icon from: ${iconPath}`);
    try {
        if (fs.existsSync(iconPath)) {
            trayIcon = electron_1.nativeImage.createFromPath(iconPath);
            if (process.platform === 'darwin') {
                // Template image naming convention handles automatic inversion
                // Resize if the source icon isn't the desired tray size (e.g., 22px height on macOS)
                trayIcon = trayIcon.resize({ height: 22 });
            }
            else {
                trayIcon = trayIcon.resize({ width: 16, height: 16 });
            }
        }
        else {
            console.warn(`Tray icon file not found at ${iconPath}. Using fallback.`);
            // Attempt to load non-template version as fallback on Mac
            const fallbackPath = path.join(__dirname, '../assets', 'PAL Logo.png');
            if (process.platform === 'darwin' && fs.existsSync(fallbackPath)) {
                console.log(`Using fallback non-template icon: ${fallbackPath}`);
                trayIcon = electron_1.nativeImage.createFromPath(fallbackPath).resize({ height: 22 });
            }
            else {
                console.log('Using empty fallback icon.');
                trayIcon = electron_1.nativeImage.createEmpty().resize({ width: 16, height: 16 }); // Absolute fallback
            }
        }
    }
    catch (error) {
        console.error('Error loading tray icon:', error);
        trayIcon = electron_1.nativeImage.createEmpty().resize({ width: 16, height: 16 });
    }
    tray = new electron_1.Tray(trayIcon);
    updateTrayMenu(); // Initial menu setup
    // Left click toggles chat bar visibility
    tray.on('click', toggleChatBarVisibility);
    // No need to explicitly subscribe for theme changes on macOS if using Template image naming
}
function updateTrayMenu() {
    if (!tray)
        return;
    const contextMenu = electron_1.Menu.buildFromTemplate([
        {
            label: 'Show ChatBar (Alt+Space)', // Updated Label
            click: () => {
                toggleChatBarVisibility(); // *** Use toggle function ***
            }
        },
        // { // *** NEW: Show MiniWindow (Commented out - Requires IPC and renderer changes) ***
        //   label: 'Show MiniWindow',
        //   click: () => {
        //     if (mainWindow && mainWindow.webContents) {
        //       mainWindow.webContents.send('show-mini-window');
        //     } else {
        //        console.log("Cannot send show-mini-window IPC: mainWindow not available.");
        //     }
        //   }
        // },
        {
            label: 'New Chat',
            click: () => {
                console.log('Tray Menu: New Chat clicked');
                showFullChatWindow(); // Show the full window directly
                // Send IPC after a short delay to ensure window is ready
                setTimeout(() => {
                    if (mainWindow && mainWindow.webContents) {
                        console.log('Tray Menu: Sending new-chat IPC');
                        mainWindow.webContents.send('new-chat');
                    }
                    else {
                        console.log('Tray Menu: Cannot send new-chat IPC, mainWindow not ready?');
                    }
                }, 150); // Increased delay slightly
            }
        },
        { type: 'separator' },
        {
            label: 'Quit Agent Pal',
            click: () => {
                isQuitting = true;
                electron_1.app.quit();
            }
        }
    ]);
    tray.setToolTip('Agent Pal');
    tray.setContextMenu(contextMenu);
}
function registerShortcuts() {
    // Unregister existing shortcut if necessary before registering
    electron_1.globalShortcut.unregister('Alt+Space');
    const ret = electron_1.globalShortcut.register('Alt+Space', () => {
        console.log('Alt+Space pressed - Toggling Chat Bar');
        toggleChatBarVisibility(); // *** Use toggle function ***
    });
    if (!ret) {
        console.error('Failed to register global shortcut Alt+Space');
    }
    console.log(`Alt+Space registered: ${electron_1.globalShortcut.isRegistered('Alt+Space')}`);
}
function setupIpcHandlers() {
    electron_1.ipcMain.on('hide-window', () => {
        console.log('IPC: hide-window received');
        hideChatBarWindow();
    });
    electron_1.ipcMain.on('toggle-window-size', () => {
        console.log('IPC received: toggle-window-size - showing full window');
        showFullChatWindow(); // *** Use updated show function ***
    });
    // Handler for renderer asking for new chat (often triggered by MiniWindow expand or tray)
    electron_1.ipcMain.on('create-new-chat', () => {
        console.log('IPC received: create-new-chat - Forwarding to renderer');
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('new-chat'); // Forward to renderer
        }
    });
    // *** Placeholder for MiniWindow IPC ***
    // ipcMain.on('show-mini-window', () => { ... });
    // --- Existing Handlers ---
    electron_1.ipcMain.handle('request-microphone-permission', async () => {
    });
    electron_1.ipcMain.handle('get-audio-devices', async () => {
    });
    electron_1.ipcMain.handle('start-audio-recording', async (event, deviceId) => {
    });
    electron_1.ipcMain.handle('stop-audio-recording', async () => {
    });
    electron_1.ipcMain.handle('ask-question', async (event, question) => {
    });
    electron_1.ipcMain.handle('toggle-recording-from-external', async () => {
    });
    electron_1.ipcMain.handle('get-recording-status', async () => {
    });
}
electron_1.app.on('before-quit', () => {
    console.log('App before-quit');
    isQuitting = true;
    electron_1.globalShortcut.unregisterAll();
});
electron_1.app.on('will-quit', () => {
    electron_1.globalShortcut.unregisterAll();
});
electron_1.app.on('activate', () => {
    console.log('App activate');
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
    // If window exists, toggle chat bar visibility (show if hidden/full, hide if chat bar)
    console.log("App activated (Dock click)");
    toggleChatBarVisibility(); // *** Use toggle function ***
});
electron_1.app.on('window-all-closed', () => {
    console.log('App window-all-closed');
});
electron_1.app.whenReady().then(async () => {
    console.log('App ready');
    electron_1.app.name = 'Agent Pal';
    createWindow();
    createTray();
    registerShortcuts();
    setupIpcHandlers();
    console.log('Agent Pal initialization complete.');
    if (process.platform === 'darwin') {
        electron_1.app.dock?.hide();
    }
});
