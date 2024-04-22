// In-project imports
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
		this.photos = [];
		this.loading = true;
		this.copying = true;
		this.exporting = false;
	}
}

function getProject(name) {
	return projects.find((project) => project.name === name);
}

function getProjects() {
	return projects;
}

function getOpenProjects() {
	return projects.filter((project) => project.open);
}

function getSelectedProject() {
	return projects.find((project) => project.selected);
}

function getPhoto(name) {
	return getSelectedProject().photos.find((photo) => name === photo.name);
}

function getSelectedPhoto() {
	return getSelectedProject().photos.find((photo) => photo.selected);
}

function selectProject(name) {
	const previousProject = getSelectedProject();
	if (previousProject) {
		previousProject.selected = false;
	}

	const project = getProject(name);
	project.selected = true;
	console.log("project photos:");
	console.log(project.photos);

	const selectedPhoto = getSelectedPhoto();
	if (!selectedPhoto) {
		project.photos[0].selected = true;
	}

	return projects;
}

function selectPhoto(name) {
	getSelectedPhoto().selected = false;
	getPhoto(name).selected = true;
	return projects;
}

function iterateSelectedPhoto(value) {
	const selectedPhoto = getSelectedPhoto();
	const selectedProject = getSelectedProject();
	const i = selectedProject.photos.indexOf(selectedPhoto);
	selectedPhoto.selected = false;
	selectedProject.photos[
		(i + value + selectedProject.photos.length) % selectedProject.photos.length
	].selected = true;
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
	const openProjects = getOpenProjects();
	if (openProjects.length > 0) {
		openProjects[openProjects.length - 1].open = true;
		openProjects[openProjects.length - 1].selected = true;
	}
	return projects;
}

function closeAllProjects() {
	return projects.map((project) => ({
		...project,
		open: false,
		selected: false,
	}));
}

function projectIsCopying() {
	for (const project of projects) if (project.copying) return true;
	return false;
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
	newProj.copying = false;

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
	generatePreviewsFromDest(name);
	const project = getProject(name);
	project.archived = false;
	return openProject(name);
}

async function generatePreviewsFromDest(name) {
	const project = getProject(name);
	await generateJPGPreviews(
		path.join(project.filepath, utils.PREVIEW_FOLDER_NAME),
		fs
			.readdirSync(project.destDir)
			.filter(
				(file) => path.extname(file).toUpperCase() === utils.SONY_RAW_EXTENSION
			)
			.map((file) => path.join(project.destDir, file))
	);
}

function archiveSelectedProject() {
	const selectedProject = projects.find((project) => project.selected);
	const previewsFile = path.join(
		selectedProject.filepath,
		utils.PREVIEW_FOLDER_NAME
	);
	utils.rmdir(previewsFile);
	selectedProject.open = false;
	selectedProject.selected = false;
	selectedProject.photos = selectedProject.photos.map((photo) => ({
		...photo,
		loading: true,
	}));
	selectedProject.archived = true;
	selectedProject.loading = true;
	const openProjects = getOpenProjects();
	if (openProjects.length > 0) {
		openProjects[openProjects.length - 1].open = true;
		openProjects[openProjects.length - 1].selected = true;
	}
	return projects;
}

function deleteSelectedProject() {
	// this assumes the user has already confirmed that they want to delete the project
	const selectedProject = getSelectedProject();
	selectedProject.open = false;
	selectedProject.selected = false;
	utils.rmdir(selectedProject.filepath);
	projects.splice(projects.indexOf(selectedProject), 1);
	const openProjects = getOpenProjects();
	if (openProjects.length > 0) {
		openProjects[openProjects.length - 1].open = true;
		openProjects[openProjects.length - 1].selected = true;
	}
	return projects;
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

	await (async () => {
		const done = await extractd.generate(files, {
			destination: previewLocation,
			persist: true,
		});
		console.dir(done);
	})();
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

function verifyNewProject(name, srcDir, destDir) {
	return {
		name:
			name.length === 0 || projects.some((project) => project.name === name),
		nameText:
			name.length === 0
				? "Name must be at least one character"
				: "Name already exists",
		srcDir: srcDir && !fs.existsSync(srcDir),
		destDir: !fs.existsSync(destDir),
	};
}

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
			// upon loading the projects, none should be marked as copying, just in case one was accidentally left that way
			for (const project of projects) project.copying = false;
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

function filter(minRating, maxRating, tags) {
	const project = getSelectedProject();
	project.photos.forEach((photo) => {
		setFilterAttr(photo, minRating, maxRating, tags);
		console.log("Photo: " + photo.name);
		console.log("Rating: " + photo.rating);
		console.log("Filter? " + photo.inFilter);
	});
	return projects;
}

function setFilterAttr(photo, minRating, maxRating, tags) {
	const xmpInfo = utils.readXMP(photo);
	if (
		xmpInfo.rating >= minRating &&
		xmpInfo.rating <= maxRating && // rating matches query
		(tags.length === 0 || tags.every((tag) => xmpInfo.tags.includes(tag)))
	) {
		// tags match query
		photo.inFilter = true;
	} else {
		photo.inFilter = false; // shouldn't be necessary but just to make sure
	}
}

function removeFilters() {
	this.photos.forEach((photo) => {
		photo.inFilter = false;
	});
	return projects;
}

function exportProject(project, folderPath) {
	if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);
	const filterActive = project.photos.some((photo) => photo.inFilter);

	if (filterActive) {
		// if we have a filter, only export the filtered ones
		for (const photo of project.photos) {
			if (photo.inFilter) {
				exportPhoto(photo, folderPath);
			}
		}
	} else {
		// otherwise, export all
		for (const photo of project.photos) {
			exportPhoto(photo, folderPath);
		}
	}
}

function exportPhoto(photo, folderPath) {
	const exportRawPath = path.join(folderPath, photo.name);
	fs.copyFile(photo.destPath, exportRawPath, (err) => {
		if (err) {
			console.error("Error copying the file: " + photo.name, err);
		}
		console.log(photo.name + " exported to " + exportRawPath);
	});

	const exportXMPPath = path.join(folderPath, path.basename(photo.xmpPath));
	fs.copyFile(photo.xmpPath, exportXMPPath, (err) => {
		if (err) {
			console.error("Error copying the file: " + photo.xmpPath, err);
		}
		console.log(path.basename(photo.xmpPath) + " exported to " + exportXMPPath);
	});
}

module.exports = {
	// these are methods
	getProject,
	getProjects,
	getOpenProjects,
	getSelectedProject,
	getPhoto,
	getSelectedPhoto,
	selectProject,
	selectPhoto,
	iterateSelectedPhoto,
	openProject,
	closeSelectedProject,
	closeAllProjects,
	newProject,
	projectFromJson,
	archiveProject,
	unArchiveProject,
	generatePreviewsFromDest,
	archiveSelectedProject,
	deleteSelectedProject,
	createProjectDir,
	generateJPGPreviews,
	setLoading,
	saveProject,
	newUserProjects,
	userProjectsFromJson,
	addProject,
	saveUserProjects,
	verifyNewProject,
	loadProjects,
	saveUserData,
	filter,
	setFilterAttr,
	removeFilters,
	exportProject,
	exportPhoto,
	projectIsCopying,
};
