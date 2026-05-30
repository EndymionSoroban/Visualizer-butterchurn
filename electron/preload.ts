import { contextBridge } from 'electron';

// Expose minimal API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Add IPC communication here if needed later
});
