import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import CreateIcon from "@mui/icons-material/Create";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

export default function NewProjectMenu({ projects, setProjects }) {
	const [anchorEl, setAnchorEl] = useState(null);
	const open = Boolean(anchorEl);

	return (
		<div>
			<IconButton
				onClick={(e) => setAnchorEl(e.currentTarget)}
				size="small"
				sx={{ color: "white", cursor: "pointer" }}
			>
				<AddIcon fontSize="small" />
			</IconButton>
			<Menu anchorEl={anchorEl} onClose={() => setAnchorEl(null)} open={open}>
				{projects
					.filter((project) => !project.open && !project.archived)
					.map((project) => (
						<MenuItem
							onClick={() => {
								setAnchorEl(null);
								window.ipcRenderer.send("open-project", project.name);
							}}
						>
							<ListItemIcon>
								<OpenInNewIcon />
							</ListItemIcon>
							<ListItemText>{project.name}</ListItemText>
						</MenuItem>
					))}
				<Divider />
				{projects
					.filter((project) => !project.open && project.archived)
					.map((project) => (
						<MenuItem
							onClick={() => {
								setAnchorEl(null);
								window.ipcRenderer.send("open-project", project.name);
							}}
						>
							<ListItemIcon>
								<UnarchiveIcon />
							</ListItemIcon>
							<ListItemText>{project.name}</ListItemText>
						</MenuItem>
					))}
				<Divider />
				<MenuItem
					onClick={() =>
						(window.location.href = "http://localhost:3000/new-project")
					}
				>
					<ListItemIcon>
						<CreateIcon />
					</ListItemIcon>
					<ListItemText>New project</ListItemText>
				</MenuItem>
			</Menu>
		</div>
	);
}
