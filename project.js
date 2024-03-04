
const { exec } = require('child_process');

const path = require('node:path')
const fs = require('fs');

const JSON_PROJECTS_FILENAME = "projects.json";
const PREVIEW_FOLDER_NAME = 'previews';

const Project = {
    name: "NO_NAME",
    srcDir: "NO_SRC",
    destDir: "NO_DEST",
    filepath: "NO_SAVE_LOC",
    archived: false,
}

const UserProjects = {
    projectList: [],
}

function newProject(name, srcDir, destDir, installDir) {
    let newProj = Object.create(Project);
    newProj.name = name;
    newProj.srcDir = srcDir;
    newProj.destDir = destDir;
    newProj.filepath = path.join(installDir, name);
    createProjectDir(newProj);
    addProject(newProj);
    return newProj;
}

function projectFromJson(json) {
    let newProj = JSON.parse(json);
    if (!newProj.archived)
        createProjectDir(newProj);

    return newProj;
}

function archive(project) {
    // delete all temp files in directory
    project.archived = true;
}

function createProjectDir(project) {
    // check if this exists first inside install_dir, if not create it
    let thumbLoc = path.join(project.filepath, PREVIEW_FOLDER_NAME);
    if (! fs.existsSync(project.filepath)) fs.mkdirSync(project.filepath);
    if (! fs.existsSync(thumbLoc)) fs.mkdirSync(thumbLoc);

    saveProject(project);

    // TODO save the jpg images

}

function generateThumbnails(project, files) {
    // files is passed as an argument because we might load the files from elsewhere
    // it is possible that we have to recreate the thumbnails based on the destination copied files
    // DO NOT OVERWRITE EXISTING FILES

}

function generateXMPs(project, XMPInfo, files) {
    // files is passed as an argument because we might load the files from elsewhere
    // it is possible that we have to recreate the thumbnails based on the destination copied files
    // DO NOT OVERWRITE EXISTING FILES
    files.forEach(file => {
        let xmpFile = path.basename(file, path.extname(file)) + ".XMP";
        const filePath = path.join(project.destDir, xmpFile);
        // skip if the file exists already
        if (fs.existsSync(filePath)) {
            console.log(filePath + 'already exists. Skipping.');
            return;
        }

        let command = `./exiftool/exiftool -o ${filePath}`;
        for (const [key, value] of Object.entries(XMPInfo)) {
            command += ` -XMP:${key}="${value}"`;
        }
        command += ` -tagsFromFile @ -all:all "${path.join(project.destDir, file)}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error creating/updating XMP file: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                return;
            }
            console.log(`XMP file created/updated successfully: ${xmpFile}`);
            console.log(stdout);
        });
    });
}

function saveProject(project) {
    // save to this.save_dir
    console.log('filepath:' + project.filepath);
    console.log('name:' + project.name);
    let stored_project_file_path = path.join(project.filepath, project.name + ".json");
    console.log(JSON.stringify(project));
    fs.writeFile(stored_project_file_path, JSON.stringify(project), err => {
        if (err) console.log("ERROR SAVING USER PROJECT " + project.name);
    });
}

function newUserProjects() { // TODO double check this works
    return Object.create(UserProjects);
}

function userProjectsFromJson(json) {
    return JSON.parse(json);
}

function addProject(project) { // remove all_user_projects
    UserProjects.projectList.push(project);
}

function getProject(all_user_projects, project_name) {
    let projectFound = null;
    all_user_projects.projectList.forEach((proj) => {
        if (proj.name === project_name) projectFound = proj;
    });
    return projectFound;
}

function saveUserProjects(all_user_projects, install_dir) {
    // save to install_dir
    let storedProjectsFilePath = path.join(install_dir, JSON_PROJECTS_FILENAME);
    fs.writeFile(storedProjectsFilePath, JSON.stringify(all_user_projects), err => {
        if (err) console.log("ERROR SAVING USER PROJECT LIST");
    });
}

function loadUserProjects(install_dir) {
    // returns a user projects object
    let all_user_projects;
    let stored_projects_file_path = path.join(install_dir, JSON_PROJECTS_FILENAME);
    fs.readFile(stored_projects_file_path, (err, content) => {
        if (err) {
            all_user_projects = newUserProjects();
        } else {
            all_user_projects = userProjectsFromJson(content);
        }
    })
    return all_user_projects;
}

function verifyNewProject(name, srcDir, destDir) {
    // return true is this is valid, false if not valid

    // check unique name
    let duplicate = false;
    UserProjects.projectList.forEach(proj => {if (name === proj.name) duplicate = true});

    // check src and dest directories
    return !duplicate && fs.existsSync(srcDir) && fs.existsSync(destDir)
}

module.exports = {
    new_project: newProject,
    generateThumbnails,
    generateXMPs,
    saveProject,
    addProject,
    getProject,
    saveUserProjects,
    loadUserProjects,
    verifyNewProject,

    // the below are unused in main as of right now, might be able to delete?
    UserProjects,
    JSON_PROJECTS_FILENAME,
    Project,
    newUserProjects,
    projectFromJson,
    archive,
    createProjectDir,
    userProjectsFromJson,
};