// preload.js

// All the Node.js APIs are available in the preload process.
// // It has the same sandbox as a Chrome extension.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    openDialog: (method, config) => ipcRenderer.invoke('dialog', method, config).then((result) => { return result })
});