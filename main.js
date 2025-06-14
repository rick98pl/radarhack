const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
// Simple development check without external dependency
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window - optimized size for radar
  mainWindow = new BrowserWindow({
    width: 615,  // Smaller, optimized size
    height: 615, // Square window for circular radar
    minWidth: 400,  // Minimum size
    minHeight: 400, // Minimum size
    maxWidth: 1200, // Maximum size
    maxHeight: 1200, // Maximum size
    x: 1300,
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
        
        /* Custom title bar controls - MOVED 50px HIGHER */
.title-bar {
  position: fixed;
  top: 50px; /* CHANGED: Moved from 100px to 50px (50px higher) */
  right: 0;
  width: 130px; /* Kept at 130px as specified */
  height: 30px; /* Changed from calculated height to fixed 30px */
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: flex-end;
  align-items: center; /* Changed from flex-start to center for vertical centering */
  z-index: 1000;
  -webkit-app-region: drag;
  padding-right: 8px;
  padding-top: 0; /* Removed top padding since we're centering */
  box-sizing: border-box;
}

/* Remove the left and center sections since we only want right-aligned controls */
.title-bar-left {
  display: none; /* Hide the left section with refresh and rotate buttons */
}

.title-bar-center {
  display: none; /* Hide the center section with author text */
}

.title-bar-right {
  display: flex;
  align-items: center;
  gap: 4px; /* Add gap between elements */
  flex: none; /* Don't flex, use natural width */
}
        
        .refresh-btn, .rotate-btn, .bomb-toggle-btn, .close-btn {
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

.refresh-btn:hover, .rotate-btn:hover, .bomb-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.bomb-toggle-btn.active {
  background: rgba(255, 193, 7, 0.6);
}

.close-btn:hover {
  background: rgba(255, 0, 0, 0.7);
}

.rotate-btn {
  font-size: 14px;
}

.version-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 11px;
  font-weight: 500;
  margin-right: 4px; /* Reduced margin */
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
          align-items: center;
          padding: 20px;
          box-sizing: border-box;
          position: relative;
          /* CHANGED: Move radar 150px to the right */
          transform: translateX(100px);
        }
        
       iframe {
  /* Perfect circle - centered in viewport */
  width: min(calc(100vw - 200px), calc(100vh - 200px));
  height: min(calc(100vw - 200px), calc(100vh - 200px));
  border: 2px solid #8b5cf6;
  background: white;
  border-radius: 50%;
  
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.3),
    0 1px 4px rgba(0, 0, 0, 0.2);
    
  transform-origin: center center;
  transition: transform 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
  
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
  
  outline: none;
  -webkit-font-smoothing: antialiased;
}

        /* Bomb status display - completely separate from iframe */
        .bomb-status {
          position: fixed;
          top: calc(50% + min(calc(100vw - 200px), calc(100vh - 200px))/2 + 30px); /* Position below iframe circle */
          left: calc(50% + 100px); /* CHANGED: Offset bomb status to follow radar position */
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 12px 20px;
          display: none;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          font-weight: 600;
          color: white;
          z-index: 999;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          min-width: 200px;
          justify-content: center;
        }

        .bomb-status.visible {
          display: flex;
        }

        .bomb-status.force-visible {
          display: flex !important;
        }

        .bomb-icon {
          font-size: 20px;
        }

        .bomb-timer {
          font-size: 18px;
          font-weight: bold;
        }

        .defuse-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-left: 12px;
          border-left: 1px solid rgba(255, 255, 255, 0.3);
        }

        .defuse-status {
          font-size: 12px;
          font-weight: 500;
        }

        .defuse-status.can-defuse {
          color: #4ade80;
        }

        .defuse-status.too-late {
          color: #f87171;
        }

        .defuse-player {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.8);
        }

        .defuse-timer {
          font-weight: bold;
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .status-indicator.planted {
          background: #f97316;
        }

        .status-indicator.defusing-safe {
          background: #4ade80;
        }

        .status-indicator.defusing-danger {
          background: #f87171;
        }

        .status-indicator.not-planted {
          background: #6b7280;
        }

        .status-indicator.not-defusing {
          background: #f97316;
        }

        .bomb-message {
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <!-- Custom title bar -->
      <!-- Custom title bar - 130px width, right-aligned -->
<div class="title-bar">
  <div class="title-bar-right">
    <button class="refresh-btn" onclick="refreshApp()" title="Refresh">↻</button>
    <button class="rotate-btn" onclick="rotateRadar()" title="Rotate 90°">⟲</button>
    <button class="bomb-toggle-btn" onclick="toggleBombDisplay()" title="Toggle Bomb Status">💣</button>
    <span class="version-text">v1.0.0</span>
    <button class="close-btn" onclick="closeApp()" title="Close">×</button>
  </div>
</div>
      
      <div class="iframe-container" id="iframeContainer">
        <iframe src="${iframeSrc}" frameborder="0" id="mainIframe"></iframe>
      </div>
      
      <!-- Bomb status display -->
      <div class="bomb-status" id="bombStatus">
        <span class="bomb-icon">💣</span>
        <span class="bomb-message">Not Planted</span>
        <div class="status-indicator not-planted"></div>
      </div>
      
      <script>
        let currentRotation = 0;
        let fixedRotationOffset = 0; // Track manual rotation offset
        let bombDisplayVisible = true; // Track bomb display toggle state (ON by default)
        let currentBombData = null; // Store current bomb data
        const iframe = document.getElementById('mainIframe');
        const IS_DEV = ${isDev}; // Pass isDev as a JavaScript boolean
        
        // Bomb status elements
        const bombStatus = document.getElementById('bombStatus');
        const bombTimer = document.getElementById('bombTimer');
        const defuseInfo = document.getElementById('defuseInfo');
        const defuseStatus = document.getElementById('defuseStatus');
        const defusePlayer = document.getElementById('defusePlayer');
        const defuseTimer = document.getElementById('defuseTimer');
        const statusIndicator = document.getElementById('statusIndicator');
        const bombToggleBtn = document.querySelector('.bomb-toggle-btn');
        
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
        
        // Function to toggle bomb display visibility
        function toggleBombDisplay() {
          bombDisplayVisible = !bombDisplayVisible;
          
          if (bombDisplayVisible) {
            bombToggleBtn.classList.add('active');
            bombStatus.classList.add('force-visible');
            // Update display with current bomb data or show default message
            if (currentBombData) {
              updateBombDisplay(currentBombData);
            } else {
              showDefaultBombStatus();
            }
          } else {
            bombToggleBtn.classList.remove('active');
            bombStatus.classList.remove('force-visible');
            bombStatus.classList.remove('visible');
          }
        }
        
        // Function to show default bomb status when no data is available
        function showDefaultBombStatus() {
          bombStatus.classList.add('force-visible');
          bombStatus.innerHTML = \`
            <span class="bomb-icon">💣</span>
            <span class="bomb-message">Not Planted</span>
            <div class="status-indicator not-planted"></div>
          \`;
        }
        function rotateRadar() {
          fixedRotationOffset += 90;
          updateRotation();
        }
        
        // Update rotation with both dynamic and fixed offset
        function updateRotation() {
          const totalRotation = currentRotation + fixedRotationOffset;
          iframe.style.transform = \`rotate(\${totalRotation}deg)\`;
        }
        
        // Function to update bomb status display
        function updateBombDisplay(bombData) {
          currentBombData = bombData; // Store current bomb data
          
          // If bomb display is force hidden, don't show anything
          if (!bombDisplayVisible) {
            if (!bombData || !bombData.isPlanted || bombData.isDefused) {
              bombStatus.classList.remove('visible');
            } else {
              bombStatus.classList.add('visible');
            }
            return;
          }
          
          // Force show when toggle is active
          bombStatus.classList.add('force-visible');
          
          // Handle different bomb states
          if (!bombData || !bombData.isPlanted) {
            // Not planted
            bombStatus.innerHTML = \`
              <span class="bomb-icon">💣</span>
              <span class="bomb-message">Not Planted</span>
              <div class="status-indicator not-planted"></div>
            \`;
            return;
          }
          
          if (bombData.isDefused) {
            // Defused
            bombStatus.innerHTML = \`
              <span class="bomb-icon">✅</span>
              <span class="bomb-message">Bomb Defused</span>
              <div class="status-indicator defusing-safe"></div>
            \`;
            return;
          }
          
          // Bomb is planted and active
          if (bombData.isDefusing) {
            // Someone is defusing
            const canDefuse = bombData.canDefuse;
            const playerName = bombData.defusingPlayer ? bombData.defusingPlayer.name : 'Unknown';
            
            bombStatus.innerHTML = \`
              <span class="bomb-icon">💣</span>
              <span class="bomb-timer">\${bombData.blowTime.toFixed(1)}s</span>
              <div class="defuse-info">
                <span style="font-size: 16px;">🔧</span>
                <div>
                  <div class="defuse-status \${canDefuse ? 'can-defuse' : 'too-late'}">\${canDefuse ? 'CAN DEFUSE' : 'TOO LATE!'}</div>
                  <div class="defuse-player">\${playerName}</div>
                </div>
                <span class="defuse-timer">\${bombData.defuseTime.toFixed(1)}s</span>
              </div>
              <div class="status-indicator \${canDefuse ? 'defusing-safe' : 'defusing-danger'}"></div>
            \`;
          } else {
            // Planted but not being defused
            bombStatus.innerHTML = \`
              <span class="bomb-icon">💣</span>
              <span class="bomb-timer">\${bombData.blowTime.toFixed(1)}s</span>
              <span class="bomb-message">Not Defused</span>
              <div class="status-indicator not-defusing"></div>
            \`;
          }
        }
        
        // Listen for messages from the iframe (React app)
        window.addEventListener('message', (event) => {
          if (!IS_DEV || event.origin !== 'http://localhost:5173') return;
          
          // Handle bomb status updates
          if (event.data.type === 'BOMB_STATUS') {
            console.log('[ELECTRON] 💣 Received bomb status:', event.data.bombStatus);
            updateBombDisplay(event.data.bombStatus);
            return;
          }
          
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
            currentRotation = newRotation;
            updateRotation(); // Use the new update function
            return;
          }
        });
        
        // Initialize bomb display on page load
        window.addEventListener('load', () => {
          if (bombDisplayVisible) {
            bombToggleBtn.classList.add('active');
            showDefaultBombStatus();
          }
        });
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