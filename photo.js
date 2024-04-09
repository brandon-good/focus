// In-project imports
const proj = require("./project");
const utils = require("./utils");

// External imports
const fs = require("fs");
const console = require("console");
const path = require("node:path");

class Photo {
	constructor(name, srcPath, destPath, previewPath, xmpPath) {
		this.name = name;
		this.srcPath = srcPath;
		this.destPath = destPath;
		this.previewPath = previewPath;
		this.xmpPath = xmpPath;
		this.rating = 0;
		this.tags = [];
		this.selected = false;
		this.loaded = false;
	}
}

function addPhoto(project, name) {
	const previewPath = 
			`preview://${path
				.join(
					project.filepath,
					utils.PREVIEW_FOLDER_NAME,
					path.basename(name, path.extname(name)) + ".jpg"
				)
				.replace(/\\/g, "/")}`;
	console.log(previewPath);

	project.photos.push(
		new Photo(
			name,
			project.srcDir ? path.join(project.srcDir, name) : "",
			path.join(project.destDir, name),
			`preview://${path
				.join(
					project.filepath,
					utils.PREVIEW_FOLDER_NAME,
					path.basename(name, path.extname(name)) + ".jpg"
				)
				.replace(/\\/g, "/")}`,
			path.join(
				project.destDir,
				path.basename(name, path.extname(name)) + ".XMP"
			)
		)
	);
}

function generateXMPs(project) {
	for (const photo of project.photos) {
		generateEmptyXMP(photo);
	}
}

function generateEmptyXMP(photo) {
	// Skip if the XMP file already exists
	if (fs.existsSync(photo.xmpPath)) {
		console.log(`${photo.xmpPath} already exists. Skipping.`);
		continue;
	}

	generateXMP(photo, { rating: 0, tags: [] });
}

function generateXMP(photo, XMPinfo) {
	header =
		'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
		'<x:xmpmeta xmlns:x="http://ns.focus.com/meta">\n' +
		'\t<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n' +
		'\t\t<rdf:Description rdf:about=""\n' +
		'\t\t\t\txmlns:xmp="http://ns.focus.com/xap/1.0/">\n';
	rating = `\t\t\t<xmp:Rating>${XMPinfo["rating"]}</xmp:Rating>\n`;
	tags = `\t\t\t<xmp:Label>${XMPinfo["tags"].join(", ")}</xmp:Label>\n`;
	footer = "\t\t</rdf:Description>\n" + "\t</rdf:RDF>\n" + "</x:xmpmeta>\n";
	utils.writeXMP(photo, header + rating + tags + footer);
}

function readXMP(photo) {
	const xmpInfo = {};
	const xmp = utils.readXMP(photo);

	// get rating
	const ratingStartIndex = xmp.indexOf("<xmp:Rating>");
	const ratingEndIndex = xmp.indexOf("</xmp:Rating>");
	if (ratingStartIndex === -1) {
		console.log("no rating tag found! must be 0.");
		xmpInfo.rating = 0;
	} else {
		const ratingStr = xmp.substring(
			ratingStartIndex + "<xmp:Rating>".length,
			ratingEndIndex
		);
		console.log("rating = " + ratingStr);
		try {
			xmpInfo.rating = parseInt(ratingStr);
		} catch (exc) {
			console.log(
				"ERROR parsing rating from xmp" + photo.xmpPath + exc.toString()
			);
		}
	}

	// get tags
	const tagsStartIndex = xmp.indexOf("<xmp:Label>");
	const tagsEndIndex = xmp.indexOf("</xmp:Label>");
	if (tagsStartIndex === -1) {
		xmpInfo.tags = [];
	} else {
		const tagsList = xmp
			.substring(tagsStartIndex + "<xmp:Label>".length, tagsEndIndex)
			.split(", ");
		xmpInfo.tags = tagsList;
		console.log("tags include " + tagsList.toString());
	}

	// update photo obj with xmp info
	photo.rating = xmpInfo.rating;
	photo.tags = xmpInfo.tags;

	return xmpInfo;
}

function setRating(name, rating) {
	const photo = proj.getPhoto(name);
	if (!(rating >= 0 && rating <= 5)) {
		throw Error("rating must be between 0 and 5.");
	}
	const xmpInfo = readXMP(photo);
	photo.rating = rating;
	xmpInfo.rating = rating;
	generateXMP(photo, xmpInfo);
	return proj.getProjects();
}

function addTag(name, tag) {
	const photo = proj.getPhoto(name);
	const xmpInfo = readXMP(photo);
	photo.tags.push(tag);
	xmpInfo.tags.push(tag);
	generateXMP(photo, xmpInfo);
	return proj.getProjects();
}

function removeTag(name, tag) {
	const photo = proj.getPhoto(name);
	const xmpInfo = readXMP(photo);
	photo.tags = photo.tags.filter((item) => item !== tag);
	xmpInfo.tags = xmpInfo.tags.filter((item) => item !== tag);
	generateXMP(photo, xmpInfo);
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
	generateXMPs,
	setRating,
	addTag,
	removeTag,
	toggleTag,
};
