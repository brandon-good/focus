// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("fs");
const console = require("console");
const path = require("node:path");
const util = require("util");
const extractd = require("extractd");
const js2xmlparser = require("js2xmlparser");
//const projects = require('./projects.js');

const isMac = process.platform === "darwin";
const isLinux = process.platform === "linux"; // do we need this?
const isDev = process.env.NODE_ENV !== "development";
const PREVIEW_FOLDER_NAME = "previews";
const SONY_RAW_EXTENSION = ".ARW";

const userdata_dir = app.getPath("userData");
const install_dir_filename = "install_directory.txt";
let install_dir = path.join(app.getPath("home"), "Focus");

let mainWindow;

let projects = [];
let openProjects = [];

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
			loadProjects(install_dir);
		}
	});
}

function verifyInstallDirectory() {
	if (!fs.existsSync(install_dir)) fs.mkdirSync(install_dir);
}

function save_user_data() {
	save_user_projects(projects, install_dir);
	openProjects.forEach((proj) => save_project(proj));
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
			// rm fiilename
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
	install_dir = dir;

	// save to file
	const install_dir_file = path.join(userdata_dir, install_dir_filename);
	fs.writeFile(install_dir_file, dir, (err) => {
		if (err) console.log("ERROR INITIALIZING INSTALL DIRECTORY");
	});

	verifyInstallDirectory();
	loadProjects(install_dir);
});

ipcMain.handle("get-project-names", () => projects.map((proj) => proj.name));

ipcMain.handle("open-project", (e, name) => {
	const project = projects.find((proj) => proj.name === name);
	if (!openProjects.includes(project)) {
		openProjects.push(project);
	}
	switchToPage("projects");
	return project;
});

ipcMain.handle("get-open-projects", () => openProjects);

ipcMain.on("import_files", (e, { srcDir, destDir }) => {
	console.log("src dir: " + srcDir);
	console.log("dest dir: " + destDir);
});

ipcMain.on("return_index", async (event, args) => {
	mainWindow.loadFile("index.html");
	// TODO close currently active project

	// saves and removes all active projects
	openProjects.forEach((proj) => save_project(proj));
	openProjects = [];
});

const verifyNewProject = (args) => ({
	name:
		args.name.length === 0 ||
		projects.some((project) => project.name === args.name),
	nameText:
		args.name.length === 0
			? "Name must be at least one character"
			: "Name already exists",
	srcDir: !fs.existsSync(args.srcDir),
	destDir: !fs.existsSync(args.destDir),
});

ipcMain.handle("create-project", (e, args) => {
	const errors = verifyNewProject(args);
	if (
		Object.values(errors).some((error) => typeof error === "boolean" && error)
	) {
		return errors;
	}
	const proj = new Project(args.name, args.srcDir, args.destDir);
	create_project_dir(proj);
	add_project(proj);
	openProjects.push(proj);

	const default_xml_info = {
		filename: "",
		rating: "",
		tags: "",
	};

	generate_xmls(
		proj,
		default_xml_info,
		fs
			.readdirSync(proj.srcDir)
			.filter((file) => path.extname(file).toUpperCase() === SONY_RAW_EXTENSION)
	);

	generate_jpg_previews(
		proj,
		path.join(proj.filepath, PREVIEW_FOLDER_NAME),
		fs
			.readdirSync(proj.srcDir)
			.filter((file) => path.extname(file).toUpperCase() === SONY_RAW_EXTENSION)
			.map((file) => path.join(args.srcDir, file))
	);

	switchToPage("projects");

	// this should occur in the background hopefully
	copyFiles(
		args.srcDir,
		args.destDir,
		fs
			.readdirSync(args.srcDir)
			.filter((file) => path.extname(file).toUpperCase() === SONY_RAW_EXTENSION)
	)
		.then(() => {
			console.log("done");
		})
		.catch((err) => {
			console.log(err);
		});

	return errors;
});

ipcMain.handle("get-preview-paths", (e, proj) =>
	fs
		.readdirSync(path.join(proj.filepath, PREVIEW_FOLDER_NAME))
		.map((previewPath) =>
			path.join(proj.filepath, PREVIEW_FOLDER_NAME, previewPath)
		)
);

