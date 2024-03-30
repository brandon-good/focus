const photo = require("./photo");

let lastKeyPress;

function handle(event, input, page, projects) {
	if (page !== 'projects') return;  // for now, do not record input unless on project page
	
	const keyPress = input.key.toLowerCase();
	if (lastKeyPress !== undefined && lastKeyPress === keyPress) return;
	
	const currentProject = projects.filter((project) => project.selected)[0];
	const selectedPhotos = currentProject.photos.filter((photo) => photo.selected);
	if (selectedPhotos.length === 0) return;
	const currentPhoto = selectedPhotos[0];

	switch (keyPress) {
		case "1":
		case "2":
		case "3":
		case "4":
		case "5":
			photo.setRating(currentPhoto, parseInt(keyPress));
			break;
		case "6":
		case "7":
		case "8":
		case "9":
		case "0":
			photo.addTag(currentPhoto, translateKeyToTag(keyPress));
			break;
		case "^":
		case "&":
		case "*":
		case "(":
		case ")":
			photo.removeTag(currentPhoto, translateKeyToTag(keyPress));
		default: 
			break;
	}

	lastKeyPress = keyPress;
}

function translateKeyToTag(keyPress) {
	switch(keyPress) {
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
}
