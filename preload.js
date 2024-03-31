// preload.js

// All the Node.js APIs are available in the preload process.
// // It has the same sandbox as a Chrome extension.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ipcRenderer", {
	invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
	send: (channel, data) => ipcRenderer.send(channel, data),
	on: (channel, func) =>
		ipcRenderer.on(channel, (event, ...args) => func(...args)),
});
