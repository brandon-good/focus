// In-project imports
const utils = require("./utils");

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

	setRating(rating) {
		this.rating = rating;

		if (rating < 0 || rating > 5) {
			throw Error("rating must be between 0 and 5 inclusive.");
		}
		let xmp = utils.readXMP(this);

		const startIndex = xmp.indexOf("<xmp:Rating>");
		const endIndex = xmp.indexOf("</xmp:Rating>");

		if (startIndex !== -1 && rating !== 0) {
			// if the line exists and we want to update it
			xmp =
				xmp.substring(0, startIndex + "<xmp:Rating>".length) +
				rating.toString() +
				xmp.substring(endIndex, xmp.length);
		} else if (startIndex !== -1 && rating === 0) {
			// if the line exists and we want to remove it
			xmp =
				xmp.substring(0, startIndex - "\n".length) +
				xmp.substring(endIndex + "</xmp:Rating>".length, xmp.length);
		} else if (startIndex === -1 && rating !== 0) {
			// if we want to add the line and the line doesn't exist
			const searchStr = 'xmlns:xmp="http://ns.focus.com/xap/1.0/">\n';
			const insertIndex = xmp.indexOf(searchStr);
			const beforeInsert = xmp.substring(0, insertIndex + searchStr.length);
			const afterInsert = xmp.substring(
				insertIndex + searchStr.length,
				xmp.length
			);
			const newRating = `\t\t\t<xmp:Rating>${rating}</xmp:Rating>\n`;

			console.log(
				"XMP before: ",
				xmp,
				"\nBefore: ",
				beforeInsert,
				"\nAfter: ",
				afterInsert
			);
			xmp = beforeInsert + newRating + afterInsert;
		} // else (startIndex === -1 && rating === 0), if the line doesn't exist and we don't want to add it, do nothing

		utils.writeXMP(this, xmp);
	}

	addTag(tag) {
		// TODO get the tag, add to list, write list of tags to XMP. similar structure to setRating
	}

	removeTag(tag) {
		// TODO same as addTag but remove from list of tags instead
	}

	generateEmptyXMP(photo) {
		utils.writeXMP(photo,
			'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
			'<x:xmpmeta xmlns:x="http://ns.focus.com/meta">\n' +
			'\t<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n' +
			'\t\t<rdf:Description rdf:about=""\n' +
			'\t\t\t\txmlns:xmp="http://ns.focus.com/xap/1.0/">\n' +
			"\t\t</rdf:Description>\n" +
			"\t</rdf:RDF>\n" +
			"</x:xmpmeta>\n"
		)
	}

	// might be an unnecessary function if we're live updating the XMP anyway
	writeXMP(photo, XMPinfo) {
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

	readXMP() {
		// TODO this should be a dictionary with {"rating": 0, "tags": []}
		const xmpInfo = {};
		let xmp = utils.readXMP(this);

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
					"ERROR parsing rating from xmp" + this.xmpPath + exc.toString()
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

		// update this obj with xmp info
		this.rating = xmpInfo.rating;
		this.tags = xmpInfo.tags;

		return xmpInfo;
	}

}




module.exports = {
	Photo

}
