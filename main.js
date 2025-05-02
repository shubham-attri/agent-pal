const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, nativeImage, screen } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow = null
let tray = null
let isQuitting = false

// Window dimensions and positions
const windowConfig = {
  small: {
    width: 600,
    height: 60,  // Smaller height for just the search bar
    resizable: false
  },
  full: {
    width: 600,
    height: 500,  // Taller for chat view
    resizable: true
  }
}

function createWindow() {
  // Get display size
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize
  
  // Create the browser window with small dimensions
  mainWindow = new BrowserWindow({
    width: windowConfig.small.width,
    height: windowConfig.small.height,
    resizable: windowConfig.small.resizable,
    frame: false, // Frameless window for a cleaner look
    skipTaskbar: true, // Don't show in taskbar
    transparent: true, // Make window transparent
    alwaysOnTop: true, // Keep window on top
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Position window at the bottom center of the screen (above dock)
  positionWindowAboveDock(mainWindow, windowConfig.small.width, windowConfig.small.height)

  mainWindow.loadFile('index.html')
  
  // Hide the window when close is clicked, don't quit the app
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
      return false
    }
    return true
  })
}

// Position the window above the dock
function positionWindowAboveDock(window, width, height) {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize
  
  // Position at bottom center, 100px above the bottom edge (which should be above dock)
  window.setPosition(
    Math.floor(screenWidth / 2 - width / 2),
    Math.floor(screenHeight - height - 100)
  )
}

function createTray() {
  // Try to load the PAL Logo SVG for the tray icon
  let icon
  
  // Try to load the tray icon from the assets folder
  const trayIconPath = path.join(__dirname, 'assets', 'PAL Transparent Logo.svg')
  
  try {
    // Check if the icon file exists
    if (fs.existsSync(trayIconPath)) {
      icon = nativeImage.createFromPath(trayIconPath)
      // Template image for better dark/light mode support
      icon.setTemplateImage(true)
    } else {
      // If no icon file, create a simple 16x16 pixel image
      icon = nativeImage.createEmpty()
      const size = { width: 16, height: 16 }
      icon = icon.resize(size)
    }
  } catch (error) {
    console.error('Error loading tray icon:', error)
    icon = nativeImage.createEmpty().resize({ width: 16, height: 16 })
  }
  
  tray = new Tray(icon)
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open Agent Pal', 
      click: () => {
        showWindow()
      }
    },
    { 
      label: 'New Chat', 
      click: () => {
        showWindow()
        // Tell renderer to create new chat
        if (mainWindow) {
          mainWindow.webContents.send('new-chat')
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])
  
  tray.setToolTip('Agent Pal')
  tray.setContextMenu(contextMenu)
  
  // Toggle window on tray icon click
  tray.on('click', () => {
    toggleWindow()
  })
}

function toggleWindow() {
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    showWindow()
  }
}

function showWindow() {
  if (!mainWindow.isVisible()) {
    mainWindow.show()
  }
  mainWindow.focus()
}

function toggleWindowSize() {
  const currentSize = mainWindow.getSize()
  const isSmall = currentSize[0] === windowConfig.small.width && currentSize[1] === windowConfig.small.height

  if (isSmall) {
    // Switch to large size
    mainWindow.setSize(windowConfig.full.width, windowConfig.full.height)
    // Position window with the same horizontal center, but higher up
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize
    mainWindow.setPosition(
      Math.floor(screenWidth / 2 - windowConfig.full.width / 2),
      Math.floor(screenHeight - windowConfig.full.height - 120)
    )
    mainWindow.setResizable(windowConfig.full.resizable)
  } else {
    // Switch to small size
    mainWindow.setSize(windowConfig.small.width, windowConfig.small.height)
    // Position in center above dock
    positionWindowAboveDock(mainWindow, windowConfig.small.width, windowConfig.small.height)
    mainWindow.setResizable(windowConfig.small.resizable)
  }
}

function registerShortcuts() {
  // Register global shortcut to show/hide window (Alt+Space or Option+Space)
  globalShortcut.register('Alt+Space', () => {
    toggleWindow()
  })
  
  // Add additional shortcut for Mac users
  globalShortcut.register('Option+Space', () => {
    toggleWindow()
  })
}

app.whenReady().then(() => {
  createWindow()
  createTray()
  registerShortcuts()
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll()
})

// Handle question answering IPC
ipcMain.handle('ask-question', async (event, question) => {
  // This will be where you connect to your AI/knowledge graph
  return `Simulated answer to: ${question}`
})

// Add handlers for window controls
ipcMain.handle('minimize-window', () => {
  mainWindow.minimize()
})

ipcMain.handle('toggle-window-size', () => {
  toggleWindowSize()
})

ipcMain.handle('close-window', () => {
  mainWindow.hide()
})

// Add handler for new chat
ipcMain.handle('create-new-chat', () => {
  // This will be expanded in the future
  return { success: true }
}) 