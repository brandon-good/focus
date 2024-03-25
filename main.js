// In-project imports
const { Photo } = require("./photo");
const proj = require("./project");
const utils = require("./utils");


// Modules to control application life and create native browser window
const {
	app,
	BrowserWindow,
	dialog,
	ipcMain,
	net,
	protocol,
} = require("electron");
const fs = require("fs");
const console = require("console");
const path = require("node:path");
const util = require("util");


const userdata_dir = app.getPath("userData");
const install_dir_filename = "install_directory.txt";
let install_dir = path.join(app.getPath("home"), "Focus");

let mainWindow;

function switchToPage(page) {
	mainWindow.loadURL(`http://localhost:3000/${page}`);
}

function createWindow() {
	protocol.handle("preview", (request) => {
		let url = request.url.slice("preview://".length).replace(/ /g, "%20");
		if (utils.isWindows) {
			url = `${url.slice(0, 1)}:${url.slice(1)}`.replace(/\\/g, "/");
		}
		console.log("file://" + url);
		return net.fetch("file://" + url);
	});

	// timeout allows time for React to start
	setTimeout(() => {
		// Create the browser window.
		mainWindow = new BrowserWindow({
			width: utils.isDev ? 1600 : 800,
			height: 600,
			webPreferences: {
				preload: path.join(__dirname, "preload.js"),
				contextIsolation: true,
			},
		});
		mainWindow.setMenuBarVisibility(false);

		// Open the DevTools.
		if (utils.isDev) mainWindow.webContents.openDevTools();

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

// TODO should this be a function in the project file?
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


function uninstall_app() {
	utils.rmdir(install_dir);
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
	console.log("installation dir: " + dir);
	// save to file
	const install_dir_file = path.join(userdata_dir, install_dir_filename);
	fs.writeFile(install_dir_file, dir, (err) => {
		if (err) console.log("ERROR INITIALIZING INSTALL DIRECTORY");
	});

	install_dir = dir;
	verifyInstallDirectory();
	const projectPage = proj.loadProjects(install_dir);
	switchToPage(projectPage);
});

ipcMain.handle("get-project-names", () =>
	proj.getAllProjects().map((proj) => proj.name)
);

ipcMain.handle("open-project", (e, name) => {
	switchToPage("projects");
	return proj.openProject(name);
});

ipcMain.handle("close-selected-project", () => {
	const projects = proj.closeSelectedProject();
	const openProjects = proj.getOpenProjects();
	if (openProjects.length > 0) {
		openProjects[openProjects.length - 1].open = true;
		openProjects[openProjects.length - 1].selected = true;
	} else {
		switchToPage("home");
	}
	return projects;
});

// project is the proj object, file is the basename of the image, rating is an integer 0-5
ipcMain.handle("set-rating", (e, photo, rating) => {
	photo.setRating(rating);
});

ipcMain.handle("archive-project", (e, name) => {
	proj.archiveProject(proj.getProject(name));
});

ipcMain.handle("unarchive-project", (e, name) => {
	proj.unArchiveProject(proj.getProject(name));
});

ipcMain.handle("delete-project", (e, name) => {
	proj.deleteProject(proj.getProject(name));
});

ipcMain.handle("get-open-projects", () => proj.getOpenProjects());

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
	const newProj = proj.newProject(
		args.name,
		args.srcDir,
		args.destDir,
		install_dir
	);
	proj.openProject(newProj.name);

	// TODO generate from source if one is given, otherwise generate from destination (do not copy files)
	proj.generateJPGPreviews(
		path.join(newProj.filepath, proj.PREVIEW_FOLDER_NAME),
		fs
			.readdirSync(newProj.srcDir)
			.filter((file) => path.extname(file).toUpperCase() === utils.SONY_RAW_EXTENSION)
			.map((file) => path.join(args.srcDir, file))
	);

	// add photo names to the project
	fs.readdirSync(newProj.srcDir)
		.filter((file) => path.extname(file).toUpperCase() === utils.SONY_RAW_EXTENSION)
		.forEach((file) => proj.addPhoto(newProj, file));

	switchToPage("projects");

	// this should occur in the background hopefully
	// TODO do not copy files if we are creating a project from existing destination
	copyFiles(
		args.srcDir,
		args.destDir,
		fs
			.readdirSync(args.srcDir)
			.filter((file) => path.extname(file).toUpperCase() === utils.SONY_RAW_EXTENSION)
	)
		.then(() => {
			console.log("done");
		})
		.catch((err) => {
			console.log(err);
		});

	proj.generateAllXMPs(newProj);
	return errors;
});

ipcMain.handle("get-projects", (e) => proj.getAllProjects());

ipcMain.handle("select-project", (e, name) => proj.selectProject(name));

ipcMain.on("uninstall_app", async (event, args) => {
	await uninstall_app();
	// Retrieve all open windows
	const allWindows = BrowserWindow.getAllWindows();

	// Loop through all windows and close them
	allWindows.forEach((window) => {
		window.close();
	});

	// Optionally, quit the app after all windows are closed
	app.quit();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.

app.on("window-all-closed", function () {
	// if (!utils.isMac)
	app.quit();
	proj.closeAllProjects();
	proj.saveUserData(install_dir);
});
