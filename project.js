
const js2xmlparser = require('js2xmlparser');
const path = require('node:path')
const fs = require('fs');

const projects_json_filename = "projects.json";
const PREVIEW_FOLDER_NAME = 'previews';

const Project = {
    name: "NO_NAME",
    src_dir: "NO_SRC",
    dest_dir: "NO_DEST",
    filepath: "NO_SAVE_LOC",
    archived: false,
}

const UserProjects = {
    project_list: [],
}

function new_project(name, src_dir, dest_dir, install_dir) {
    let newProj = Object.create(Project);
    newProj.name = name;
    newProj.src_dir = src_dir;
    newProj.dest_dir = dest_dir;
    newProj.filepath = path.join(install_dir, name);
    create_project_dir(newProj);
    //addProject(UserProjects, newProj); // should we do this here?
    return newProj;
}

function project_from_json(json) {
    let newProj = JSON.parse(json);
    if (!newProj.archived)
        create_project_dir(newProj);

    return newProj;
}

function archive(project) {
    // delete all temp files in directory
    project.archived = true;
}

function create_project_dir(project) {
    // check if this exists first inside install_dir, if not create it
    let thumb_loc = path.join(project.filepath, PREVIEW_FOLDER_NAME);
    if (! fs.existsSync(project.filepath)) fs.mkdirSync(project.filepath);
    if (! fs.existsSync(thumb_loc)) fs.mkdirSync(thumb_loc);

    saveProject(project);

    // TODO save the jpg images

}

function generate_thumbnails(project, files) {
    // files is passed as an argument because we might load the files from elsewhere
    // it is possible that we have to recreate the thumbnails based on the destination copied files
    // DO NOT OVERWRITE EXISTING FILES

}

function generateXMLs(project, infoForXML, files) {
    // files is passed as an argument because we might load the files from elsewhere
    // it is possible that we have to recreate the thumbnails based on the destination copied files
    // DO NOT OVERWRITE EXISTING FILES
    files.forEach(file => {
        let xml_file = path.basename(file, path.extname(file)) + ".xml";
        const filePath = path.join(project.dest_dir, xml_file);
        // skip if the file exists already
        if (fs.existsSync(filePath)) {
            console.log(filePath + 'already exists. Skipping.');
            return;
        }
        // otherwise generate xml and save
        infoForXML.filename = file;
        const xml = js2xmlparser.parse('root', infoForXML);
        fs.writeFile(filePath, xml, err => {
            if (err) console.log("ERROR SAVING PROJECT XMLS " + project.name);
        });
    });
}

function saveProject(project) {
    // save to this.save_dir
    console.log('filepath:'+project.filepath);
    console.log('name:'+project.name);
    let stored_project_file_path = path.join(project.filepath, project.name + ".json");
    console.log(JSON.stringify(project));
    fs.writeFile(stored_project_file_path, JSON.stringify(project), err => {
        if (err) console.log("ERROR SAVING USER PROJECT " + project.name);
    });
}

function newUserProjects() {
    let all_user_projects = Object.create(UserProjects);
    // all_user_projects.project_list = []; ?? katie removed, do we need?
    return all_user_projects;
}

function userProjectsFromJson(json) {
    return JSON.parse(json);
}

function addProject(all_user_projects, project) {
    all_user_projects.project_list.push(project);
}

function getProject(all_user_projects, project_name) {
    let project_found = null;
    all_user_projects.project_list.forEach((proj) => {
        if (proj.name === project_name) project_found = proj;
    });
    return project_found;
}

function saveUserProjects(all_user_projects, install_dir) {
    // save to install_dir
    let stored_projects_file_path = path.join(install_dir, projects_json_filename);
    fs.writeFile(stored_projects_file_path, JSON.stringify(all_user_projects), err => {
        if (err) console.log("ERROR SAVING USER PROJECT LIST");
    });
}

function loadUserProjects(install_dir) {
    // returns a user projects object
    let all_user_projects;
    let stored_projects_file_path = path.join(install_dir, projects_json_filename);
    fs.readFile(stored_projects_file_path, (err, content) => {
        if (err) {
            all_user_projects = newUserProjects();
        } else {
            all_user_projects = userProjectsFromJson(content);
        }
    })
    return all_user_projects;
}

function verifyNewProject(name, src_dir, dest_dir) {
    // return true is this is valid, false if not valid

    // check unique name
    let duplicate = false;
    UserProjects.project_list.forEach(proj => {if (name === proj.name) duplicate = true});

    // check src and dest directories
    return !duplicate && fs.existsSync(src_dir) && fs.existsSync(dest_dir)
}

module.exports = {
    new_project,
    generate_thumbnails,
    generateXMLs,
    saveProject,
    addProject,
    getProject,
    saveUserProjects,
    loadUserProjects,
    verifyNewProject,

    // the below are unused in main as of right now, might be able to delete?
    UserProjects,
    projects_json_filename,
    Project,
    newUserProjects,
    project_from_json,
    archive,
    create_project_dir,
    userProjectsFromJson,
};