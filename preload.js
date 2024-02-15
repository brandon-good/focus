// preload.js

// All the Node.js APIs are available in the preload process.
// // It has the same sandbox as a Chrome extension.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    dialog: (method, config) => ipcRenderer.invoke('dialog', method, config).then((result) => { return result }),
    shell: (method, config) => ipcRenderer.invoke('shell', method, config).then((result) => { return result }),
});
contextBridge.exposeInMainWorld('ipcRenderer', {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
});