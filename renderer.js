const btn = document.getElementById("files")
const dialogConfig = {
    title: 'Choose Directory',
    buttonLabel: 'Choose Directory',
    properties: ['openDirectory']
};

function chooseDirectoryDialog() {
    console.log('button clicked')
    electron.openDialog('showOpenDialog', dialogConfig).then(result => {
        console.log(result.canceled);
        console.log(result.filePaths)
    })
}
btn.addEventListener('click', chooseDirectoryDialog)
