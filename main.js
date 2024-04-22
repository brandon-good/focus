// In-project imports
const keybinds = require("./keybinds");
const proj = require("./project");
const photoTools = require("./photo");
const utils = require("./utils");

// External imports
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
const { SONY_RAW_EXTENSION } = require("./utils");

// File-local constants
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
		mainWindow.webContents.on("before-input-event", (e, input) => {
			if (
				input.type === "keyDown" &&
				mainWindow.getURL().includes("projects")
			) {
				keybinds.handle(e, input, proj.getSelectedPhoto());
				mainWindow.webContents.send("update-projects", proj.getProjects());
			}
		});

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
async function copyFiles(srcDir, destDir, files) {
	console.log("files to copy " + files);
	await Promise.all(
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

function uninstall() {
	utils.rmdir(install_dir);
	fs.unlinkSync(path.join(userdata_dir, install_dir_filename));
}

async function validate(project) {
	const photoFiles = fs
		.readdirSync(project.destDir)
		.filter(
			(file) => path.extname(file).toUpperCase() === utils.SONY_RAW_EXTENSION
		);

	// check that all of the files in the directory have photo objects
	for (const file of photoFiles) {
		const baseName = path.basename(file, path.extname(file));
		const fileName = baseName + utils.SONY_RAW_EXTENSION;
		if (!project.photos.some((photo) => photo.name === fileName)) {
			console.log("New photo detected. Adding to object.");
			photoTools.addPhoto(project, fileName);
		}
	}

	// check that all of the photo objects have the correlating raw img and XMP
	// for (const photo of project.photos) {
	for (let i = 0; i < project.photos.length; i++) {
		let photo = project.photos[i];
		// checking for photo existing. if it doesn't, remove photo obj and continue
		if (!fs.existsSync(photo.destPath)) {
			console.log("Photo removal detected. Updating object to match.");

			project.photos.splice(i, 1);
			i--;
			console.log("After removal: ");
			console.log(project.photos);

			fs.unlinkSync(photo.previewPath);
			fs.unlinkSync(photo.xmpPath);

			mainWindow.webContents.send("update-projects", proj.getProjects());
			continue;
		}

		// if photo obj exists but XMP doesn't, regenerate XMP
		if (!fs.existsSync(photo.xmpPath)) {
			console.log("No XMP file found for photo. Creating a blank one.");
			utils.generateEmptyXMP(photo);
		}

		// if photo obj exists but preview doesn't, regenerate preview
		if (!fs.existsSync(photo.previewPath)) {
			console.log("No preview file found for photo. Regenerating.");
			await proj.generateJPGPreviews(
				path.join(project.filepath, utils.PREVIEW_FOLDER_NAME),
				[photo.destPath]
			);
			photo.loading = false;
			photo.inFilter = true;
			mainWindow.webContents.send("update-projects", proj.getProjects());
		}
	}
	console.log("After loop: ");
	console.log(project.photos);
}

// IPC HANDLERS

ipcMain.handle("open-dialog", async (e, configInstall, buttonLabel, title) => {
	const import_from = await dialog.showOpenDialog({
		buttonLabel: buttonLabel,
		properties: ["openDirectory"],
		title: title,
	});
	return !import_from.canceled
		? configInstall
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
	proj.getProjects().map((proj) => proj.name)
);

ipcMain.on("open-project", async (e, name) => {
	proj.openProject(name);
	if (!mainWindow.getURL().includes("projects")) {
		switchToPage("projects");
	} else {
		mainWindow.webContents.send("update-projects", proj.getProjects());
	}

	const project = proj.getSelectedProject();
	if (project.archived) {
		for (const photo of project.photos) {
			await proj.generateJPGPreviews(
				path.join(project.filepath, utils.PREVIEW_FOLDER_NAME),
				[photo.destPath]
			);
			utils.generateEmptyXMP(photo);

			photo.loading = false;
			mainWindow.webContents.send("update-projects", proj.getProjects());
		}

		project.archived = false;
		project.loading = false;
		mainWindow.webContents.send("update-projects", proj.getProjects());
	}
	await validate(project);
});

ipcMain.handle("close-selected-project", () => proj.closeSelectedProject());

ipcMain.handle("archive-selected-project", () => proj.archiveSelectedProject());

ipcMain.handle(
	"unarchive-project",
	async (e, name) => await proj.unArchiveProject(proj.getProject(name))
);

ipcMain.handle("delete-selected-project", (e, name) =>
	proj.deleteSelectedProject()
);

ipcMain.handle("filter-photos", (e, minRating, maxRating, tags) =>
	proj.filter(minRating, maxRating, tags)
);

ipcMain.handle("export-project", async (e, folderPath) => {
	const project = proj.getSelectedProject();
	project.exporting = true;
	mainWindow.webContents.send("update-projects", proj.getProjects());
	await proj.exportProject(project, folderPath);
	project.exporting = false;
	return proj.getProjects();
});

ipcMain.handle("get-open-projects", () => proj.getOpenProjects());

ipcMain.handle("create-project", async (e, name, srcDir, destDir) => {
	const errors = proj.verifyNewProject(name, srcDir, destDir);
	if (
		Object.values(errors).some((error) => typeof error === "boolean" && error)
	) {
		return errors;
	}

	const photoLoc = srcDir ? srcDir : destDir;
	const newProj = proj.newProject(name, srcDir, destDir, install_dir);

	// below we are looping over the photo directory multiple times
	// coalesce these into 1 for loop that does the following
	//		adds photo to list of photos in project
	//		generates JPG preview
	//		updates front end with new information

	const startRead = new Date();
	const photoFiles = fs
		.readdirSync(photoLoc)
		.filter(
			(file) => path.extname(file).toUpperCase() === utils.SONY_RAW_EXTENSION
		);
	const endRead = new Date();
	const readDiff = endRead - startRead;

	for (const file of photoFiles) {
		photoTools.addPhoto(newProj, file);
	}

	const endPhotoAdd = new Date();
	const photoAddDiff = endPhotoAdd - endRead;

	// must occur after creating photo objects to set the selected photo
	proj.openProject(newProj.name);
	switchToPage("projects");

	for (let i = 0; i < newProj.photos.length; i++) {
		const file = photoFiles[i];
		const photoObj = newProj.photos[i];

		// do not copy files if we are creating a project from existing destination
		if (srcDir) await copyFiles(srcDir, destDir, [file]);

		await proj.generateJPGPreviews(
			path.join(newProj.filepath, utils.PREVIEW_FOLDER_NAME),
			[path.join(destDir, file)]
		);
		utils.generateEmptyXMP(photoObj);

		photoObj.loading = false;
		mainWindow.webContents.send("update-projects", proj.getProjects());
	}

	newProj.loading = false;
	newProj.copying = false;
	mainWindow.webContents.send("update-projects", proj.getProjects()); // this is to mark the copies icon as finished
	const endCopy = new Date();
	const copyDiff = endCopy - endPhotoAdd;

	console.log("reading took:       " + Math.round(readDiff) + " ms");
	console.log("photo add took:     " + Math.round(photoAddDiff) + " ms");
	console.log("copying took:       " + Math.round(copyDiff) + " ms");

	return errors;
});

ipcMain.handle("get-projects", (e) => proj.getProjects());

ipcMain.handle("select-project", (e, name) => proj.selectProject(name));

ipcMain.handle("select-photo", (e, name) => proj.selectPhoto(name));

ipcMain.on("uninstall", async (e, args) => {
	uninstall();
	// Retrieve all open windows
	const allWindows = BrowserWindow.getAllWindows();

	// Loop through all windows and close them
	allWindows.forEach((window) => {
		window.close();
	});

	app.quit();
});

ipcMain.handle("set-rating", (e, name, rating) =>
	photoTools.setRating(name, rating)
);

ipcMain.handle("add-tag", (e, name, tag) => photoTools.addTag(name, tag));

ipcMain.handle("remove-tag", (e, name, tag) => photoTools.removeTag(name, tag));

// TODO set deletePhoto to either soft or hard or whatever we want it to be.
// Just "deletePhoto" doesn't exist anymore
ipcMain.handle("delete-photo", (e, name) => photoTools.removePhoto(name));

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", function () {
	// if (!utils.isMac)
	app.quit();
	exitApp();
});

function exitApp() {
	if (proj.projectIsCopying()) {
		setTimeout(() => {
			exitApp();
		}, 1000);
		return;
	}

	proj.closeAllProjects();
	proj.saveUserData(install_dir);
}
