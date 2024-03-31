const proj = require("./project");
const photoTools = require("./photo");

let lastKeyPress;

function handle(e, input, photo) {
	const keyPress = input.key.toLowerCase();

	switch (keyPress) {
		case "arrowdown":
			proj.iterateSelectedPhoto(1);
			break;
		case "arrowup":
			proj.iterateSelectedPhoto(-1);
			break;
		case "0":
		case "1":
		case "2":
		case "3":
		case "4":
		case "5":
			photoTools.setRating(photo.name, parseInt(keyPress));
			break;
		case "6":
		case "7":
		case "8":
		case "9":
		case "0":
			photoTools.addTag(photo.name, translateKeyToTag(keyPress));
			break;
		case "^":
		case "&":
		case "*":
		case "(":
		case ")":
			photoTools.removeTag(photo.name, translateKeyToTag(keyPress));
		default:
			break;
	}
}

function translateKeyToTag(keyPress) {
	switch (keyPress) {
		case "6":
		case "^":
			return "red";
		case "7":
		case "&":
			return "green";
		case "8":
		case "*":
			return "blue";
		case "9":
		case "(":
			return "yellow";
		case "0":
		case ")":
			return "purple";
		default:
			return "red";
	}
}

module.exports = {
	handle,
};
