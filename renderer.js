const btn_frm = document.getElementById("#import_from_dir") // directory to import RAWs from (like the SD card)
const btn_to = document.getElementById('#import_to_dir') // dir to import RAWS to
const dialogConfig = {
    title: 'Choose Directory',
    buttonLabel: 'Choose Directory',
    properties: ['openDirectory']
};

function importPhotos(event) {
    console.log('choose device to import photos from')
    electron.dialog('showOpenDialog', dialogConfig).then(import_from => {
        console.log('import_from canceled: ' + import_from.canceled);
        console.log('import_from filepaths: ' + import_from.filePaths);
        if (!import_from.canceled) {
            electron.dialog('showOpenDialog', dialogConfig).then(import_to => {
                console.log('import_to canceled: ' + import_to.canceled);
                console.log('import_to filepaths: ' + import_to.filePaths);
                const src_dir = import_from.filePaths[0]
                const dest_dir = import_to.filePaths[0]
                ipcRenderer.send('import_files', {
                    src_dir, dest_dir
                });
            })
        }
    })



}

function isARW(file) {
    const acceptedExtension = '.ARW';
    return file && acceptedExtension.includes(file['type'])
}

btn_frm.addEventListener('click', importPhotos)
