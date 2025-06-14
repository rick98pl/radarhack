const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
// Simple development check without external dependency
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window - optimized size for radar
  mainWindow = new BrowserWindow({
    width: 515,  // Smaller, optimized size
    height: 515, // Square window for circular radar
    minWidth: 400,  // Minimum size
    minHeight: 400, // Minimum size
    maxWidth: 1200, // Maximum size
    maxHeight: 1200, // Maximum size
    x: 1400,
    y: 500,
    alwaysOnTop: true,
    frame: false, // Remove default frame
    transparent: true, // Enable transparency
    opacity: 0.88, // Set 80% opacity
    resizable: true, // Allow resizing
    skipTaskbar: false, // Keep in taskbar but always on top
    focusable: true, // Allow focusing
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      devTools: isDev, // Only enable devTools in development
      preload: path.join(__dirname, 'preload.js') // This should work for both dev and build
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false
  });

  // Force window to stay on top even when other apps are focused
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  
  // Additional method to ensure it stays on top
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Define iframe source based on environment
  const iframeSrc = isDev ? 'http://localhost:5173' : 'data:text/html,<h1>App Content</h1>';

  // Create HTML wrapper with circular iframe
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          /* Make background completely transparent */
          background: transparent;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          position: relative;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        /* Custom title bar controls */
        .title-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 32px;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(10px);
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 1000;
          -webkit-app-region: drag;
        }
        
        .title-bar-left {
          display: flex;
          align-items: center;
          padding-left: 8px;
          flex: 1;
        }
        
        .title-bar-center {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
        }
        
        .title-bar-right {
          display: flex;
          align-items: center;
          padding-right: 8px;
          flex: 1;
          justify-content: flex-end;
        }
        
        .refresh-btn, .close-btn {
          width: 24px;
          height: 24px;
          border: none;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          transition: background 0.2s;
          -webkit-app-region: no-drag;
        }
        
        .refresh-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .close-btn:hover {
          background: rgba(255, 0, 0, 0.7);
        }
        
        .version-text {
          color: rgba(255, 255, 255, 0.8);
          font-size: 11px;
          font-weight: 500;
          margin-right: 8px;
        }
        
        .author-text {
          color: rgba(255, 255, 255, 0.8);
          font-size: 11px;
          font-weight: 400;
          pointer-events: none;
        }
        
        .author-text .author-name {
          color: #1e40af; /* Darker blue color for r0gal */
          font-weight: 500;
        }
        
        .iframe-container {
          width: 100vw;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: flex-start; /* Align to top instead of center */
          padding: 10px;
          padding-top: 37px; /* 32px title bar + 5px gap */
          box-sizing: border-box;
        }
        
        iframe {
          /* Perfect circle - fixed size based on window dimensions */
          width: min(calc(100vw - 20px), calc(100vh - 57px)); /* Choose smaller dimension, account for all padding */
          height: min(calc(100vw - 20px), calc(100vh - 57px));
          border: none;
          background: white;
          border-radius: 50%; /* Makes it circular */
          box-shadow: 
            0 0 30px rgba(0, 0, 0, 0.4),
            0 0 60px rgba(0, 0, 0, 0.2),
            inset 0 0 0 2px rgba(255, 255, 255, 0.1); /* Subtle inner border */
          transform-origin: center center;
          transition: transform 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
        }
      </style>
    </head>
    <body>
      <!-- Custom title bar -->
      <div class="title-bar">
        <div class="title-bar-left">
          <button class="refresh-btn" onclick="refreshApp()" title="Refresh">↻</button>
        </div>
        <div class="title-bar-center">
          <span class="author-text"><span class="author-name">radarhack</span></span>
        </div>
        <div class="title-bar-right">
          <span class="version-text">v1.0.0</span>
          <button class="close-btn" onclick="closeApp()" title="Close">×</button>
        </div>
      </div>
      
      <div class="iframe-container" id="iframeContainer">
        <iframe src="${iframeSrc}" frameborder="0" id="mainIframe"></iframe>
      </div>
      
      <script>
        let currentRotation = 0;
        const iframe = document.getElementById('mainIframe');
        const IS_DEV = ${isDev}; // Pass isDev as a JavaScript boolean
        
        // Window control functions
        function refreshApp() {
          const iframeSrc = IS_DEV ? 'http://localhost:5173' : 'data:text/html,<h1>App Content</h1>';
          document.getElementById('mainIframe').src = iframeSrc;
        }
        
        function closeApp() {
          console.log('Close button clicked');
          
          // Check if electronAPI is available
          if (window.electronAPI && window.electronAPI.closeApp) {
            console.log('Calling electronAPI.closeApp()');
            window.electronAPI.closeApp().catch(err => {
              console.error('Error calling closeApp:', err);
              // Fallback: try to close window directly
              window.close();
            });
          } else {
            console.error('electronAPI not available');
            // Fallback: try to close window directly
            window.close();
          }
        }
        
        // Listen for messages from the iframe (React app)
        window.addEventListener('message', (event) => {
          if (!IS_DEV || event.origin !== 'http://localhost:5173') return;
          
          // Handle rotation angle updates with smart path calculation
          if (event.data.type === 'ROTATION_ANGLE') {
            const targetAngle = event.data.angle;
            
            // REVERSE the rotation direction and ADD 90° offset
            const reversedTargetAngle = -targetAngle - 90;
            
            // Calculate the shortest path from current to target
            let currentNormalized = ((currentRotation % 360) + 360) % 360;
            let targetNormalized = ((reversedTargetAngle % 360) + 360) % 360;
            
            let diff = targetNormalized - currentNormalized;
            
            // Choose shortest path
            if (diff > 180) {
              diff -= 360;
            } else if (diff < -180) {
              diff += 360;
            }
            
            // Apply rotation to iframe only, not container
            const newRotation = currentRotation + diff;
            iframe.style.transform = \`rotate(\${newRotation}deg)\`;
            currentRotation = newRotation;
            return;
          }
        });
        
        // Debug: Log when page loads
        console.log('HTML wrapper loaded, electronAPI available:', !!window.electronAPI);
        console.log('Development mode:', IS_DEV);
      </script>
    </body>
    </html>
  `;

  // Load the HTML content directly
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Reinforce always on top after showing
    mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Force 1:1 aspect ratio when resizing
  mainWindow.on('resize', () => {
    const bounds = mainWindow.getBounds();
    const size = Math.min(bounds.width, bounds.height);
    
    // Only resize if dimensions are different
    if (bounds.width !== size || bounds.height !== size) {
      mainWindow.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: size,
        height: size
      });
    }
  });

  // Keep window always on top even when focus changes
  mainWindow.on('blur', () => {
    // Immediately restore always on top when focus is lost
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
        mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      }
    }, 100);
  });

  // Enhanced navigation handling
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // Allow data URLs (for our HTML wrapper)
    if (parsedUrl.protocol === 'data:') {
      return;
    }
    
    // Allow localhost navigation only in dev mode
    if (isDev && (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')) {
      return;
    }
    
    // For external links, open in default browser instead
    event.preventDefault();
    require('electron').shell.openExternal(navigationUrl);
  });

  // Handle new window requests
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow React dev server error overlays and localhost windows only in dev
    if (isDev && (url.includes('localhost') || url.includes('127.0.0.1'))) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 800,
          height: 600,
          webPreferences: {
            devTools: true
          }
        }
      };
    }
    
    // External links go to default browser
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Enhanced app event handlers
app.whenReady().then(() => {
  createWindow();
  
  // Set up periodic check to ensure window stays on top
  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    }
  }, 5000); // Check every 5 seconds
}).catch(error => {
  console.error('Error during app startup:', error);
});

// IPC handler for close button
ipcMain.handle('close-app', () => {
  console.log('IPC close-app handler called');
  if (mainWindow) {
    mainWindow.close();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle certificate errors for localhost
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith('https://localhost') || url.startsWith('https://127.0.0.1')) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});