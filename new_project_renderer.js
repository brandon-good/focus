
const srcBtn = document.getElementById("#src_dir_btn")
const destBtn = document.getElementById("#dest_dir_btn")
const srcDisplay = document.getElementById("#src_dir_display");
const destDisplay = document.getElementById("#dest_dir_display");
const nameField = document.getElementById("#project_name");
const createBtn = document.getElementById("#new_project_create_btn")
const cancelBtn = document.getElementById("#new_project_cancel_btn")

let srcDir;
let destDir;

const dialogConfig = {
	title: 'Choose Directory',
	buttonLabel: 'Choose Directory',
	properties: ['openDirectory']
};
function select_src(event) {
	electron.dialog('showOpenDialog', { title: 'Choose Source Directory', buttonLabel: "Choose Directory", properties: ['openDirectory', 'createDirectory'] }).then(importDir => {
		if (!importDir.canceled) {
			srcDir = importDir.filePaths[0];
			srcDisplay.innerText = srcDir;
		}
	});
}

function select_dest(event) {
	electron.dialog('showOpenDialog', dialogConfig).then(import_dir => {
		if (!import_dir.canceled) {
			destDir = import_dir.filePaths[0];
			destDisplay.innerText = destDir;
		}
	});
}

function create_project(event) {
	let name = nameField.value;
	ipcRenderer.send('create_new_project', { name, srcDir, destDir, })
}

function cancel_project(event) {
	ipcRenderer.send('cancel_new_project', {});
}

srcBtn.addEventListener('click', select_src);
destBtn.addEventListener('click', select_dest);
createBtn.addEventListener('click', create_project);
cancelBtn.addEventListener('click', cancel_project);
