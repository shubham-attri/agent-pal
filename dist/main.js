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
electron_1.app.whenReady().then(() => {
    // Set app name that appears in menu bar
    electron_1.app.name = 'Agent Pal';
    // Make sure app is visible in dock
    if (process.platform === 'darwin') {
        electron_1.app.dock.show();
    }
    createWindow();
    createTray();
    registerShortcuts();
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
