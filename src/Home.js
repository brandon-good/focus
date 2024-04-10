import { useEffect, useState } from "react";
import "./Home.css";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import { Button } from "@mui/material";

export default function Home() {
	const [projects, setProjects] = useState([]);

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
		</div>
	);
}
