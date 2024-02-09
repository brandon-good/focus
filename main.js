// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('node:path')
const isMac = process.platform === 'darwin';
const isDev = process.env.NODE_ENV !== 'development';

let mainWindow;
function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: isDev ? 1600 : 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: true,
    }
  })

  // Open the DevTools.
  if (isDev)
    mainWindow.webContents.openDevTools();

  // and load the index.html of the app.
  mainWindow.loadFile('index.html');



}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()
  ipcMain.handle('dialog', async (event, method, params) => {
    const result = await dialog[method](params);
    return result;
  });
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})



// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (!isMac) app.quit()
})

