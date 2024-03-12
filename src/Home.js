import { useEffect, useState } from "react";
import "./Home.css";
import { Button } from "@mui/material";

export default function Home() {
	const [projectNames, setProjectNames] = useState([]);

	useEffect(() => {
		window.ipcRenderer
			.invoke("get-project-names")
			.then((newProjectNames) => setProjectNames(newProjectNames));
	}, []);

	return (
		<div id="home-container">
			<div>
				<h1>Focus</h1>
				<h2>Photo culling made simple.</h2>
			</div>
			{projectNames.map((name) => (
				<Button
					key={name}
					onClick={() => window.ipcRenderer.invoke("open-project", name)}
					variant="outlined"
				>
					{name}
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
