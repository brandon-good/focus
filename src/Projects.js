import { useEffect, useState } from "react";
import Preview from "./Preview";
import ProjectSettings from "./ProjectSettings";
import "./Projects.css";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import HomeIcon from "@mui/icons-material/Home";
import NewProjectMenu from "./NewProjectMenu";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";

export default function Projects() {
	const [projects, setProjects] = useState([]);
	const [tabIndex, setTabIndex] = useState(-1);
	const [projectIndex, setProjectIndex] = useState(-1);
	const [previewIndex, setPreviewIndex] = useState(0);
	const [expanded, setExpanded] = useState(false);
	const [loaded, setLoaded] = useState(false);

	if (
		loaded &&
		(projects.length === 0 || projects.every((project) => !project.selected))
	) {
		window.location.href = "http://localhost:3000/home";
	}

	useEffect(() => {
		window.ipcRenderer
			.invoke("get-projects")
			.then((newProjects) => setProjects([...newProjects]));
		window.ipcRenderer.on("update-projects", (newProjects) => {
			setProjects([...newProjects]);
			setLoaded(true);
		});
	}, []);

	useEffect(() => {
		if (projects.length === 0) {
			return;
		}
		const selectedProject = projects.find((project) => project.selected);
		setTabIndex(
			projects.filter((project) => project.open).indexOf(selectedProject)
		);
		setProjectIndex(projects.indexOf(selectedProject));
		setPreviewIndex(
			selectedProject
				? selectedProject.photos.indexOf(
						projects
							.find((project) => project.selected)
							.photos.find((photo) => photo.selected)
				  )
				: -1
		);
	}, [projects]);

	return (
		projectIndex >= 0 &&
		projects[projectIndex] &&
		projects[projectIndex].selected && (
			<div id="projects-container">
				<header>
					<div>
						<IconButton
							onClick={() =>
								(window.location.href = "http://localhost:3000/home")
							}
							size="small"
							sx={{ color: "white", cursor: "pointer" }}
						>
							<HomeIcon fontSize="small" />
						</IconButton>
						<Tabs
							value={tabIndex}
							onChange={(e, newTabIndex) =>
								window.ipcRenderer
									.invoke(
										"select-project",
										projects.filter((project) => project.open)[newTabIndex].name
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
						<IconButton
							onClick={() =>
								window.ipcRenderer
									.invoke("close-selected-project")
									.then((newProjects) => setProjects([...newProjects]))
							}
							size="small"
							sx={{ color: "white", cursor: "pointer" }}
						>
							<CloseIcon fontSize="small" />
						</IconButton>
						<NewProjectMenu projects={projects} setProjects={setProjects} />
					</div>
					<div>
						<Button variant="contained" endIcon={<OpenInNewIcon />}>
							Export
						</Button>
						<ProjectSettings projects={projects} setProjects={setProjects} />
					</div>
				</header>
				<div id="project-container">
					<div
						id="preview-sidebar"
						style={{ width: expanded ? "300%" : "15rem" }}
					>
						{projects[projectIndex].photos.map((photo) =>
							!photo.loading ? (
								<Preview
									expanded={expanded}
									key={photo.name}
									photo={photo}
									setProjects={setProjects}
								/>
							) : (
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
							)
						)}
					</div>
					<div id="preview-selected">
						<IconButton onClick={() => setExpanded(!expanded)} size="large">
							<ChevronRightIcon
								fontSize="large"
								sx={{
									transition: "1s",
									transform: `rotate(${expanded ? "180" : "0"}deg)`,
								}}
							/>
						</IconButton>
						{!projects[projectIndex].photos[previewIndex].loading && (
							<img
								alt=""
								src={projects[projectIndex].photos[previewIndex].previewPathURL}
							/>
						)}
					</div>
				</div>
			</div>
		)
	);
}
