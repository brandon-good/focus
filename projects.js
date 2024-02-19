const path = require('node:path');
const fs = require('fs');
const projects_json_filename = "projects.json";

class Project {
	constructor(name, dest_dir, install_dir, archived) {
		this.name = name;
		this.dest_dir = dest_dir;
		this.archived = archived;
		this.filepath = path.join(install_dir, name);
		create_project_dir();
	}

	static from(json) {
		return Object.assign(new Project(), json);
	}

	save(install_dir) {
		// save to this.save_dir
		let stored_project_file_path = path.join(this.filepath, this.name + ".json");	
		fs.writeFile(stored_project_file_path, JSON.stringify(this), err => {
			if (err) console.log("ERROR SAVING USER PROJECT " + this.name);	
		});
	}

	create_project_dir() {
		// check if this exists first inside install_dir, if not create it
	}

	archive() {
		// delete all temp files in directory
		this.archived = true;
	}
}

class UserProjects {
	constructor() {
		this.project_names = []; // list of project objects
	}

	static from(json) {
		return Object.assign(new UserProjects(), json);
	}

	getProject(name) {
		for (const proj_name of this.project_list) {
			if (proj_name == name) {
				// TODO
				// check if project dir exists
				// return json object from reading the file
			}
		}
		return null;
	}

	add(proj) {
		this.project_list.push(proj.name);
	}

	save(install_dir) {
		// save to install_dir	
		let stored_projects_file_path = path.join(install_dir, projects_json_filename);	
		fs.writeFile(stored_projects_file_path, JSON.stringify(this), err => {
			if (err) console.log("ERROR SAVING USER PROJECT LIST");	
		});
	}
}

async function loadUserProjects(install_dir) {
	// returns a user projects object
	let stored_projects_file_path = path.join(install_dir, projects_json_filename);	
	fs.readFile(stored_projects_file_path, (err, content) => {
		if (err) {
			console.log('cannot read file');
			return new UserProjects();
		} else {
			return UserProjects.from(content);
		}
	})
}

module.exports = {
	loadUserProjects: loadUserProjects,
	UserProjects: UserProjects,
	Project: Project
}
