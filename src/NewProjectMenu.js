import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

export default function NewProjectMenu({ projects, setProjects }) {
	const [anchorEl, setAnchorEl] = useState(null);
	const open = Boolean(anchorEl);

	return (
		<div>
			<AddIcon
				fontSize="small"
				onClick={(e) => setAnchorEl(e.currentTarget)}
				sx={{ color: "white", cursor: "pointer" }}
			/>
			<Menu anchorEl={anchorEl} onClose={() => setAnchorEl(null)} open={open}>
				{[...projects, { name: "New project" }]
					.filter((project) => !project.open)
					.map((project) => (
						<MenuItem
							key={project.name}
							onClick={() =>
								project.name === "New project"
									? (window.location.href = "http://localhost:3000/new-project")
									: window.ipcRenderer
											.invoke("open-project", project.name)
											.then((newProjects) => setProjects([...newProjects]))
							}
						>
							{project.name}
						</MenuItem>
					))}
			</Menu>
		</div>
	);
}
