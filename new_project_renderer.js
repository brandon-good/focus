
const src_btn = document.getElementById("#src_dir_btn")
const dest_btn = document.getElementById("#dest_dir_btn")
const src_display = document.getElementById("#src_dir_display");
const dest_display = document.getElementById("#dest_dir_display");
const name_field = document.getElementById("#project_name");
const create_btn = document.getElementById("#new_project_create_btn")
const cancel_btn = document.getElementById("#new_project_cancel_btn")

let srcDir;
let destDir;

const dialogConfig = {
	title: 'Choose Directory',
	buttonLabel: 'Choose Directory',
	properties: ['openDirectory']
};
function select_src(event) {
	electron.dialog('showOpenDialog', dialogConfig).then(import_dir => {
		if (!import_dir.canceled) {
			srcDir = import_dir.filePaths[0];
			src_display.innerText = srcDir;
		}
	});
}

function select_dest(event) {
	electron.dialog('showOpenDialog', {
		title: 'Choose Directory',
		buttonLabel: 'Choose Directory',
		properties: ['openDirectory', 'createDirectory']
	}).then(import_dir => {
		if (!import_dir.canceled) {
			destDir = import_dir.filePaths[0];
			dest_display.innerText = destDir;
		}
	});
}

function create_project(event) {
	let name = name_field.value;
	ipcRenderer.send('create_new_project', { name, srcDir, destDir, })
}

function cancel_project(event) {
	ipcRenderer.send('cancel_new_project', {});
}

src_btn.addEventListener('click', select_src);
dest_btn.addEventListener('click', select_dest);
create_btn.addEventListener('click', create_project);
cancel_btn.addEventListener('click', cancel_project);
