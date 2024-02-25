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
const XMLS_FOLDER_NAME = 'xmls';
const SONY_RAW_EXTENSION = '.ARW';

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

	load_user_projects(install_dir);

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
	save_user_projects(user_projects, install_dir);
	currently_open_projects.forEach(proj => save_project(proj));
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
	rmdir(install_dir);		
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

ipcMain.handle('get_project_names', async (event, args) => {
	return user_projects.project_list.map( (proj) => proj.name);
});

ipcMain.on('project_selected', async (event, args) => {
	let project = get_project(user_projects, args.name);
	if (project === null) {
		console.log("PROJECT DOES NOT EXIST");
		return null;
	}

	// inform main.js that this project is actively being used
	currently_open_projects.push(project);

	// set current scene to that for the project
	mainWindow.loadFile('project.html');
});

ipcMain.handle('get_currently_open_projects', async (event, args) => {
	return currently_open_projects;
})

ipcMain.on('return_index', async (event, args) => {
	mainWindow.loadFile('index.html');
	// TODO close currently active project
	
	// saves and removes all active projects
	currently_open_projects.forEach( (proj) => save_project(proj) );
	currently_open_projects = [];
}); 

ipcMain.on('start_create_project', async (event, args) => {
  mainWindow.loadFile('new_project.html');
});

ipcMain.on('cancel_new_project', async (event, args) => {
	mainWindow.loadFile('index.html'); // return to main display	
})

ipcMain.on('create_new_project', async(event, args) => {
	if (!verify_new_project(args.name, args.src_dir, args.dest_dir)) {
		console.log("INVALID PROJECT");
		return;
	}

	proj = new_project(args.name, args.src_dir, args.dest_dir, install_dir);
	add_project(user_projects, proj);
	currently_open_projects.push(proj);
	console.log('open: ' + currently_open_projects);

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

ipcMain.on('uninstall_app', async (event, args) => {
	uninstall_app();
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

const Project = {
	name: "NO_NAME",
	src_dir: "NO_SRC",
	dest_dir: "NO_DEST",
	filepath: "NO_SAVE_LOC",
	archived: false,
}

function new_project(name, src_dir, dest_dir, install_dir) {
	proj = Object.create(Project);
	proj.name = name;
	proj.src_dir = src_dir;
	proj.dest_dir = dest_dir;
	proj.filepath = path.join(install_dir, name);
	create_project_dir(proj);
	return proj;
}

function project_from_json(json) {
	proj = JSON.parse(json);
	if (!proj.archived)
		create_project_dir(proj);

	return proj;
}

function archive(project) {
	// delete all temp files in directory
	project.archived = true;
}

function create_project_dir(project) {
	// check if this exists first inside install_dir, if not create it
	let thumb_loc = path.join(project.filepath, PREVIEW_FOLDER_NAME);
	let xml_loc = path.join(project.filepath, XMLS_FOLDER_NAME)
	if (! fs.existsSync(project.filepath)) fs.mkdirSync(project.filepath);
	if (! fs.existsSync(thumb_loc)) fs.mkdirSync(thumb_loc);
	if (! fs.existsSync(xml_loc)) fs.mkdirSync(xml_loc);

	save_project(project);

	// TODO save the jpg images
	
}

function generate_thumbnails(project, files) {
	// files is passed as an argument because we might load the files from elsewhere
	// it is possible that we have to recreate the thumbnails based on the destination copied files
	// DO NOT OVERWRITE EXISTING FILES

}

function generate_xmls(project, files) {
	// file sis passed as an argument because we might load the files from elsewhere
	// it is possible that we have to recreate the thumbnails based on the destination copied files
	// DO NOT OVERWRITE EXISTING FILES
	
}

function save_project(project) {
	// save to this.save_dir
	console.log('filepath:'+project.filepath);
	console.log('name:'+project.name);
	let stored_project_file_path = path.join(project.filepath, project.name + ".json");	
	console.log(JSON.stringify(project));
	fs.writeFile(stored_project_file_path, JSON.stringify(project), err => {
		if (err) console.log("ERROR SAVING USER PROJECT " + project.name);	
	});
}

const UserProjects = {
	project_list: [],
}

function new_user_projects() {
	user_projects = Object.create(UserProjects);
	user_projects.project_list = [];
	return user_projects;
}

function user_projects_from_json(json) {
	return JSON.parse(json);
}

function add_project(user_projects, project) {
	user_projects.project_list.push(project);
}

function get_project(user_projects, project_name) {
	let project_found = null;
	user_projects.project_list.forEach((proj) => {
		if (proj.name === project_name) project_found = proj;
	});
	return project_found;
}

function save_user_projects(user_projects, install_dir) {
	// save to install_dir	
	let stored_projects_file_path = path.join(install_dir, projects_json_filename);	
	fs.writeFile(stored_projects_file_path, JSON.stringify(user_projects), err => {
		if (err) console.log("ERROR SAVING USER PROJECT LIST");	
	});
}

function load_user_projects(install_dir) {
	// returns a user projects object
	let stored_projects_file_path = path.join(install_dir, projects_json_filename);	
	fs.readFile(stored_projects_file_path, (err, content) => {
		if (err) {
			user_projects = new_user_projects();
		} else {
			user_projects = user_projects_from_json(content);
		}
	})
}

function verify_new_project(name, src_dir, dest_dir) {
	// return true is this is valid, false if not valid
	
	// check unique name
	let duplicate = false;
	user_projects.project_list.forEach(proj => {if (name === proj.name) duplicate = true});

	// check src and dest directories
	return !duplicate && fs.existsSync(src_dir) && fs.existsSync(dest_dir)
}
