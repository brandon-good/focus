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

function readXMP(photo) {
	try {
		return fs.readFileSync(photo.xmpPath, "utf8");
	} catch (err) {
		console.error("ERROR READING XMP");
		return "";
	}
}

function writeXMP(photo, contents) {
	fs.writeFile(photo.xmpPath, contents, (err) => {
		if (err) console.log("ERROR SAVING XMP");
	});
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
	readXMP,
	writeXMP,
	rmdir,

	JSON_PROJECTS_FILENAME,
	PREVIEW_FOLDER_NAME,
	SONY_RAW_EXTENSION,
	isMac,
	isLinux,
	isWindows,
	isDev,
};