ipcMain.on("uninstall_app", async (event, args) => {
	uninstall_app();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", function () {
	if (!isMac) app.quit();
	save_user_data();
});

// I WANT TO PUT ALL THIS SHIT INTO A DIFFERENT FOLDER BUT I CANT FOR THE LIFE OF ME

const projects_json_filename = "projects.json";

class Project {
	constructor(name, srcDir, destDir) {
		this.name = name;
		this.srcDir = srcDir;
		this.destDir = destDir;
		this.filepath = path.join(install_dir, name);
		this.archived = false;
		this.open = true;
	}
}

function archive(project) {
	// delete all temp files in directory
	project.archived = true;
}

function create_project_dir(project) {
	// check if this exists first inside install_dir, if not create it
	const thumb_loc = path.join(project.filepath, PREVIEW_FOLDER_NAME);
	if (!fs.existsSync(project.filepath)) fs.mkdirSync(project.filepath);
	if (!fs.existsSync(thumb_loc)) fs.mkdirSync(thumb_loc);

	save_project(project);

	// TODO save the jpg images
}

function generate_jpg_previews(project, thumb_loc, files) {
	// files is passed as an argument because we might load the files from elsewhere
	// it is possible that we have to recreate the thumbnails based on the destination copied files
	// DO NOT OVERWRITE EXISTING FILES

	console.log("begin preview generation");
	console.log(thumb_loc);
	console.log(files);
	(async () => {
		const done = await extractd.generate(files, {
			destination: thumb_loc,
			persist: true,
		});
		console.dir(done);
	})();

	console.log("finished preview generation");
}

function generate_xmls(project, xml_info, files) {
	// files is passed as an argument because we might load the files from elsewhere
	// it is possible that we have to recreate the thumbnails based on the destination copied files
	// DO NOT OVERWRITE EXISTING FILES
	files.forEach((file) => {
		const xml_file = path.basename(file, path.extname(file)) + ".xml";
		const filePath = path.join(project.destDir, xml_file);
		// skip if the file exists already
		if (fs.existsSync(filePath)) {
			console.log(filePath + "already exists. Skipping.");
			return;
		}
		// otherwise generate xml and save
		xml_info.filename = file;
		const xml = js2xmlparser.parse("root", xml_info);
		fs.writeFile(filePath, xml, (err) => {
			if (err) console.log("ERROR SAVING PROJECT XMLS " + project.name);
		});
	});
}

function save_project(project) {
	// save to this.save_dir
	console.log("filepath:" + project.filepath);
	console.log("name:" + project.name);
	const stored_project_file_path = path.join(
		project.filepath,
		project.name + ".json"
	);
	console.log(JSON.stringify(project));
	fs.writeFile(stored_project_file_path, JSON.stringify(project), (err) => {
		if (err) console.log("ERROR SAVING USER PROJECT " + project.name);
	});
}

const add_project = (project) => projects.push(project);

function save_user_projects(user_projects, install_dir) {
	// save to install_dir
	const stored_projects_file_path = path.join(
		install_dir,
		projects_json_filename
	);
	fs.writeFile(
		stored_projects_file_path,
		JSON.stringify(user_projects),
		(err) => {
			if (err) console.log("ERROR SAVING USER PROJECT LIST");
		}
	);
}

function loadProjects(install_dir) {
	// returns a user projects object
	const stored_projects_file_path = path.join(
		install_dir,
		projects_json_filename
	);
	fs.readFile(stored_projects_file_path, (err, content) => {
		if (err) {
			fs.writeFile(
				stored_projects_file_path,
				JSON.stringify(projects),
				(err) => {
					if (err) console.log("ERROR SAVING USER PROJECT LIST");
				}
			);
			switchToPage("new-project");
		} else {
			projects = JSON.parse(content);
			openProjects = projects.filter((project) => project.open);
			switchToPage(openProjects.length > 0 ? "projects" : "home");
		}
	});
}
