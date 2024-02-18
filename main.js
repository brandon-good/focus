// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const fs = require('fs');
const console = require('console')
const path = require('node:path')
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';
const isDev = process.env.NODE_ENV !== 'development';
const util = require('util');

const SONY_RAW_EXTENSION = '.ARW'

const userdata_dir = app.getPath('userData');
const install_dir_filename = 'install_directory.txt';
let install_dir = path.join(app.getPath('home'), 'Focus');

let mainWindow;
let selectInstallPopup;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
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

function createInstallPopup() {
  // Create the browser window.
  selectInstallPopup = new BrowserWindow({
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
    selectInstallPopup.webContents.openDevTools();

  // and load the index.html of the app.
  selectInstallPopup.loadFile('select_install_dir.html');
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	configureInstallationDirectory();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

const copyFilePromise = util.promisify(fs.copyFile);

function copyFiles(srcDir, destDir, files) {
  console.log(' files to copy' + files)
  return Promise.all(files.map(f => {
    return copyFilePromise(path.join(srcDir, f), path.join(destDir, f));
  }));
}

ipcMain.on('import_files', (e, { src_dir, dest_dir, }) => {
  console.log('src dir: ' + src_dir)
  console.log('dest dir: ' + dest_dir)
  copyFiles(src_dir, dest_dir,
    fs.readdirSync(src_dir).filter(file => {
      return path.extname(file).toUpperCase() === SONY_RAW_EXTENSION
    })
  ).then(() => {
    console.log("done");
  }).catch(err => {
    console.log(err);
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (!isMac) app.quit();
})


function configureInstallationDirectory() {
	let install_dir_file = path.join(userdata_dir, install_dir_filename);
	fs.readFile(install_dir_file, (err, content) => {
		if (err) {
			createInstallPopup();
		} else {
			install_dir = content.toString().replace(/(\r\n|\n|\r)/gm, "");
			createWindow();
		}
	});		
}

// IPC HANDLERS

ipcMain.on('install_directory_selected', (e, { dir,}) => {
  console.log('installation dir: ' + dir)
	install_dir = dir;

	// save to file
	const install_dir_file = path.join(userdata_dir, install_dir_filename);
	fs.writeFile(install_dir_file, dir, err => {
		if (err) console.log("ERROR INITIALIZING USER INSTALL LOCATION");});

	selectInstallPopup.close();
	createWindow();
});

ipcMain.handle('get_default_install_location', async (event, args) => {
	return install_dir;
});

ipcMain.handle('add_focus_to_filepath', async (event, args) => {
	return path.join(args, 'Focus');
});

ipcMain.handle('dialog', async (event, method, params) => {
	const result = await dialog[method](params);
	return result;
});
