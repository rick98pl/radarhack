const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
// Simple development check without external dependency
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Get the primary display's work area size
  const primaryDisplay = screen.getPrimaryDisplay();
  
  // Debug: Log all display information
  console.log('=== DISPLAY DEBUG INFO ===');
  console.log('Primary Display Object:', primaryDisplay);
  console.log('Work Area Size:', primaryDisplay.workAreaSize);
  console.log('Screen Size:', primaryDisplay.size);
  console.log('Scale Factor:', primaryDisplay.scaleFactor);
  console.log('Bounds:', primaryDisplay.bounds);
  console.log('Work Area:', primaryDisplay.workArea);
  console.log('========================');
  
  const { width: displayWidth, height: displayHeight } = primaryDisplay.workAreaSize;
  
  // Calculate window size as 1/3 of monitor height (square window)
  const windowSize = Math.floor(displayHeight / 2.25);
  const xPosition = Math.floor((displayWidth - windowSize) / 2);
  const yPosition = Math.floor((displayHeight - windowSize) / 2);
  
  // Debug: Log calculated values
  console.log('Display Width:', displayWidth);
  console.log('Display Height:', displayHeight);
  console.log('Window Size (1/3 of height):', windowSize);
  console.log('Calculated X Position (centered):', xPosition);
  console.log('Calculated Y Position (centered):', yPosition);
  console.log('Window will be centered at:', xPosition, yPosition);
  
  // Create the browser window - dynamic size based on monitor
  mainWindow = new BrowserWindow({
    width: windowSize,  // Dynamic size - 1/3 of monitor height
    height: windowSize, // Square window for circular radar
    minWidth: 200,  // Minimum size
    minHeight: 200, // Minimum size
    maxWidth: 1200, // Maximum size
    maxHeight: 1200, // Maximum size
    x: xPosition,  // Dynamic x position - centered on screen
    y: yPosition,  // Dynamic y position - centered on screen
    alwaysOnTop: true,
    frame: false, // Remove default frame
    transparent: true, // Enable transparency
    opacity: 0.88, // Set 80% opacity
    resizable: false, // CHANGED: Disable resizing - only use +/- buttons
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
          /* EVERYTHING is non-draggable by default */
          -webkit-app-region: no-drag;
        }
        
        /* Use a single size variable for both width and height */
        :root {
          --radar-size: min(calc(100vw - 200px), calc(100vh - 200px));
        }

        /* ===== CRITICAL: TOOLBAR MUST NEVER EVER BE DRAGGABLE ===== */
        /* ONLY THE RADAR IFRAME SHOULD BE DRAGGABLE */
        /* =========================================================== */
        
        .title-bar {
          position: fixed;
          top: 50px;
          right: 100px; /* Moved 100px left from right edge */
          width: 210px;
          height: 30px;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(10px);
          display: flex;
          justify-content: flex-end;
          align-items: center;
          z-index: 1003; /* Highest z-index */
          /* CRITICAL: TOOLBAR IS NEVER DRAGGABLE */
          -webkit-app-region: no-drag !important;
          padding-right: 8px;
          box-sizing: border-box;
          pointer-events: auto !important;
        }

        /* CRITICAL: Ensure EVERY part of toolbar is non-draggable */
        .title-bar,
        .title-bar *,
        .title-bar-right,
        .title-bar-right *,
        .title-bar::before,
        .title-bar::after {
          -webkit-app-region: no-drag !important;
          pointer-events: auto !important;
        }

        .title-bar-right {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: none;
          -webkit-app-region: no-drag !important;
          pointer-events: auto !important;
        }
        
        /* CRITICAL: ALL TOOLBAR BUTTONS ARE NON-DRAGGABLE */
        .refresh-btn, .rotate-btn, .bomb-toggle-btn, .resize-btn-toolbar, .close-btn {
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
          -webkit-app-region: no-drag !important; /* NEVER DRAGGABLE */
          pointer-events: auto !important; /* ALWAYS CLICKABLE */
          position: relative;
          z-index: 1004; /* Even higher z-index */
          user-select: none;
          -webkit-user-select: none;
        }

        /* SPECIAL STYLING: Make refresh button green background */
        .refresh-btn {
          background: rgba(34, 197, 94, 0.7); /* Green background for refresh button */
        }

        .refresh-btn:hover {
          background: rgba(34, 197, 94, 0.9); /* Darker green on hover */
        }

        .rotate-btn:hover, .bomb-toggle-btn:hover, .resize-btn-toolbar:hover {
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

        .resize-btn-toolbar {
          font-size: 16px;
          font-weight: bold;
        }

        .version-text {
          color: rgba(255, 255, 255, 0.8);
          font-size: 11px;
          font-weight: 500;
          margin-right: 4px;
          -webkit-app-region: no-drag !important;
          pointer-events: none;
          position: relative;
          z-index: 1004;
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
          /* Container is non-draggable */
          -webkit-app-region: no-drag;
        }
        
        /* ===== ONLY THE RADAR IFRAME IS DRAGGABLE ===== */
        iframe {
          /* Perfect circle - centered in viewport */
          width: var(--radar-size);
          height: var(--radar-size);
          border: 2px solid #ef4444;
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
          
          /* ONLY THE IFRAME IS DRAGGABLE */
          -webkit-app-region: drag;
          pointer-events: auto;
          cursor: move;
          z-index: 1; /* Lower z-index than toolbar */
        }

        /* Override iframe dragging when hovering over interactive elements inside */
        iframe:hover {
          cursor: move;
        }

        /* Resize buttons - positioned under radar */
        .resize-btn {
          position: fixed;
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: bold;
          transition: all 0.2s;
          -webkit-app-region: no-drag !important;
          z-index: 1002;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          pointer-events: auto !important;
        }

        .resize-btn:hover {
          background: rgba(139, 92, 246, 0.8);
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .resize-btn:active {
          transform: scale(0.95);
        }

        .resize-btn-minus {
          /* Position under radar on the left */
          top: calc(50% + var(--radar-size)/2 + 20px);
          left: calc(50% - var(--radar-size)/2 - 50px);
        }

        .resize-btn-plus {
          /* Position under radar on the right */
          top: calc(50% + var(--radar-size)/2 + 20px);
          right: calc(50% - var(--radar-size)/2 - 50px);
        }

        /* Bomb status display - completely separate from iframe */
        .bomb-status {
          position: fixed;
          top: calc(50% + var(--radar-size)/2 + 30px); /* Position below iframe circle */
          left: 50%; /* Centered horizontally */
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
          /* NO DRAGGING */
          -webkit-app-region: no-drag !important;
          pointer-events: auto;
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
      <!-- CRITICAL: TOOLBAR IS NEVER DRAGGABLE - ONLY RADAR IS DRAGGABLE -->
      <div class="title-bar">
        <div class="title-bar-right">
          <button class="resize-btn-toolbar" onclick="makeSmaller()" title="Decrease size by 50px">−</button>
          <button class="resize-btn-toolbar" onclick="makeBigger()" title="Increase size by 50px">+</button>
          <button class="refresh-btn" onclick="refreshApp()" title="Refresh">↻</button>
          <button class="rotate-btn" onclick="rotateRadar()" title="Rotate 90°">⟲</button>
          <button class="bomb-toggle-btn" onclick="toggleBombDisplay()" title="Toggle Bomb Status">💣</button>
          <span class="version-text">v2.0</span>
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
        
        // Simple resize functions
        function makeSmaller() {
          if (window.electronAPI && window.electronAPI.getWindowBounds && window.electronAPI.resizeWindow) {
            window.electronAPI.getWindowBounds().then(bounds => {
              const currentSize = bounds.width;
              const newSize = Math.min(1200, Math.max(200, currentSize - 50));
              window.electronAPI.resizeWindow(newSize, newSize);
            }).catch(err => {
              console.error('Error in getWindowBounds:', err);
            });
          } else {
            console.error('electronAPI not available or missing methods');
          }
        }

        function makeBigger() {
          if (window.electronAPI && window.electronAPI.getWindowBounds && window.electronAPI.resizeWindow) {
            window.electronAPI.getWindowBounds().then(bounds => {
              const currentSize = bounds.width;
              const newSize = Math.min(1200, Math.max(200, currentSize + 50));
              window.electronAPI.resizeWindow(newSize, newSize);
            }).catch(err => {
              console.error('Error in getWindowBounds:', err);
            });
          } else {
            console.error('electronAPI not available or missing methods');
          }
        }
        
        // Window control functions
        function refreshApp() {
          console.log('refreshApp called');
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
          console.log('toggleBombDisplay called');
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
          console.log('rotateRadar called');
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
        
        // CRITICAL: Ensure toolbar buttons are never draggable
        document.addEventListener('DOMContentLoaded', () => {
          console.log('DOM loaded, setting up event listeners');
          
          // Force all toolbar elements to be non-draggable
          const toolbar = document.querySelector('.title-bar');
          const allToolbarElements = toolbar.querySelectorAll('*');
          
          [toolbar, ...allToolbarElements].forEach(element => {
            element.style.webkitAppRegion = 'no-drag';
            element.style.pointerEvents = 'auto';
          });
          
          // Double-check that all buttons have click handlers and are non-draggable
          const buttons = document.querySelectorAll('.title-bar button, .resize-btn');
          buttons.forEach(button => {
            button.style.webkitAppRegion = 'no-drag';
            button.style.pointerEvents = 'auto';
            
            // Prevent any dragging on buttons
            button.addEventListener('mousedown', (e) => {
              e.stopPropagation();
            });
            
            button.addEventListener('dragstart', (e) => {
              e.preventDefault();
              e.stopPropagation();
              return false;
            });
          });
          
          // Setup button event listeners
          const resizeMinusBtn = document.querySelector('.resize-btn-toolbar[title*="Decrease"]');
          const resizePlusBtn = document.querySelector('.resize-btn-toolbar[title*="Increase"]');
          const refreshBtn = document.querySelector('.refresh-btn');
          const rotateBtn = document.querySelector('.rotate-btn');
          const bombBtn = document.querySelector('.bomb-toggle-btn');
          const closeBtn = document.querySelector('.close-btn');
          
          if (resizeMinusBtn) {
            resizeMinusBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Resize minus clicked');
              makeSmaller();
            });
          }
          
          if (resizePlusBtn) {
            resizePlusBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Resize plus clicked');
              makeBigger();
            });
          }
          
          if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Refresh clicked');
              refreshApp();
            });
          }
          
          if (rotateBtn) {
            rotateBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Rotate clicked');
              rotateRadar();
            });
          }
          
          if (bombBtn) {
            bombBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Bomb toggle clicked via event listener');
              toggleBombDisplay();
            });
            
            // Also add mousedown/mouseup for extra reliability
            bombBtn.addEventListener('mousedown', (e) => {
              e.preventDefault();
              e.stopPropagation();
            });
            
            bombBtn.addEventListener('mouseup', (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Bomb toggle mouseup');
              // Small delay to ensure it's not conflicting with other events
              setTimeout(() => {
                toggleBombDisplay();
              }, 10);
            });
          }
          
          if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Close clicked');
              closeApp();
            });
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
  
  // REMOVED: No setInterval with document access in main process
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

// IPC handler for getting window bounds
ipcMain.handle('get-window-bounds', () => {
  if (mainWindow) {
    return mainWindow.getBounds();
  }
  return null;
});

// IPC handler for resizing window
ipcMain.handle('resize-window', (event, width, height) => {
  if (mainWindow) {
    const currentBounds = mainWindow.getBounds();
    mainWindow.setBounds({
      x: currentBounds.x,
      y: currentBounds.y,
      width: width,
      height: height
    });
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