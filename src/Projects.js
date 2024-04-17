import { useEffect, useState } from "react";
import Preview from "./Preview";
import ProjectSettings from "./ProjectSettings";
import "./Projects.css";
import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Chip from "@mui/material/Chip";
import CloseIcon from "@mui/icons-material/Close";
import HomeIcon from "@mui/icons-material/Home";
import NewProjectMenu from "./NewProjectMenu";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Slider from "@mui/material/Slider";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";

export default function Projects() {
	const [projects, setProjects] = useState([]);
	const [tabIndex, setTabIndex] = useState(-1);
	const [projectIndex, setProjectIndex] = useState(-1);
	const [previewIndex, setPreviewIndex] = useState(0);
	const [expanded, setExpanded] = useState(false);
	const [loaded, setLoaded] = useState(false);

	const [ratings, setRatings] = useState([0, 5]);
	const [tag, setTag] = useState("");
	const [tags, setTags] = useState([]);

	useEffect(() => {
		window.ipcRenderer
			.invoke("filter-photos", ratings[0], ratings[1], tags)
			.then((newProjects) => setProjects([...newProjects]));
	}, [ratings, tags]);

	if (
		loaded &&
		(projects.length === 0 || projects.every((project) => !project.selected))
	) {
		window.location.href = "http://localhost:3000/home";
	}

	useEffect(() => {
		window.ipcRenderer.invoke("get-projects").then((newProjects) => {
			setLoaded(true);
			setProjects([...newProjects]);
		});
		window.ipcRenderer.on("update-projects", (newProjects) =>
			setProjects([...newProjects])
		);
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
						id="preview-sidebar-container"
						style={{ width: expanded ? "300%" : "15rem" }}
					>
						<div id="filter-container">
							<span>Filter</span>
							<Divider />
							<div>
								<span>{`${
									ratings[0] === ratings[1]
										? ratings[0]
										: `${ratings[0]}-${ratings[1]}`
								} stars`}</span>
								<Slider
									max={5}
									min={0}
									onChange={(e) => setRatings(e.target.value)}
									value={ratings}
								/>
							</div>
							<Divider />
							<div>
								{tags.length > 0 && (
									<div className="tags-container">
										{tags.map((photoTag) => (
											<Chip
												label={photoTag}
												onDelete={() =>
													setTags(tags.filter((curTag) => curTag !== photoTag))
												}
											/>
										))}
									</div>
								)}
								<div className="add-tag-container">
									<TextField
										inputProps={{ style: { fontSize: "0.9rem" } }}
										onChange={(e) => setTag(e.target.value)}
										placeholder="Add tag"
										value={tag}
										variant="standard"
									/>
									<IconButton
										onClick={() => {
											setTags([...tags, tag]);
											setTag("");
										}}
										size="small"
									>
										<AddIcon fontSize="small" />
									</IconButton>
								</div>
							</div>
						</div>
						<div id="preview-sidebar">
							{projects[projectIndex].photos.map((photo) =>
								!photo.loading ? (
									photo.inFilter && (
										<Preview
											expanded={expanded}
											key={photo.name}
											photo={photo}
											setProjects={setProjects}
										/>
									)
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
