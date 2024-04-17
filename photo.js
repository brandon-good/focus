// In-project imports
const proj = require("./project");
const utils = require("./utils");

// External imports
const path = require("node:path");
const trash = require("trash");

class Photo {
	constructor(name, srcPath, destPath, previewPath, previewPathURL, xmpPath) {
		this.name = name;
		this.srcPath = srcPath;
		this.destPath = destPath;
		this.previewPath = previewPath;
		this.previewPathURL = previewPathURL;
		this.xmpPath = xmpPath;
		this.rating = 0;
		this.tags = [];
		this.selected = false;
		this.loading = true;
		this.deleted = false;
		this.inFilter = false;
	}
}

function addPhoto(project, name) {
	const previewPath = path.join(
		project.filepath,
		utils.PREVIEW_FOLDER_NAME,
		path.basename(name, path.extname(name)) + ".jpg"
	);
	project.photos.push(
		new Photo(
			name,
			project.srcDir ? path.join(project.srcDir, name) : "",
			path.join(project.destDir, name),
			previewPath,
			`preview://${previewPath.replace(/\\/g, "/")}`,
			path.join(
				project.destDir,
				path.basename(name, path.extname(name)) + ".XMP"
			)
		)
	);
}

function readXMPUpdateAttrs(photo) {
	const xmpInfo = utils.readXMP(photo);

	// update photo obj with xmp info
	photo.rating = structuredClone(xmpInfo.rating);
	photo.tags = structuredClone(xmpInfo.tags);

	return xmpInfo;
}

function setRating(name, rating) {
	const photo = proj.getPhoto(name);
	if (!(rating >= 0 && rating <= 5)) {
		throw Error("rating must be between 0 and 5.");
	}
	const xmpInfo = readXMPUpdateAttrs(photo);
	photo.rating = rating;
	xmpInfo.rating = rating;
	utils.generateXMP(photo, xmpInfo);
	return proj.getProjects();
}

function addTag(name, tag) {
	const photo = proj.getPhoto(name);
	const xmpInfo = readXMPUpdateAttrs(photo);
	photo.tags.push(tag);
	xmpInfo.tags.push(tag);
	utils.generateXMP(photo, xmpInfo);
	return proj.getProjects();
}

function removeTag(name, tag) {
	const photo = proj.getPhoto(name);
	const xmpInfo = readXMPUpdateAttrs(photo);
	photo.tags = photo.tags.filter((item) => item !== tag);
	xmpInfo.tags = xmpInfo.tags.filter((item) => item !== tag);
	utils.generateXMP(photo, xmpInfo);
	return proj.getProjects();
}

function softDeletePhoto(photoName) {
	console.log('soft deleting: ' + photoName)
	const project = proj.getSelectedProject();
	const photo = project.photos.find((p) => p.name === photoName)
	photo.deleted = true
	return proj.getProjects();
}

function softRestorePhoto(photoName) {
	const project = proj.getSelectedProject();
	const photo = project.photos.find((p) => p.name === photoName)
	photo.deleted = false
	return proj.getProjects();
}

function hardDeletePhotos() {
	const project = proj.getSelectedProject();
	// given a project, truly delete all of the photos
	// that have the photo.delete field set to true
	const deletedPhotos = project.photos.filter((p) => p.deleted === true)
	for (const photo of deletedPhotos) {
		removePhoto(project, photo.name)
	}
	return proj.getProject();
}

function removePhoto(photoName) {
	const project = proj.getSelectedProject();
	// delete the xmp, 
	// delete the raw photo from dest dir
	// delete the preview
	//const project = getSelectedProject();
	console.log("deleting photo " + photoName + " from project " + project.name);
	const photo = project.photos.find((photo) => photo.name === photoName);
	const photoIndex = project.photos.indexOf(photo);

	if (photoIndex === -1) {
		throw Error("photo " + photoName + " does not exist.");
	} else if (photoIndex > -1) {
		project.photos.splice(photoIndex, 1);
	}

	photo.deleted = true;

	console.log(photo.destPath)
	console.log(photo.previewPath)
	console.log(photo.xmpPath)
	try {
		(async () => {
			await trash([photo.destPath, photo.previewPath, photo.xmpPath]);
		})();
	} catch (error) {
		console.log(error);
		console.log("failed to fully delete photo.");
	}

	const selectedProject = proj.getSelectedProject();
	if (selectedProject.photos.length === 0) {
		proj.deleteSelectedProject();
	} else if (selectedProject.photos.every((photo) => !photo.selected)) {
		selectedProject.photos[0].selected = true;
	}
	return proj.getProjects();
}

// not sure if we need hasTag and toggleTag?

function hasTag(photo, tag) {
	return photo.tags.includes(tag);
}

function toggleTag(photo, tag) {
	if (hasTag(photo, tag)) {
		removeTag(photo, tag);
	} else {
		addTag(photo, tag);
	}
}

module.exports = {
	Photo,
	addPhoto,
	setRating,
	addTag,
	removeTag,
	toggleTag,
	softDeletePhoto,
	softRestorePhoto,
	hardDeletePhotos,
	removePhoto,
};
