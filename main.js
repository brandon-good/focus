
// In-project imports
const proj = require('./project');


// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const fs = require('fs');
const console = require('console')
const path = require('node:path')
const util = require('util');
//const projects = require('./projects.js');

const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';
const isDev = process.env.NODE_ENV !== 'development';
const PREVIEW_FOLDER_NAME = 'previews';
const SONY_RAW_EXTENSION = '.ARW';

const userdata_dir = app.getPath('userData');
const install_dir_filename = 'install_directory.txt';
let installDir = path.join(app.getPath('home'), 'Focus');

let mainWindow;
let selectInstallPopup;
let currently_open_project_windows = [];

// let user_projects;
let currently_open_projects = [];

function createMainWindow() {
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
  if (isDev) mainWindow.webContents.openDevTools();

  proj.loadUserProjects(installDir);

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
  selectInstallPopup.loadFile('config_install.html');
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	configureInstallationDirectory();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

const copyFilePromise = util.promisify(fs.copyFile);
function copyFiles(srcDir, destDir, files) {
  console.log('files to copy ' + files);
  return Promise.all(files.map(f => {
    return copyFilePromise(path.join(srcDir, f), path.join(destDir, f));
  }));
}

function configureInstallationDirectory() {
	let install_dir_file = path.join(userdata_dir, install_dir_filename);
	fs.readFile(install_dir_file, (err, content) => {
		if (err) {
			createInstallPopup();
		} else {
			installDir = content.toString().replace(/(\r\n|\n|\r)/gm, "");
			verifyInstallDirectory();
			createMainWindow();
		}
	});

}

function verifyInstallDirectory() {
	if (!fs.existsSync(installDir)) fs.mkdirSync(installDir);
}

function save_user_data() {
	proj.saveUserProjects(proj.UserProjects, installDir);
	currently_open_projects.forEach(thisProj => proj.saveProject(thisProj));
}

let rmdir = function (dir) {
	let list = fs.readdirSync(dir);
	for(let i = 0; i < list.length; i++) {
		let filename = path.join(dir, list[i]);
		let stat = fs.statSync(filename);

		if(filename === "." || filename === "..") {
			// pass these files
		} else if(stat.isDirectory()) {
			// rmdir recursively
			rmdir(filename);
		} else {
			// rm fiilename
			fs.unlinkSync(filename);
		}
	}
	fs.rmdirSync(dir);
}

function uninstall_app() {
	rmdir(installDir);
	let install_dir_file = path.join(userdata_dir, install_dir_filename);
	fs.unlinkSync(install_dir_file);
}


// IPC HANDLERS
ipcMain.on('import_files', (e, { src_dir, dest_dir, }) => {
  console.log('src dir: ' + src_dir)
  console.log('dest dir: ' + dest_dir)
});

ipcMain.on('install_directory_selected', (e, { dir,}) => {
  console.log('installation dir: ' + dir)
	installDir = dir;

	// save to file
	const install_dir_file = path.join(userdata_dir, install_dir_filename);
	fs.writeFile(install_dir_file, dir, err => {
		if (err) console.log("ERROR INITIALIZING USER INSTALL LOCATION");});

	selectInstallPopup.close();
	verifyInstallDirectory();
	createMainWindow();
});

ipcMain.handle('get_default_install_location', async (event, args) => {
	return installDir;
});

ipcMain.handle('add_focus_to_filepath', async (event, args) => {
	return path.join(args, 'Focus');
});

ipcMain.handle('dialog', async (event, method, params) => {
	return await dialog[method](params);
});

ipcMain.handle('get_project_names', async (event, args) => {
	return proj.UserProjects.projectList.map( (project) => project.name);
});

ipcMain.on('project_selected', async (event, args) => {
	let project = proj.getProject(proj.UserProjects, args.name);
	if (project === null) {
		console.log("PROJECT DOES NOT EXIST");
		return null;
	}

	// inform main.js that this project is actively being used
	currently_open_projects.push(project);

	// set current scene to that for the project
	await mainWindow.loadFile('project.html');
});

ipcMain.handle('get_currently_open_projects', async (event, args) => {
	return currently_open_projects;
})

ipcMain.on('return_index', async (event, args) => {
	await mainWindow.loadFile('index.html');
	// TODO close currently active project

	// saves and removes all active projects
	currently_open_projects.forEach( (thisProj) => proj.saveProject(thisProj) );
	currently_open_projects = [];
});

ipcMain.on('start_create_project', async (event, args) => {
  await mainWindow.loadFile('new_project.html');
});

ipcMain.on('cancel_new_project', async (event, args) => {
	await mainWindow.loadFile('index.html'); // return to main display
})

ipcMain.on('create_new_project', async(event, args) => {
	if (!proj.verifyNewProject(args.name, args.srcDir, args.destDir)) {
		console.log("INVALID PROJECT");
		return;
	}

	let newProj = proj.new_project(args.name, args.srcDir, args.destDir, installDir);
	currently_open_projects.push(newProj);
	console.log('open: ' + currently_open_projects);

	const defaultInfoXML = {
		filename: "",
		rating: "",
		tags: ""
	};

	proj.generateXMLs(newProj, defaultInfoXML,
		fs.readdirSync(args.srcDir).filter(file => {
			return path.extname(file).toUpperCase() === SONY_RAW_EXTENSION
		})
	);

	// TODO update index.html with new project
	await mainWindow.loadFile('index.html'); // return to main display

	// TODO open new window with project

	// this should occur in the background hopefully
  copyFiles(args.srcDir, args.destDir,
    fs.readdirSync(args.srcDir).filter(file => {
      return path.extname(file).toUpperCase() === SONY_RAW_EXTENSION
    })
  ).then(() => {
    console.log("done");
  }).catch(err => {
    console.log(err);
  });
})

ipcMain.on('uninstall_app', async (event, args) => {
	await uninstall_app();
	// Retrieve all open windows
	const allWindows = BrowserWindow.getAllWindows();

	// Loop through all windows and close them
	allWindows.forEach(window => {
		window.close();
	});

	// Optionally, quit the app after all windows are closed
	app.quit();
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (!isMac) app.quit();
	save_user_data();
})

