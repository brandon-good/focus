class Project {
	constructor(name, dest_dir, install_dir, archived) {
		this.name = name;
		this.dest_dir = dest_dir;
		this.archived = archived;
		// create this.save_dir for where we can save info to
	}

	static from(json) {
		return Object.assign(new Project(), json);
	}

	save() {
		// save to this.save_dir
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
	constructor(install_dir) {
		this.project_names = []; // list of project objects
	}

	static from(json) {
		return Object.assign(new UserProjects(), json);
	}

	getProject(name) {
		for (const proj_name of this.project_list) {
			if (proj_name == name) {
				// check if project dir exists
				// return json object from reading the file
			}
		}
		return null;
	}

	add(proj) {
		this.project_list.push(proj.name);
	}

	save() {
		// save to install_dir	
	}
}
