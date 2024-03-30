// In-project imports
const { Photo } = require("./photo");
const utils = require("./utils");

// External imports
const path = require("node:path");
const fs = require("fs");
const console = require("console");
const extractd = require("extractd");

let projects = [];

class Project {
	constructor(name, srcDir, destDir, installDir) {
		this.name = name;
		this.srcDir = srcDir;
		this.destDir = destDir;
		this.filepath = path.join(installDir, name);
		this.archived = false;
		this.open = true;
		this.selected = true;
		this.photoNames = []; // list of filenames of the photos
		this.photos = [];
		this.loading = true;
	}
}

function getProject(name) {
	return projects.find((project) => project.name === name);
}

function addPhoto(project, basename) {
	project.photoNames.push(basename);

	const xmpFileName = path.basename(basename, path.extname(basename)) + ".XMP";
	project.photos.push(
		new Photo(
			basename,
			project.srcDir ? path.join(project.srcDir, basename) : "",
			path.join(project.destDir, basename),
			path.join(project.filepath, utils.PREVIEW_FOLDER_NAME, basename),
			path.join(project.destDir, xmpFileName)
		)
	);
}

function getAllProjects() {
	return projects;
}

function getOpenProjects() {
	return projects.filter((project) => project.open);
}

function selectProject(name) {
	projects = projects.map((project) => ({ ...project, selected: false }));
	const project = getProject(name);
	project.selected = true;
	project.photos[0].selected = true;  // sets the first photo to be selected
	return projects;
}

function openProject(name) {
	selectProject(name);
	const project = getProject(name);
	project.open = true;
	return projects;
}

function closeSelectedProject() {
	const selectedProject = projects.find((project) => project.selected);
	selectedProject.open = false;
	selectedProject.selected = false;
	return projects;
}

function closeAllProjects() {
	return projects.map((project) => ({
		...project,
		open: false,
		selected: false,
	}));
}

function newProject(name, srcDir, destDir, installDir) {
	const newProj = new Project(name, srcDir, destDir, installDir);

	createProjectDir(newProj);
	addProject(newProj);
	saveUserData(installDir); // doesn't hurt but not sure it's necessary
	return newProj;
}

function projectFromJson(json) {
	let newProj = JSON.parse(json);
	if (!newProj.archived) createProjectDir(newProj);

	return newProj;
}

function archiveProject(name) {
	const project = getProject(name);
	const previewsFile = path.join(project.filepath, utils.PREVIEW_FOLDER_NAME);
	utils.rmdir(previewsFile);
	projects.remove(project);
	project.open = false;
	project.archived = true;
}

async function unArchiveProject(name) {
	const project = getProject(name);
	await generateJPGPreviews(
		path.join(project.filepath, utils.PREVIEW_FOLDER_NAME),
		fs
			.readdirSync(project.destDir) // TODO newProj and args are undefined (bennett!)
			.filter(
				(file) => path.extname(file).toUpperCase() === utils.SONY_RAW_EXTENSION
			)
			.map((file) => path.join(project.destDir, file))
	);
	project.archived = false;
	project.open = false;
}

function deleteProject(name) {
	// this assumes the user has already confirmed that they want to delete the project
	const project = getProject(name);
	project.open = false;
	utils.rmdir(project.filepath);
	projects.remove(project);
}

function createProjectDir(project) {
	// check if this exists first inside install_dir, if not create it
	let thumbLoc = path.join(project.filepath, utils.PREVIEW_FOLDER_NAME);
	if (!fs.existsSync(project.filepath)) fs.mkdirSync(project.filepath);
	if (!fs.existsSync(thumbLoc)) fs.mkdirSync(thumbLoc);

	saveProject(project);
}

async function generateJPGPreviews(previewLocation, files) {
	// files is passed as an argument because we might load the files from elsewhere
	// it is possible that we have to recreate the thumbnails based on the destination copied files
	// DO NOT OVERWRITE EXISTING FILES

	console.log("begin preview generation");
	console.log(previewLocation);
	console.log(files);
	await (async () => {
		const done = await extractd.generate(files, {
			destination: previewLocation,
			persist: true,
		});
		console.dir(done);
	})();

	console.log("finished preview generation");
}

function generateAllXMPs(project) {
	project.photos.forEach((photo) => {
		// Skip if the XMP file already exists
		if (fs.existsSync(photo.xmpPath)) {
			console.log(`${photo.xmpPath} already exists. Skipping.`);
			return;
		}
		photo.generateEmptyXMP();
	});
}

function setLoading(loading) {
	projects = projects.map((project) => ({ ...project, loading: loading }));
	return projects;
}

function saveProject(project) {
	// save to this.save_dir
	console.log("filepath:" + project.filepath);
	console.log("name:" + project.name);
	let stored_project_file_path = path.join(
		project.filepath,
		project.name + ".json"
	);
	console.log("SAVE PROJECT STR: ", stored_project_file_path);
	console.log(JSON.stringify(project));
	fs.writeFile(stored_project_file_path, JSON.stringify(project), (err) => {
		if (err) console.log("ERROR SAVING USER PROJECT " + project.name);
	});
}

function newUserProjects() {
	// TODO double check this works
	return Object.create(projects);
}

function userProjectsFromJson(json) {
	return JSON.parse(json);
}

function addProject(project) {
	// remove all_user_projects
	projects = projects.map((project) => ({ ...project, selected: false }));
	projects.push(project);
}

function saveUserProjects(install_dir) {
	// save to install_dir
	let storedProjectsFilePath = path.join(
		install_dir,
		utils.JSON_PROJECTS_FILENAME
	);
	fs.writeFile(storedProjectsFilePath, JSON.stringify(projects), (err) => {
		if (err) console.log("ERROR SAVING USER PROJECT LIST");
	});
}

const verifyNewProject = (args) => ({
	name:
		args.name.length === 0 ||
		projects.some((project) => project.name === args.name),
	nameText:
		args.name.length === 0
			? "Name must be at least one character"
			: "Name already exists",
	srcDir: args.srcDir && !fs.existsSync(args.srcDir),
	destDir: !fs.existsSync(args.destDir),
});

function loadProjects(install_dir) {
	// returns a user projects object
	const stored_projects_file_path = path.join(
		install_dir,
		utils.JSON_PROJECTS_FILENAME
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
			return "new-project";
		} else {
			projects = userProjectsFromJson(content);
			return projects.filter((project) => project.open).length > 0
				? "projects"
				: "home";
		}
	});
	return "home";
}

function saveUserData(install_dir) {
	saveUserProjects(install_dir);
	projects.forEach((project) => saveProject(project));
}

module.exports = {
	// these are methods
	getProject,
	addPhoto,
	getAllProjects,
	getOpenProjects,
	selectProject,
	openProject,
	closeSelectedProject,
	closeAllProjects,
	newProject,
	generateJPGPreviews,
	generateAllXMPs,
	setLoading,
	saveProject,
	addProject,
	verifyNewProject,
	loadProjects,
	saveUserData,
	archiveProject,
	unArchiveProject,
	deleteProject,

	// the below are unused in main as of right now, might be able to delete?
	saveUserProjects,
	newUserProjects,
	projectFromJson,
	createProjectDir,
	userProjectsFromJson,
};
