
const path = require('node:path')
const fs = require('fs');
const console = require("console");
const extractd = require("extractd");

const JSON_PROJECTS_FILENAME = "projects.json";
// TODO this is repeated in main.js, should we export it from here and import in main.js?
const PREVIEW_FOLDER_NAME = 'previews';
const SONY_RAW_EXTENSION = '.ARW';

const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';


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

// TODO this is copied from main.js, should we export it here and import in main.js?
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

function archiveProject(project) {
	const previewsFile = path.join(project.filepath, PREVIEW_FOLDER_NAME);
	rmdir(previewsFile);
	UserProjects.openProjects.remove(project);
	project.archived = true;
}

function unArchiveProject(project) {
	generateJPGPreviews(project, path.join(project.filepath, PREVIEW_FOLDER_NAME), 
		fs
			.readdirSync(newProj.destDir)
			.filter((file) => path.extname(file).toUpperCase() === SONY_RAW_EXTENSION)
			.map((file) => path.join(args.destDir, file))
	);
	project.archived = false;
}

function deleteProject(project) {
	// this assumes the user has already confirmed that they want to delete the project
	rmdir(project.filepath);	
	UserProjects.projectList.remove(project);
	UserProjects.openProjects.remove(project);
}

function createProjectDir(project) {
	// check if this exists first inside install_dir, if not create it
	let thumbLoc = path.join(project.filepath, PREVIEW_FOLDER_NAME);
	if (! fs.existsSync(project.filepath)) fs.mkdirSync(project.filepath);
	if (! fs.existsSync(thumbLoc)) fs.mkdirSync(thumbLoc);

	saveProject(project);

}

function generateJPGPreviews(project, thumb_loc, files) {
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

function generateAllXMPs(project, XMPinfo) {
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

		generateXMP(xmpFilePath, XMPinfo);
	});
}

function generateXMP(xmpFilePath, XMPinfo) {
	const header = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
		'<x:xmpmeta xmlns:x="http://ns.focus.com/meta">\n' +
		'\t<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n' +
		'\t\t<rdf:Description rdf:about=""\n' +
		'\t\t\t\txmlns:xmp="http://ns.focus.com/xap/1.0/">\n';

	let rating = '';
	if (XMPinfo["rating"] !== 0) {
		rating = `\t\t\t<xmp:Rating>${XMPinfo["rating"]}</xmp:Rating>\n`;
	}

	let tags = ''
	if (XMPinfo['tags'].length !== 0) {
		console.log(XMPinfo['tags']);
		tags = `\t\t\t<xmp:Label>${XMPinfo['tags'].join(", ")}</xmp:Label>\n`
	}

	// add any other tags here if necessary

	const footer = '\t\t</rdf:Description>\n' +
		'\t</rdf:RDF>\n' +
		'</x:xmpmeta>\n';

	const fileContents = header + rating + tags + footer;
	fs.writeFile(xmpFilePath, fileContents, err => {
		if (err) console.log("ERROR SAVING XMP");
	});
}

async function getRating() {
	// TODO
}

async function getTags() {
	// TODO
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
	// these are constants
	PREVIEW_FOLDER_NAME,

	// these are methods
	getAllProjects,
	getOpenProjects,
	openProject,
	closeAllProjects,
	newProject,
	generateJPGPreviews,
	generateAllXMPs,
	generateXMP,
	saveProject,
	addProject,
	getProject,
	verifyNewProject,
	getRating,
	getTags,
	loadProjects,
	saveUserData,
	archiveProject,
	unArchiveProject,
	deleteProject,

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
