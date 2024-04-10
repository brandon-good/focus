import { useState } from "react";
import ArchiveIcon from "@mui/icons-material/Archive";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DeleteIcon from "@mui/icons-material/Delete";
import SettingsIcon from "@mui/icons-material/Settings";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

export default function ProjectSettings({ projects, setProjects }) {
	const [anchor, setAnchor] = useState(null);
	const [deleteDialog, setDeleteDialog] = useState(false);
	const [uninstallDialog, setUninstallDialog] = useState(false);

	return (
		<div>
			<IconButton onClick={(e) => setAnchor(e.currentTarget)}>
				<SettingsIcon />
			</IconButton>
			<Menu
				anchorEl={anchor}
				open={Boolean(anchor)}
				onClose={() => setAnchor(null)}
			>
				<MenuItem
					onClick={() =>
						window.ipcRenderer
							.invoke("archive-selected-project")
							.then((newProjects) => setProjects([...newProjects]))
					}
				>
					<ListItemIcon>
						<ArchiveIcon />
					</ListItemIcon>
					<ListItemText>Archive project</ListItemText>
				</MenuItem>
				<MenuItem onClick={() => setDeleteDialog(true)}>
					<ListItemIcon>
						<DeleteIcon />
					</ListItemIcon>
					<ListItemText>Delete project</ListItemText>
				</MenuItem>
				<Divider />
				<MenuItem onClick={() => setUninstallDialog(true)}>
					<ListItemIcon>
						<DeleteForeverIcon />
					</ListItemIcon>
					<ListItemText>Uninstall Focus</ListItemText>
				</MenuItem>
			</Menu>
			<Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
				<DialogTitle>Confirm Deletion</DialogTitle>
				<DialogContent>
					<DialogContentText>{`Are you sure you want to delete "${
						projects.find((project) => project.selected).name
					}"? This action cannot be undone.`}</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
					<Button
						onClick={() => {
							setDeleteDialog(false);
							window.ipcRenderer
								.invoke("delete-selected-project")
								.then((newProjects) => setProjects([...newProjects]));
						}}
					>
						OK
					</Button>
				</DialogActions>
			</Dialog>
			<Dialog open={uninstallDialog} onClose={() => setUninstallDialog(false)}>
				<DialogTitle>Confirm Uninstall</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Are you sure you want to uninstall Focus? This action cannot be
						undone.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setUninstallDialog(false)}>Cancel</Button>
					<Button onClick={() => window.ipcRenderer.send("uninstall")}>
						OK
					</Button>
				</DialogActions>
			</Dialog>
		</div>
	);
}
