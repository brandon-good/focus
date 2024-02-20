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
const SONY_RAW_EXTENSION = '.ARW'

const userdata_dir = app.getPath('userData');
const install_dir_filename = 'install_directory.txt';
let install_dir = path.join(app.getPath('home'), 'Focus');

let mainWindow;
let selectInstallPopup;
let currently_open_project_windows = [];

let user_projects;
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
  if (isDev)
    mainWindow.webContents.openDevTools();

	loadUserProjects(install_dir);

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
  console.log('files to copy' + files)
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
			install_dir = content.toString().replace(/(\r\n|\n|\r)/gm, "");
			verifyInstallDirectory();
			createMainWindow();
		}
	});		

}

function verifyInstallDirectory() {
	if (!fs.existsSync(install_dir)) fs.mkdirSync(install_dir);

}

function save_user_data() {
	user_projects.save(install_dir);	

	for (const proj in currently_open_projects) {
		proj.save();
	}
}


// IPC HANDLERS
ipcMain.on('import_files', (e, { src_dir, dest_dir, }) => {
  console.log('src dir: ' + src_dir)
  console.log('dest dir: ' + dest_dir)
});

ipcMain.on('install_directory_selected', (e, { dir,}) => {
  console.log('installation dir: ' + dir)
	install_dir = dir;

	// save to file
	const install_dir_file = path.join(userdata_dir, install_dir_filename);
	fs.writeFile(install_dir_file, dir, err => {
		if (err) console.log("ERROR INITIALIZING USER INSTALL LOCATION");});

	selectInstallPopup.close();
	verifyInstallDirectory();
	createMainWindow();
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

ipcMain.on('start_create_project', async (event, args) => {
  mainWindow.loadFile('new_project.html');
});

ipcMain.on('cancel_new_project', async (event, args) => {
	mainWindow.loadFile('index.html'); // return to main display	
})

ipcMain.on('create_new_project', async(event, args) => {
	// first verify that they have chosen a unique name and these directories exist
	// TODO add these checks
	console.log(args);
	proj = new Project(args.name, args.src_dir, args.dest_dir, install_dir, false);
	user_projects.add(proj);
	currently_open_projects.push(proj);

	// TODO update index.html with new project
	mainWindow.loadFile('index.html'); // return to main display	
	
	// TODO open new window with project
	
	// this should occur in the background hopefully
  copyFiles(args.src_dir, args.dest_dir,
    fs.readdirSync(args.src_dir).filter(file => {
      return path.extname(file).toUpperCase() === SONY_RAW_EXTENSION
    })
  ).then(() => {
    console.log("done");
  }).catch(err => {
    console.log(err);
  });
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (!isMac) app.quit();
	save_user_data();
})



// I WANT TO PUT ALL THIS SHIT INTO A DIFFERENT FOLDER BUT I CANT FOR THE LIFE OF ME

const projects_json_filename = "projects.json";

class Project {
	constructor(name, src_dir, dest_dir, install_dir, archived) {
		this.name = name;
		this.src_dir = src_dir;
		this.dest_dir = dest_dir;
		this.archived = archived;
		this.filepath = path.join(install_dir, name);
		this.create_project_dir();
	}

	static from(json) {
		return Object.assign(new Project(), json);
	}

	save(install_dir) {
		// save to this.save_dir
		let stored_project_file_path = path.join(this.filepath, this.name + ".json");	
		fs.writeFile(stored_project_file_path, JSON.stringify(this), err => {
			if (err) console.log("ERROR SAVING USER PROJECT " + this.name);	
		});
	}

	create_project_dir() {
		if (fs.existsSync(this.filepath)) return;
		// check if this exists first inside install_dir, if not create it
		fs.mkdirSync(this.filepath);
		this.save();

		// TODO save the jpg images
	}

	archive() {
		// delete all temp files in directory
		this.archived = true;
	}
}

class UserProjects {
	constructor() {
		this.project_list = []; // list of project objects
	}

	static from(json) {
		return Object.assign(new UserProjects(), json);
	}

	getProject(name) {
		for (const proj_name of this.project_list) {
			if (proj_name == name) {
				// TODO
				// check if project dir exists
				// return json object from reading the file
			}
		}
		return null;
	}

	add(proj) {
		this.project_list.push(proj.name);
	}

	save(install_dir) {
		// save to install_dir	
		let stored_projects_file_path = path.join(install_dir, projects_json_filename);	
		fs.writeFile(stored_projects_file_path, JSON.stringify(this), err => {
			if (err) console.log("ERROR SAVING USER PROJECT LIST");	
		});
	}
}

function loadUserProjects(install_dir) {
	// returns a user projects object
	let stored_projects_file_path = path.join(install_dir, projects_json_filename);	
	fs.readFile(stored_projects_file_path, (err, content) => {
		if (err) {
			user_projects = new UserProjects();
		} else {
			user_projects = UserProjects.from(content);
		}
	})
}
