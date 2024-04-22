import { useEffect, useState } from "react";
import "./Home.css";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

export default function Home() {
	const [projects, setProjects] = useState([]);

	const [uninstallDialog, setUninstallDialog] = useState(false);

	useEffect(() => {
		window.ipcRenderer
			.invoke("get-projects")
			.then((newProjects) => setProjects(newProjects));
	}, []);

	return (
		<div id="home-container">
			<div>
				<h1>Focus</h1>
				<h2>Photo culling made simple.</h2>
			</div>
			{projects.map((project) => (
				<Button
					key={project.name}
					onClick={() => window.ipcRenderer.send("open-project", project.name)}
					startIcon={!project.archived ? <OpenInNewIcon /> : <UnarchiveIcon />}
					variant="outlined"
				>
					{project.name}
				</Button>
			))}
			<Button
				onClick={() =>
					(window.location.href = "http://localhost:3000/new-project")
				}
				variant="contained"
			>
				New project
			</Button>
			<Button onClick={() => setUninstallDialog(true)} variant="outlined">
				Uninstall
			</Button>
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
