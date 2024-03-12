import { useEffect, useState } from "react";
import "./Projects.css";
import HomeIcon from "@mui/icons-material/Home";
import Rating from "@mui/material/Rating";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";

export default function Projects() {
	const [openProjects, setOpenProjects] = useState([]);
	const [projectIndex, setProjectIndex] = useState(0);
	const [previewPaths, setPreviewPaths] = useState([]);
	const [previewIndex, setPreviewIndex] = useState(0);

	useEffect(() => {
		window.ipcRenderer.invoke("get-open-projects").then((newOpenProjects) => {
			setOpenProjects(newOpenProjects);
			setProjectIndex(newOpenProjects.length - 1);
		});
	}, []);

	useEffect(() => {
		if (openProjects.length > 0) {
			setTimeout(() => {
				window.ipcRenderer
					.invoke("get-preview-paths", openProjects[projectIndex])
					.then((newPreviewPaths) => setPreviewPaths(newPreviewPaths));
			}, 3000);
		}
	}, [openProjects, projectIndex]);

	return (
		<div id="projects-container">
			<header>
				<div>
					<HomeIcon
						fontSize="small"
						onClick={() =>
							(window.location.href = "http://localhost:3000/home")
						}
						sx={{ cursor: "pointer" }}
					/>
					<Tabs
						value={projectIndex}
						onChange={(newProjectIndex) => setProjectIndex(newProjectIndex)}
					>
						{openProjects.map((project) => (
							<Tab label={project.name} key={project.name} />
						))}
					</Tabs>
				</div>
			</header>
			{previewPaths.length > 0 && (
				<div id="project-container">
					<div id="preview-sidebar">
						{previewPaths.map((previewPath, i) => (
							<div className="preview">
								<img
									onClick={() => setPreviewIndex(i)}
									src={previewPath}
									style={{ cursor: "pointer" }}
								/>
								<Rating />
							</div>
						))}
					</div>
					<div id="preview-selected">
						<img src={previewPaths[previewIndex]} />
					</div>
				</div>
			)}
		</div>
	);
}
