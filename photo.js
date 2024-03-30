// In-project imports
const utils = require("./utils");

// External imports
const console = require("console");

class Photo {
	constructor(basename, srcPath, destPath, previewPath, xmpPath) {
		this.basename = basename;
		this.srcPath = srcPath;
		this.destPath = destPath;
		this.previewPath = previewPath;
		this.xmpPath = xmpPath;
		this.rating = 0;
		this.tags = [];
		this.selected = false;
	}
}

function generateEmptyXMP() {
		photo.generateXMP({ rating: 0, tags: [] });
	}

function generateXMP(photo, XMPinfo) {
		const header =
			'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
			'<x:xmpmeta xmlns:x="http://ns.focus.com/meta">\n' +
			'\t<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n' +
			'\t\t<rdf:Description rdf:about=""\n' +
			'\t\t\t\txmlns:xmp="http://ns.focus.com/xap/1.0/">\n';

		let rating = "";
		if (XMPinfo["rating"] !== 0) {
			rating = `\t\t\t<xmp:Rating>${XMPinfo["rating"]}</xmp:Rating>\n`;
		}

		let tags = "";
		if (XMPinfo["tags"].length !== 0) {
			console.log(XMPinfo["tags"]);
			tags = `\t\t\t<xmp:Label>${XMPinfo["tags"].join(", ")}</xmp:Label>\n`;
		}

		// add any other tags here if necessary

		const footer =
			"\t\t</rdf:Description>\n" + "\t</rdf:RDF>\n" + "</x:xmpmeta>\n";

		const fileContents = header + rating + tags + footer;
		utils.writeXMP(photo, fileContents);
	}

function readXMP(photo) {
		const xmpInfo = {};
		let xmp = utils.readXMP(photo);

		// get rating
		const ratingStartIndex = xmp.indexOf("<xmp:Rating>");
		const ratingEndIndex = xmp.indexOf("</xmp:Rating>");
		if (ratingStartIndex === -1) {
			console.log("no rating tag found! must be 0.");
			xmpInfo.rating = 0;
		} else {
			let ratingStr = xmp.substring(
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

function setRating(photo, rating) {
	if (rating < 0 || rating > 5) {
		throw Error("rating must be between 0 and 5 inclusive.");
	}
	photo.rating = rating;
	const xmpInfo = readXMP(photo);
	xmpInfo.rating = rating;
	generateXMP(photo, xmpInfo);
}

function addTag(photo, tag) {
	photo.tags.push(tag);
	const xmpInfo = readXMP(photo);
	xmpInfo.tags.push(tag);
	generateXMP(photo, xmpInfo);
}

function removeTag(photo, tag) {
	photo.tags = photo.tags.filter((item) => item !== tag);
	const xmpInfo = readXMP(photo);
	xmpInfo.tags = xmpInfo.tags.filter((item) => item !== tag);
	generateXMP(photo, xmpInfo);
}

function hasTag(photo, tag) {
	return photo.tags.includes(tag);
}

function toggleTag(photo, tag) {
	if (hasTag(photo, tag)) {
		console.log("removing");
		removeTag(photo, tag);
	} else {
		console.log("adding");
		addTag(photo, tag);
	}
}

module.exports = {
	Photo,
	setRating,
	removeTag,
	addTag,
	toggleTag,
};
