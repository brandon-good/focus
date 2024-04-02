import { useEffect, useState } from "react";
import Preview from "./Preview";
import "./Projects.css";
import CloseIcon from "@mui/icons-material/Close";
import HomeIcon from "@mui/icons-material/Home";
import NewProjectMenu from "./NewProjectMenu";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Skeleton from "@mui/material/Skeleton";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";

export default function Projects() {
	const [projects, setProjects] = useState([]);
	const [projectIndex, setProjectIndex] = useState(-1);
	const [previewIndex, setPreviewIndex] = useState(0);

	useEffect(() => {
		window.ipcRenderer
			.invoke("get-projects")
			.then((newProjects) => setProjects([...newProjects]));
		window.ipcRenderer.on("update-projects", (newProjects) =>
			setProjects([...newProjects])
		);
	}, []);

	useEffect(() => {
		if (projects.length === 0) {
			return;
		}
		setProjectIndex(
			projects
				.filter((project) => project.open)
				.indexOf(projects.find((project) => project.selected))
		);
		setPreviewIndex(
			projects
				.find((project) => project.selected)
				.photos.indexOf(
					projects
						.find((project) => project.selected)
						.photos.find((photo) => photo.selected)
				)
		);
	}, [projects]);

	return (
		projectIndex >= 0 && (
			<div id="projects-container">
				<header>
					<div>
						<HomeIcon
							fontSize="small"
							onClick={() =>
								(window.location.href = "http://localhost:3000/home")
							}
							sx={{ color: "white", cursor: "pointer" }}
						/>
						<Tabs
							value={projectIndex}
							onChange={(e, newProjectIndex) =>
								window.ipcRenderer
									.invoke(
										"select-project",
										projects.filter((project) => project.open)[newProjectIndex]
											.name
									)
									.then((newProjects) => setProjects([...newProjects]))
							}
						>
							{projects
								.filter((project) => project.open)
								.map((project) => (
									<Tab label={project.name} key={project.name} />
								))}
						</Tabs>
						<CloseIcon
							fontSize="small"
							onClick={() =>
								window.ipcRenderer
									.invoke("close-selected-project")
									.then((newProjects) => setProjects([...newProjects]))
							}
							sx={{ color: "white", cursor: "pointer" }}
						/>
						<NewProjectMenu projects={projects} setProjects={setProjects} />
					</div>
					<Button variant="contained" endIcon={<OpenInNewIcon />}>
						Export to Lightroom
					</Button>
				</header>
				{projects[projectIndex].loading ? (
					<div id="project-container">
						<div id="preview-sidebar">
							{projects[projectIndex].photos.map((photo) => (
								<div className="preview" key={photo.name}>
									<Skeleton sx={{ height: "1rem" }} variant="rounded" />
									<Skeleton sx={{ height: "7rem" }} variant="rounded" />
									<div className="skeleton-rating-container">
										<Skeleton
											sx={{ height: "1rem", width: "1rem" }}
											variant="circular"
										/>
										<Skeleton
											sx={{ height: "1rem", width: "1rem" }}
											variant="circular"
										/>
										<Skeleton
											sx={{ height: "1rem", width: "1rem" }}
											variant="circular"
										/>
										<Skeleton
											sx={{ height: "1rem", width: "1rem" }}
											variant="circular"
										/>
										<Skeleton
											sx={{ height: "1rem", width: "1rem" }}
											variant="circular"
										/>
									</div>
								</div>
							))}
						</div>
						<div id="preview-selected">
							<div>
								<span>Transferring your files...</span>
								<LinearProgress />
							</div>
						</div>
					</div>
				) : (
					<div id="project-container">
						<div id="preview-sidebar">
							{projects[projectIndex].photos.map((photo) => (
								<Preview photo={photo} setProjects={setProjects} />
							))}
						</div>
						<div id="preview-selected">
							<img
								alt=""
								src={projects[projectIndex].photos[previewIndex].previewPath}
							/>
						</div>
					</div>
				)}
			</div>
		)
	);
}
