
// In-project imports
const proj = require('./project');


// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("fs");
const console = require("console");
const path = require("node:path");
const util = require("util");

const isMac = process.platform === "darwin";
const isLinux = process.platform === "linux"; // do we need this?
const isDev = process.env.NODE_ENV === "development";
const PREVIEW_FOLDER_NAME = "previews";
const SONY_RAW_EXTENSION = ".ARW";


const userdata_dir = app.getPath("userData");
const install_dir_filename = "install_directory.txt";
let install_dir = path.join(app.getPath("home"), "Focus");

let mainWindow;

function switchToPage(page) {
	mainWindow.loadURL(`http://localhost:3000/${page}`);
}

function createWindow() {
	app.commandLine.appendSwitch("disable-web-security");

	// timeout allows time for React to start
	setTimeout(() => {
		// Create the browser window.
		mainWindow = new BrowserWindow({
			width: isDev ? 1600 : 800,
			height: 600,
			webPreferences: {
				preload: path.join(__dirname, "preload.js"),
				contextIsolation: true,
				webSecurity: false, // temporary hack to load previews
			},
		});
		mainWindow.setMenuBarVisibility(false);

		// Open the DevTools.
		if (isDev) mainWindow.webContents.openDevTools();

		configureInstallationDirectory();
	}, 5000);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	createWindow();
	app.on("activate", function () {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

const copyFilePromise = util.promisify(fs.copyFile);
function copyFiles(srcDir, destDir, files) {
	console.log("files to copy " + files);
	return Promise.all(
		files.map((f) =>
			copyFilePromise(path.join(srcDir, f), path.join(destDir, f))
		)
	);
}

function configureInstallationDirectory() {
	fs.readFile(path.join(userdata_dir, install_dir_filename), (err, content) => {
		if (err) {
			switchToPage("config-install");
		} else {
			install_dir = content.toString().replace(/(\r\n|\n|\r)/gm, "");
			verifyInstallDirectory();
			const projectPage = proj.loadProjects(install_dir);
			switchToPage(projectPage);
		}
	});
}

function verifyInstallDirectory() {
	if (!fs.existsSync(install_dir)) fs.mkdirSync(install_dir);
}

let rmdir = function (dir) {
	const list = fs.readdirSync(dir);
	for (let i = 0; i < list.length; i++) {
		const filename = path.join(dir, list[i]);
		const stat = fs.statSync(filename);
		if (filename === "." || filename === "..") {
			// pass these files
		} else if (stat.isDirectory()) {
			// rmdir recursively
			rmdir(filename);
		} else {
			// rm filename
			fs.unlinkSync(filename);
		}
	}
	fs.rmdirSync(dir);
};

function uninstall_app() {
	rmdir(install_dir);
	fs.unlinkSync(path.join(userdata_dir, install_dir_filename));
}

// IPC HANDLERS

ipcMain.handle("open-dialog", async (e, args) => {
	const import_from = await dialog.showOpenDialog({
		buttonLabel: args.buttonLabel,
		properties: ["openDirectory"],
		title: args.title,
	});
	return !import_from.canceled
		? args.configInstall
			? path.join(import_from.filePaths[0], "Focus")
			: import_from.filePaths[0]
		: null;
});


ipcMain.on("set-install-dir", (e, dir) => {
	console.log('installation dir: ' + dir)
	// TODO all of the rest of this file is new
	// save to file
	const install_dir_file = path.join(userdata_dir, install_dir_filename);
	fs.writeFile(install_dir_file, dir, (err) => {
		if (err) console.log("ERROR INITIALIZING INSTALL DIRECTORY");
	});

	verifyInstallDirectory();
	proj.loadProjects(dir);
});

// TODO sean removed these
// ipcMain.handle('get_default_install_location', async (event, args) => {
// 	return installDir;
// });
//
// ipcMain.handle('add_focus_to_filepath', async (event, args) => {
// 	return path.join(args, 'Focus');
// });
//
// ipcMain.handle('dialog', async (event, method, params) => {
// 	return await dialog[method](params);
// });
//
// ipcMain.handle('get_project_names', async (event, args) => {
// 	return proj.UserProjects.projectList.map( (project) => project.name);
// });
//
// ipcMain.on('project_selected', async (event, args) => {
// 	let project = proj.getProject(proj.UserProjects, args.name);
// 	if (project === null) {
// 		console.log("PROJECT DOES NOT EXIST");
// 		return null;
// 	}
//
// 	// inform main.js that this project is actively being used
// 	currently_open_projects.push(project);
//
// 	// set current scene to that for the project
// 	await mainWindow.loadFile('project.html');
// });

ipcMain.handle("get-project-names", () => proj.getAllProjects().map((proj) => proj.name));

ipcMain.handle("open-project", (e, name) => {
	const project = proj.getAllProjects().find((new_proj) => new_proj.name === name);
	proj.openProject(project);
	switchToPage("projects");
	return project;
});

ipcMain.handle("get-open-projects", () => proj.getOpenProjects());

// TODO HEAD
// ipcMain.on('start_create_project', async (event, args) => {
//   await mainWindow.loadFile('new_project.html');
// });
//
// ipcMain.on('cancel_new_project', async (event, args) => {
// 	await mainWindow.loadFile('index.html'); // return to main display
// })

// TODO HEAD END SEAN START

ipcMain.on("import_files", (e, { srcDir, destDir }) => {
	console.log("src dir: " + srcDir);
	console.log("dest dir: " + destDir);
});

ipcMain.on("return_index", async (event, args) => {
	await mainWindow.loadFile("index.html");
	// TODO close currently active project

	// saves and removes all active projects
	proj.getOpenProjects().forEach((this_proj) => proj.saveProject(this_proj));
	proj.closeAllProjects();
});

const verifyNewProject = (args) => ({
	name:
		args.name.length === 0 ||
		proj.getAllProjects().some((project) => project.name === args.name),
	nameText:
		args.name.length === 0
			? "Name must be at least one character"
			: "Name already exists",
	srcDir: !fs.existsSync(args.srcDir),
	destDir: !fs.existsSync(args.destDir),
});

ipcMain.handle("create-project", (e, args) => {
	console.log("HERE HERE:", proj.getAllProjects());
	const errors = verifyNewProject(args);
	if (
		Object.values(errors).some((error) => typeof error === "boolean" && error)
	) {
		return errors;
	}
	const new_proj = proj.newProject(args.name, args.srcDir, args.destDir, install_dir);
	proj.createProjectDir(new_proj);
	proj.addProject(new_proj);
	proj.openProject(new_proj);

	proj.generate_jpg_previews(
		new_proj,
		path.join(new_proj.filepath, PREVIEW_FOLDER_NAME),
		fs
			.readdirSync(new_proj.srcDir)
			.filter((file) => path.extname(file).toUpperCase() === SONY_RAW_EXTENSION)
			.map((file) => path.join(args.srcDir, file))
	);

	switchToPage("projects");

	// this should occur in the background hopefully
	copyFiles(args.srcDir, args.destDir,
		fs.readdirSync(args.srcDir).filter((file) =>
			path.extname(file).toUpperCase() === SONY_RAW_EXTENSION
		))
		.then(() => {
			console.log("done");
		})
		.catch((err) => {
			console.log(err);
		});

	let defaultInfoXMP = {
		"Rating": 3,
		"Subject": ["temp", "test"] // alternative name for tags, needs to be under a built-in XMP tag
	};

	proj.generateXMPs(new_proj, defaultInfoXMP);
	return errors;
});

ipcMain.handle("get-preview-paths", (e, proj) =>
	fs
		.readdirSync(path.join(proj.filepath, PREVIEW_FOLDER_NAME))
		.map((previewPath) =>
			path.join(proj.filepath, PREVIEW_FOLDER_NAME, previewPath)
		)
);
// TODO SEAN END

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
});

// TODO sean deleted
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.

app.on("window-all-closed", function () {
	// if (!isMac)
	app.quit();
	proj.closeAllProjects();
	proj.saveUserData(install_dir);
});

