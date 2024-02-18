const dialogConfig = {
    title: 'Choose Installation Directory',
    buttonLabel: 'Choose Installation Directory',
    properties: ['openDirectory']
};
const btn_browse = document.getElementById('#select_installation_browse');
const btn_finish = document.getElementById('#select_installation_finish');
const p_location = document.getElementById('#select_installation_location');
let selected_dir = '';

function selectInstallDir(event) {
    console.log('choose folder to save data to')
    electron.dialog('showOpenDialog', dialogConfig).then(import_from => {
        console.log('selected dir: ' + import_from.filePaths);
        if (!import_from.canceled) {
            const dir = import_from.filePaths[0];
						electron.add_focus_to_filepath(dir).then((value) => p_location.innerText = value);
            //ipcRenderer.send('import_files', {
            //  dir,
            //});
          }
        })
}

function sendSelectedDir(event) {
	let dir = p_location.innerText;
	ipcRenderer.send('install_directory_selected', {
		dir,
	});
}

btn_browse.addEventListener('click', selectInstallDir)
btn_finish.addEventListener('click', sendSelectedDir)
p_location.innerText = await electron.get_default_install_location();
