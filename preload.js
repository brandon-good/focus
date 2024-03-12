// preload.js

// All the Node.js APIs are available in the preload process.
// // It has the same sandbox as a Chrome extension.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
	dialog: (method, config) =>
		ipcRenderer.invoke("dialog", method, config).then((result) => {
			return result;
		}),
	shell: (method, config) =>
		ipcRenderer.invoke("shell", method, config).then((result) => {
			return result;
		}),
	get_default_install_location: (method, config) =>
		ipcRenderer
			.invoke("get_default_install_location", method, config)
			.then((result) => {
				return result;
			}),
	add_focus_to_filepath: (method, config) =>
		ipcRenderer
			.invoke("add_focus_to_filepath", method, config)
			.then((result) => {
				return result;
			}),
	get_project_names: (method, config) =>
		ipcRenderer.invoke("get_project_names", method, config).then((result) => {
			return result;
		}),
	get_currently_open_projects: (method, config) =>
		ipcRenderer
			.invoke("get_currently_open_projects", method, config)
			.then((result) => {
				return result;
			}),
});
contextBridge.exposeInMainWorld("ipcRenderer", {
	invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
	send: (channel, data) => ipcRenderer.send(channel, data),
	on: (channel, func) =>
		ipcRenderer.on(channel, (event, ...args) => func(...args)),
});
