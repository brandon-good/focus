
const { exec } = require('child_process');

const path = require('node:path')
const fs = require('fs');
const console = require("console");
const extractd = require("extractd");

const JSON_PROJECTS_FILENAME = "projects.json";
const PREVIEW_FOLDER_NAME = 'previews';
const SONY_RAW_EXTENSION = '.ARW';

const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';
const exiftoolExecutable = !isMac && !isLinux ? 'exiftool-windows.exe' : 'exiftool';
const EXIFTOOL_PATH = path.join(__dirname, "exiftool", exiftoolExecutable);


let UserProjects = {
	projectList: [],
	openProjects: []
}

class Project {
	constructor(name, srcDir, destDir, installDir) {
		this.name = name;
		this.srcDir = srcDir;
		this.destDir = destDir;
		this.filepath = path.join(installDir, name);
		this.archived = false;
		this.open = true;
	}
}

function getAllProjects() {
	return UserProjects.projectList;
}

function getOpenProjects() {
	return UserProjects.openProjects;
}

function openProject(project) {
	if (!UserProjects.openProjects.includes(project)) {
		UserProjects.openProjects.push(project);
	}
}

function closeAllProjects() {
	UserProjects.openProjects = [];
}

function newProject(name, srcDir, destDir, installDir) {
	let newProj = new Project(name, srcDir, destDir, installDir);

	createProjectDir(newProj);
	addProject(newProj);
	saveUserData(installDir); // doesn't hurt but not sure it's necessary
	return newProj;
}

function projectFromJson(json) {
	let newProj = JSON.parse(json);
	if (!newProj.archived)
		createProjectDir(newProj);

	return newProj;
}

function archive(project) {
	// delete all temp files in directory
	project.archived = true;
}

function createProjectDir(project) {
	// check if this exists first inside install_dir, if not create it
	let thumbLoc = path.join(project.filepath, PREVIEW_FOLDER_NAME);
	if (! fs.existsSync(project.filepath)) fs.mkdirSync(project.filepath);
	if (! fs.existsSync(thumbLoc)) fs.mkdirSync(thumbLoc);

	saveProject(project);

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

function generateXMPs(project, XMPInfo) {
	// files is passed as an argument because we might load the files from elsewhere
	// it is possible that we have to recreate the thumbnails based on the destination copied files
	// DO NOT OVERWRITE EXISTING FILES
	let files = fs.readdirSync(project.srcDir).filter(file => {
		return path.extname(file).toUpperCase() === SONY_RAW_EXTENSION;
	});

	files.forEach(file => {
		const baseName = path.basename(file, path.extname(file));
		const xmpFileName = baseName + '.XMP';
		const xmpFilePath = path.join(project.destDir, xmpFileName);

		// Skip if the XMP file already exists
		if (fs.existsSync(xmpFilePath)) {
			console.log(`${xmpFilePath} already exists. Skipping.`);
			return;
		}

		// build exiftool command
		let command = `${EXIFTOOL_PATH} -o "${xmpFilePath}"`;
		for (const [key, value] of Object.entries(XMPInfo)) {
			const escapedValue = value.toString().replace(/"/g, '\\"');
			command += ` -XMP:${key}="${escapedValue}"`;
		}

		// execute command
		const result = execute(command);
		if (result === false) {
			console.log("Error creating/updating XMP file");
		} else {
			console.log(`XMP file created/updated successfully: ${xmpFileName}`);
		}
	});
}

function execute(command) {
	return exec(command, (error, stdout, stderr) => {
		if (error) {
			console.error(`Error executing command: ${error.message}`);
			return false;
		}
		if (stderr) {
			console.error(`stderr: ${stderr}`);
			return false;
		}
		return stdout;
	});
}

async function getRating(file) {
	const result = execute(`${EXIFTOOL_PATH} -XMP:Rating "${file}" | awk -F': ' '{print $2}'`);
	if (result === false) {
		console.log(`Error reading rating from ${file}`);
	}
	return result;
}

async function getTags(file) {
	const result = execute(`${EXIFTOOL_PATH} -XMP:Subject "${file}" | awk -F': ' '{print $2}'`);
	if (result === false) {
		console.log(`Error reading rating from ${file}`);
	}
	return result;
}

function saveProject(project) {
	// save to this.save_dir
	console.log('filepath:' + project.filepath);
	console.log('name:' + project.name);
	let stored_project_file_path = path.join(project.filepath, project.name + ".json");
	console.log("SAVE PROJECT STR: ", stored_project_file_path);
	console.log(JSON.stringify(project));
	fs.writeFile(stored_project_file_path, JSON.stringify(project), err => {
		if (err) console.log("ERROR SAVING USER PROJECT " + project.name);
	});
}

function newUserProjects() { // TODO double check this works
	return Object.create(UserProjects);
}

function userProjectsFromJson(json) {
	return JSON.parse(json);
}

function addProject(project) { // remove all_user_projects
	UserProjects.projectList.push(project);
}

function getProject(project_name) {
	return UserProjects.projectList.find((this_proj) =>
		this_proj.name === project_name
	);
}

function saveUserProjects(install_dir) {
	// save to install_dir
	let storedProjectsFilePath = path.join(install_dir, JSON_PROJECTS_FILENAME);
	fs.writeFile(storedProjectsFilePath, JSON.stringify(UserProjects), err => {
		if (err) console.log("ERROR SAVING USER PROJECT LIST");
	});
}


function verifyNewProject(name, srcDir, destDir) {
	// return true is this is valid, false if not valid

	// check unique name
	let duplicate = false;
	UserProjects.projectList.forEach(proj => {if (name === proj.name) duplicate = true});

	// check src and dest directories
	return !duplicate && fs.existsSync(srcDir) && fs.existsSync(destDir)
}

function loadProjects(install_dir) {
	// returns a user projects object
	const stored_projects_file_path = path.join(install_dir, JSON_PROJECTS_FILENAME);
	fs.readFile(stored_projects_file_path, (err, content) => {
		if (err) {
			fs.writeFile(
				stored_projects_file_path,
				JSON.stringify(UserProjects),
				(err) => {
					if (err) console.log("ERROR SAVING USER PROJECT LIST");
				}
			);
			return "new-project";
		} else {
			UserProjects = userProjectsFromJson(content);
			UserProjects.openProjects = UserProjects.projectList.filter((project) => project.open);
			return UserProjects.openProjects.length > 0 ? "projects" : "home";
		}
	});
	return "home";
}

function saveUserData(install_dir) {
	saveUserProjects(install_dir);
	UserProjects.openProjects.forEach(thisProj => saveProject(thisProj));
}

module.exports = {
	getAllProjects,
	getOpenProjects,
	openProject,
	closeAllProjects,
	newProject,
	generate_jpg_previews,
	generateXMPs,
	saveProject,
	addProject,
	getProject,
	verifyNewProject,
	getRating,
	getTags,
	loadProjects,
	saveUserData,
	archive,

	// the below are unused in main as of right now, might be able to delete?
	// UserProjects,
	// JSON_PROJECTS_FILENAME,
	// Project,
	saveUserProjects,
	newUserProjects,
	projectFromJson,
	createProjectDir,
	userProjectsFromJson,
};