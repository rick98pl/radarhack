const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let mainWindow;
const debug = false;
function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: displayWidth, height: displayHeight } = primaryDisplay.workAreaSize;
  const windowSize = Math.floor(displayHeight / 2.25);
  const xPosition = Math.floor((displayWidth - windowSize) / 2);
  const yPosition = Math.floor((displayHeight - windowSize) / 2);
  mainWindow = new BrowserWindow({
    width: windowSize,
    height: Math.floor(windowSize * (debug ? 1.45 : 1)),
    minWidth: 200,
    minHeight: 200,
    maxWidth: 1200,
    maxHeight: 1200,
    x: xPosition,
    y: yPosition,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    opacity: 0.88,
    resizable: false,
    skipTaskbar: false,
    focusable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      devTools: isDev,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false
  });
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  const iframeSrc = isDev ? 'http://localhost:5173' : 'data:text/html,<h1>App Content</h1>';
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>

      .rotation-debug {
  position: fixed;
  top: calc(50% + var(--radar-size)/2 + 80px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 12px 20px;
  color: white;
  font-family: monospace;
  font-size: 12px;
  z-index: 998;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  min-width: 300px;
  -webkit-app-region: no-drag;
  display: none;
}

.rotation-debug.visible {
  display: ${debug ? 'block' : 'none'};
}

        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: transparent;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          position: relative;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          -webkit-app-region: no-drag;
        }
        :root {
          --radar-size: min(calc(100vw - 200px), calc(100vh - 200px));
        }
        .title-bar {
          position: fixed;
          top: 50px;
          right: 100px;
          width: 198px;
          height: 30px;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(10px);
          display: flex;
          justify-content: flex-end;
          align-items: center;
          z-index: 1003;
          -webkit-app-region: no-drag !important;
          padding-right: 3px;
          box-sizing: border-box;
          pointer-events: all !important;
        }
        .title-bar,
        .title-bar *,
        .title-bar-right,
        .title-bar-right * {
          -webkit-app-region: no-drag !important;
          pointer-events: all !important;
        }
        .title-bar-right {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: none;
          -webkit-app-region: no-drag !important;
          pointer-events: all !important;
        }
        .refresh-btn, .rotate-btn, .bomb-toggle-btn, .resize-btn-toolbar, .close-btn {
          width: 24px !important;
          height: 24px !important;
          border: none !important;
          border-radius: 4px !important;
          background: rgba(255, 255, 255, 0.1) !important;
          color: white !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 12px !important;
          transition: background 0.2s !important;
          -webkit-app-region: no-drag !important;
          pointer-events: all !important;
          position: relative !important;
          z-index: 99999 !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          outline: none !important;
          border: 1px solid transparent !important;
          overflow: visible !important;
          touch-action: manipulation !important;
        }
        .refresh-btn *, .rotate-btn *, .bomb-toggle-btn *, .resize-btn-toolbar *, .close-btn * {
          pointer-events: none !important;
          -webkit-app-region: no-drag !important;
        }
        .refresh-btn {
          background: rgba(59, 130, 246, 0.7) !important;
        }
        .refresh-btn:hover {
          background: rgba(59, 130, 246, 0.9) !important;
        }
        .resize-btn-toolbar[title*="Increase"] {
          background: rgba(34, 197, 94, 0.7) !important;
        }
        .resize-btn-toolbar[title*="Increase"]:hover {
          background: rgba(34, 197, 94, 0.9) !important;
        }
        .resize-btn-toolbar[title*="Decrease"] {
          background: rgba(239, 68, 68, 0.7) !important;
        }
        .resize-btn-toolbar[title*="Decrease"]:hover {
          background: rgba(239, 68, 68, 0.9) !important;
        }
        .rotate-btn {
          background: rgba(245, 158, 11, 0.7) !important;
          font-size: 14px;
        }
        .rotate-btn:hover {
          background: rgba(245, 158, 11, 0.9) !important;
        }
        .bomb-toggle-btn {
          background: rgba(236, 72, 153, 0.7) !important;
        }
        .bomb-toggle-btn:hover {
          background: rgba(236, 72, 153, 0.9) !important;
        }
        .bomb-toggle-btn.active {
          background: rgba(255, 193, 7, 0.6);
        }
        .close-btn:hover {
          background: rgba(255, 0, 0, 0.7);
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
          color: #1e40af;
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
          -webkit-app-region: no-drag;
        }
        iframe {
          width: var(--radar-size);
          height: var(--radar-size);
          border: 2px solid #f59e0b;
          background: white;
          border-radius: 70%;
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
          -webkit-app-region: no-drag;
          pointer-events: auto;
          cursor: default;
          z-index: 1;
        }
        iframe:hover {
          cursor: default;
        }
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
          top: calc(50% + var(--radar-size)/2 + 20px);
          left: calc(50% - var(--radar-size)/2 - 50px);
        }
        .resize-btn-plus {
          top: calc(50% + var(--radar-size)/2 + 20px);
          right: calc(50% - var(--radar-size)/2 - 50px);
        }
        .bomb-status {
          position: fixed;
          top: calc(50% + var(--radar-size)/2 + 30px);
          left: 50%;
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
          -webkit-app-region: drag;
          pointer-events: auto;
          cursor: move;
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
      <div class="title-bar">
        <div class="title-bar-right">
          <button class="resize-btn-toolbar" onclick="makeSmaller()" title="Decrease size by 50px">−</button>
          <button class="resize-btn-toolbar" onclick="makeBigger()" title="Increase size by 50px">+</button>
          <button class="refresh-btn" onclick="refreshApp()" title="Refresh">↻</button>
          <button class="rotate-btn" title="Rotate 90°">⟲</button>
          <button class="bomb-toggle-btn" onclick="toggleBombDisplay()" title="Toggle Bomb Status">💣</button>
          <span class="version-text">v2.0</span>
          <button class="close-btn" onclick="closeApp()" title="Close">×</button>
        </div>
      </div>
      <div class="iframe-container" id="iframeContainer">
        <iframe src="${iframeSrc}" frameborder="0" id="mainIframe"></iframe>
      </div>
      <div class="bomb-status" id="bombStatus">
        <span class="bomb-icon">💣</span>
        <span class="bomb-message">Not Planted (👆)</span>
        <div class="status-indicator not-planted"></div>
      </div>

      <div class="rotation-debug visible" id="rotationDebug">
  <div style="font-weight: bold; margin-bottom: 8px; color: #fbbf24;">🔄 Rotation Debug</div>
  <div>Target Angle: <span style="color: #60a5fa;">0.00°</span></div>
  <div>Reversed Target: <span style="color: #f87171;">0.00°</span></div>
  <div>Current Normalized: <span style="color: #34d399;">0.00°</span></div>
  <div>Target Normalized: <span style="color: #fbbf24;">0.00°</span></div>
  <div>Difference: <span style="color: #a78bfa;">0.00°</span></div>
  <div>New Rotation: <span style="color: #fb7185;">0.00°</span></div>
  <div>Total Rotation: <span style="color: #fde047;">0.00°</span></div>
</div>

      <script>
        let currentRotation = 0;
        let fixedRotationOffset = 0;
        let bombDisplayVisible = true;
        let currentBombData = null;
        const iframe = document.getElementById('mainIframe');
        const IS_DEV = ${isDev};
        let rotationMessageCount = 0;
        const bombStatus = document.getElementById('bombStatus');
        const bombTimer = document.getElementById('bombTimer');
        const defuseInfo = document.getElementById('defuseInfo');
        const defuseStatus = document.getElementById('defuseStatus');
        const defusePlayer = document.getElementById('defusePlayer');
        const defuseTimer = document.getElementById('defuseTimer');
        const statusIndicator = document.getElementById('statusIndicator');
        const bombToggleBtn = document.querySelector('.bomb-toggle-btn');
        function makeSmaller() {
          if (window.electronAPI && window.electronAPI.getWindowBounds && window.electronAPI.resizeWindow) {
            window.electronAPI.getWindowBounds().then(bounds => {
              const currentSize = bounds.width;
              const newSize = Math.min(1200, Math.max(200, currentSize - 50));
              window.electronAPI.resizeWindow(newSize, newSize);
            });
          }
        }
        function makeBigger() {
          if (window.electronAPI && window.electronAPI.getWindowBounds && window.electronAPI.resizeWindow) {
            window.electronAPI.getWindowBounds().then(bounds => {
              const currentSize = bounds.width;
              const newSize = Math.min(1200, Math.max(200, currentSize + 50));
              window.electronAPI.resizeWindow(newSize, newSize);
            });
          }
        }
        function refreshApp() {
          const iframeSrc = IS_DEV ? 'http://localhost:5173' : 'data:text/html,<h1>App Content</h1>';
          document.getElementById('mainIframe').src = iframeSrc;
        }
        function closeApp() {
          if (window.electronAPI && window.electronAPI.closeApp) {
            window.electronAPI.closeApp();
          } else {
            window.close();
          }
        }
        function toggleBombDisplay() {
          bombDisplayVisible = !bombDisplayVisible;
          if (bombDisplayVisible) {
            bombToggleBtn.classList.add('active');
            bombStatus.classList.add('force-visible');
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
        function showDefaultBombStatus() {
          bombStatus.classList.add('force-visible');
          bombStatus.innerHTML = \`
            <span class="bomb-icon">💣</span>
            <span class="bomb-message">Not Planted (👆)</span>
            <div class="status-indicator not-planted"></div>
          \`;
        }
        function rotateRadar() {
          fixedRotationOffset += 90;
          updateRotation();
        }
          
        function updateRotation() {
          const totalRotation = currentRotation + fixedRotationOffset;
          iframe.style.transform = \`rotate(\${totalRotation}deg)\`;
        }
        function updateBombDisplay(bombData) {
  currentBombData = bombData;
  
  // If bomb display is manually hidden, always respect that choice
  if (!bombDisplayVisible) {
    bombStatus.classList.remove('visible');
    bombStatus.classList.remove('force-visible');
    return; // Exit early - user wants it hidden regardless of bomb state
  }
  
  // If display is enabled, force it to be visible
  bombStatus.classList.add('force-visible');

  // Handle the actual display content
  if (!bombData || !bombData.isPlanted) {
    bombStatus.innerHTML = \`
      <span class="bomb-icon">💣</span>
      <span class="bomb-message">Not Planted (👆)</span>
      <div class="status-indicator not-planted"></div>
    \`;
    return;
  }

  if (bombData.isDefused) {
    bombStatus.innerHTML = \`
      <span class="bomb-icon">✅</span>
      <span class="bomb-message">Bomb Defused</span>
      <div class="status-indicator defusing-safe"></div>
    \`;
    return;
  }

  if (bombData.isDefusing) {
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
    bombStatus.innerHTML = \`
      <span class="bomb-icon">💣</span>
      <span class="bomb-timer">\${bombData.blowTime.toFixed(1)}s</span>
      <span class="bomb-message">Planted</span>
      <div class="status-indicator not-defusing"></div>
    \`;
  }
}
       function updateRotationDebug(debugData) {
  let debugDiv = document.getElementById('rotationDebug');
  if (!debugDiv) {
    debugDiv = document.createElement('div');
    debugDiv.id = 'rotationDebug';
    debugDiv.style.cssText = 
      'position: fixed;' +
      'top: calc(50% + var(--radar-size)/2 + 80px);' +
      'left: 50%;' +
      'transform: translateX(-50%);' +
      'background: rgba(0, 0, 0, 0.85);' +
      'backdrop-filter: blur(10px);' +
      'border: 1px solid rgba(255, 255, 255, 0.2);' +
      'border-radius: 12px;' +
      'padding: 12px 20px;' +
      'color: white;' +
      'font-family: monospace;' +
      'font-size: 12px;' +
      'z-index: 998;' +
      'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);' +
      'min-width: 300px;' +
      '-webkit-app-region: no-drag;';
    document.body.appendChild(debugDiv);
  }
  
  debugDiv.innerHTML = 
    '<div style="font-weight: bold; margin-bottom: 8px; color: #fbbf24;">🔄 Rotation Debug</div>' +
    '<div style="color: #ff6b6b; font-weight: bold;">Messages: <span style="color: #4ecdc4;">' + debugData.messageCount + '</span></div>' +
    '<div>Player Facing: <span style="color: #60a5fa;">' + debugData.playerFacingAngle.toFixed(2) + '°</span></div>' +
    '<div>Target Radar Rotation: <span style="color: #f87171;">' + debugData.targetRadarRotation.toFixed(2) + '°</span></div>' +
    '<div>Current Normalized: <span style="color: #34d399;">' + debugData.currentNormalized.toFixed(2) + '°</span></div>' +
    '<div>Target Normalized: <span style="color: #fbbf24;">' + debugData.targetNormalized.toFixed(2) + '°</span></div>' +
    '<div>Difference: <span style="color: #a78bfa;">' + debugData.diff.toFixed(2) + '°</span></div>' +
    '<div>New Rotation: <span style="color: #fb7185;">' + debugData.newRotation.toFixed(2) + '°</span></div>' +
    '<div>Total Rotation: <span style="color: #fde047;">' + debugData.totalRotation.toFixed(2) + '°</span></div>';
}

        window.addEventListener('message', (event) => {
          if (!IS_DEV || event.origin !== 'http://localhost:5173') return;
          if (event.data.type === 'BOMB_STATUS') {
            updateBombDisplay(event.data.bombStatus);
            return;
          }

// Replace the existing rotation message handler in the window.addEventListener('message') section
// Find this part and replace it:

if (event.data.type === 'ROTATION_ANGLE') {
  // Add counter increment at the start
  rotationMessageCount++;
  
  const targetAngle = event.data.angle; // Player's current facing angle
  
  // To keep player facing the same direction on screen, rotate radar in opposite direction
  const targetRadarRotation = -targetAngle - 90;
  
  // Normalize current rotation to 0-360 range
  let currentNormalized = ((currentRotation % 360) + 360) % 360;
  
  // Normalize target rotation to 0-360 range
  let targetNormalized = ((targetRadarRotation % 360) + 360) % 360;
  
  // Calculate the shortest angular difference
  let diff = targetNormalized - currentNormalized;
  
  // Ensure we take the shortest path (avoid spinning 270° when 90° would work)
  if (diff > 180) {
    diff -= 360;
  } else if (diff < -180) {
    diff += 360;
  }
  
  // Apply the difference to current rotation for smooth transition
  const newRotation = currentRotation + diff;
  const totalRotation = newRotation + fixedRotationOffset;
  
  // Debug data object - now includes message count
  const debugData = {
    messageCount: rotationMessageCount,
    playerFacingAngle: targetAngle,
    targetRadarRotation: targetRadarRotation,
    currentNormalized,
    targetNormalized,
    diff,
    newRotation,
    totalRotation
  };
  
  // Update debug display
  updateRotationDebug(debugData);
  
  // Console log for additional debugging
  console.log('Rotation Debug:', debugData);
  
  // Update the current rotation state
  currentRotation = newRotation;
  
  // Apply the rotation to the radar
  updateRotation();
  return;
}
        });
        window.addEventListener('load', () => {
          if (bombDisplayVisible) {
            bombToggleBtn.classList.add('active');
            showDefaultBombStatus();
          }
        });
        document.addEventListener('DOMContentLoaded', () => {
          const toolbar = document.querySelector('.title-bar');
          const allToolbarElements = toolbar.querySelectorAll('*');
          function enforceNoDrag() {
            [toolbar, ...allToolbarElements].forEach(element => {
              element.style.webkitAppRegion = 'no-drag';
              element.style.pointerEvents = 'all';
            });
            const buttons = document.querySelectorAll('.title-bar button, .resize-btn');
            buttons.forEach(button => {
              button.style.webkitAppRegion = 'no-drag';
              button.style.pointerEvents = 'all';
              button.style.zIndex = '9999';
              button.style.position = 'relative';
              const children = button.querySelectorAll('*');
              children.forEach(child => {
                child.style.pointerEvents = 'none';
              });
            });
          }
          enforceNoDrag();
          setInterval(enforceNoDrag, 100);
          window.addEventListener('focus', enforceNoDrag);
          window.addEventListener('blur', enforceNoDrag);
          document.addEventListener('visibilitychange', enforceNoDrag);
          const buttons = document.querySelectorAll('.title-bar button, .resize-btn');
          buttons.forEach(button => {
            button.addEventListener('mousedown', (e) => {
              e.stopPropagation();
              enforceNoDrag();
            });
            button.addEventListener('dragstart', (e) => {
              e.preventDefault();
              e.stopPropagation();
              return false;
            });
          });
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
              makeSmaller();
            });
          }
          if (resizePlusBtn) {
            resizePlusBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              makeBigger();
            });
          }
          if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              refreshApp();
            });
          }
          if (rotateBtn) {
            rotateBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              rotateRadar();
            });
          }
          if (bombBtn) {
            bombBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleBombDisplay();
            });
            bombBtn.addEventListener('mousedown', (e) => {
              e.preventDefault();
              e.stopPropagation();
            });
            bombBtn.addEventListener('mouseup', (e) => {
              e.preventDefault();
              e.stopPropagation();
              setTimeout(() => {
                toggleBombDisplay();
              }, 10);
            });
          }
          if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              closeApp();
            });
          }
        });
      </script>
    </body>
    </html>
  `;
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  mainWindow.on('blur', () => {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
        mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      }
    }, 100);
  });
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.protocol === 'data:') {
      return;
    }
    if (isDev && (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')) {
      return;
    }
    event.preventDefault();
    require('electron').shell.openExternal(navigationUrl);
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
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
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}
app.whenReady().then(() => {
  createWindow();
  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    }
  }, 5000);
});
ipcMain.handle('close-app', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});
ipcMain.handle('get-window-bounds', () => {
  if (mainWindow) {
    return mainWindow.getBounds();
  }
  return null;
});
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
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith('https://localhost') || url.startsWith('https://127.0.0.1')) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});
process.on('uncaughtException', (error) => {});
process.on('unhandledRejection', (reason, promise) => {});