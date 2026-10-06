const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dashboardStore', {
  load: () => ipcRenderer.invoke('storage:load'),
  save: (value) => ipcRenderer.invoke('storage:save', value),
  exportBackup: (value) => ipcRenderer.invoke('storage:export', value),
  importBackup: () => ipcRenderer.invoke('storage:import'),
  getDataLocation: () => ipcRenderer.invoke('storage:location')
});
