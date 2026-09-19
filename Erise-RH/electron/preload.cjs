const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  notify: (title, body) => ipcRenderer.send('desktop-notify', { title, body }),
  platform: process.platform,

  // Direct Node.js Database Bridge (Bypasses browser restrictions & RLS)
  fetchMembers: () => ipcRenderer.invoke('db-fetch-members'),
  fetchTasks: () => ipcRenderer.invoke('db-fetch-tasks'),
  fetchEvents: () => ipcRenderer.invoke('db-fetch-events'),
  fetchEventRegistrations: (eventId) => ipcRenderer.invoke('db-fetch-event-registrations', eventId),
  fetchAttendanceLogs: () => ipcRenderer.invoke('db-fetch-attendance-logs'),
  submitAppraisal: (appraisal) => ipcRenderer.invoke('db-submit-appraisal', appraisal),
  updateMemberStatus: (id, status) => ipcRenderer.invoke('db-update-member-status', { id, status }),
  onDbChange: (callback) => {
    ipcRenderer.on('db-change', (_event, data) => callback(data));
  },
});
