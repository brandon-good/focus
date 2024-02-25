const pageTitle = document.getElementById("#pageTitle");
const destLabel = document.getElementById("#destLabel");
const returnBtn = document.getElementById("#returnProjectListBtn");

electron.get_currently_open_projects('get_currently_open_projects', {}).then( (projects) => setupPage(projects));

function setupPage(projects) {
	let project = projects[0];

	// label everything
	pageTitle.innerText = project.name;
	destLabel.innerText = project.dest_dir;
}

returnBtn.addEventListener('click', () => ipcRenderer.send('return_index', {}))
