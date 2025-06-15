const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  closeApp: () => ipcRenderer.invoke('close-app'),
  getWindowBounds: () => ipcRenderer.invoke('get-window-bounds'),
  resizeWindow: (width, height) => ipcRenderer.invoke('resize-window', width, height)
});