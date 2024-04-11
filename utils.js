// Utils should have no in-project dependencies

// External imports
const path = require("node:path");
const fs = require("fs");
const console = require("console");

// All project-wide constants should be defined here
const JSON_PROJECTS_FILENAME = "projects.json";
const PREVIEW_FOLDER_NAME = "previews";
const SONY_RAW_EXTENSION = ".ARW";

const isMac = process.platform === "darwin";
const isLinux = process.platform === "linux";
const isWindows = process.platform === "win32";
const isDev = process.env.NODE_ENV !== "development";


function readXMPFile(photo) {
	try {
		return fs.readFileSync(photo.xmpPath, "utf8");
	} catch (err) {
		if (err.code === 'ENOENT') {
			console.log("XMP file for " + photo.name + "does not exist. Regenerating.");
			generateXMP(photo, { rating: 0, tags: [] });
		} else {
			console.error("ERROR READING XMP");
		}
		return "";
	}
}

function readXMP(photo) {
	const xmpInfo = {};
	const xmp = readXMPFile(photo);

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
	return xmpInfo;
}

function writeXMPFile(photo, contents) {
	fs.writeFile(photo.xmpPath, contents, (err) => {
		if (err) console.log("ERROR SAVING XMP");
	});
}

function resetXMPs(project) {
	// this is destructive!!

	for (const photo of project.photos) {
		if (fs.existsSync(photo.xmpPath)) {
			fs.rm(photo.xmpPath);
		}
	}

	generateXMPs(project);
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
		return;
	}
	generateXMP(photo, { rating: 0, tags: [] });
}

function generateXMP(photo, XMPinfo) {
	const header =
		'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
		'<x:xmpmeta xmlns:x="http://ns.focus.com/meta">\n' +
		'\t<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n' +
		'\t\t<rdf:Description rdf:about=""\n' +
		'\t\t\t\txmlns:xmp="http://ns.focus.com/xap/1.0/">\n';

	let rating;
	if (XMPinfo.rating === null || XMPinfo.rating === 0) { // apparently it's null when not selected
		rating = "";
	} else {
		rating = `\t\t\t<xmp:Rating>${XMPinfo.rating}</xmp:Rating>\n`;
	}
	let tags;

	if (XMPinfo.tags.length === 0) {
		tags = "";
	} else {
		tags = `\t\t\t<xmp:Label>${XMPinfo.tags.join(", ")}</xmp:Label>\n`;
	}

	const footer = "\t\t</rdf:Description>\n" + "\t</rdf:RDF>\n" + "</x:xmpmeta>\n";
	writeXMPFile(photo, header + rating + tags + footer);
}

function rmdir(dir) {
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
}

module.exports = {
	readXMPFile,
	readXMP,
	writeXMPFile,
	resetXMPs,
	generateXMPs,
	generateEmptyXMP,
	generateXMP,
	rmdir,

	JSON_PROJECTS_FILENAME,
	PREVIEW_FOLDER_NAME,
	SONY_RAW_EXTENSION,
	isMac,
	isLinux,
	isWindows,
	isDev,
};
