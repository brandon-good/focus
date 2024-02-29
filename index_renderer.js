const btn_create = document.getElementById("#create_proj_btn");
const btn_uninstall = document.getElementById("#uninstall_app_btn");
const dialogConfig = {
    title: 'Choose Directory',
    buttonLabel: 'Choose Directory',
    properties: ['openDirectory']
};

const project_list = document.getElementById("#projectList");
populateProjects();

function populateProjects() {
	electron.get_project_names('get_project_names', {}).then( (proj_names) => {
		proj_names.forEach((name) => {
			let entry = document.createElement('li');
			let btn = document.createElement('button');
			btn.textContent = name;
			btn.addEventListener('click', () => {
				ipcRenderer.send('project_selected', {name})
			});

			entry.appendChild(btn);
			project_list.appendChild(entry);
		});
	});
}

function onNewProjectClicked(event) {
	ipcRenderer.send('start_create_project', {});
}

function onUninstallClicked(event) {
	ipcRenderer.send('uninstall_app', {});
}

function isARW(file) {
    const acceptedExtension = '.ARW';
    return file && acceptedExtension.includes(file['type'])
}

btn_create.addEventListener('click', onNewProjectClicked)
btn_uninstall.addEventListener('click', onUninstallClicked)
