import { useState } from "react";
import "./NewProject.css";
import HomeIcon from "@mui/icons-material/Home";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";

export default function CreateProject() {
	const [name, setName] = useState("");
	const [srcDir, setSrcDir] = useState("");
	const [destDir, setDestDir] = useState("");
	const [errors, setErrors] = useState({
		nameError: false,
		srcDirError: false,
		destDirError: false,
	});

	return (
		<div id="new-project-container">
			<HomeIcon
				fontSize="small"
				onClick={() => (window.location.href = "http://localhost:3000/home")}
				sx={{ color: "white", cursor: "pointer" }}
			/>
			<h1>New project</h1>
			<TextField
				error={errors.name}
				helperText={errors.name ? errors.nameText : ""}
				label="Name"
				onChange={(e) => setName(e.target.value)}
				value={name}
			/>
			<TextField
				error={errors.srcDir}
				helperText={errors.srcDir ? "Directory does not exist" : ""}
				label="Source directory"
				onClick={() =>
					window.ipcRenderer
						.invoke("open-dialog", {
							configInstall: false,
							buttonLabel: "Source Here",
							title: "Choose Source Directory",
						})
						.then((newSrcDir) => {
							if (newSrcDir) setSrcDir(newSrcDir);
						})
				}
				value={srcDir}
			/>
			<TextField
				error={errors.destDir}
				helperText={errors.destDir ? "Directory does not exist" : ""}
				label="Destination directory"
				onClick={() =>
					window.ipcRenderer
						.invoke("open-dialog", {
							configInstall: false,
							buttonLabel: "Destination Here",
							title: "Choose Destination Directory",
						})
						.then((newDestDir) => {
							if (newDestDir) setDestDir(newDestDir);
						})
				}
				value={destDir}
			/>
			<Button
				onClick={() =>
					window.ipcRenderer
						.invoke("create-project", {
							name: name,
							srcDir: srcDir,
							destDir: destDir,
						})
						.then((newErrors) => setErrors(newErrors))
				}
				variant="contained"
			>
				Create project
			</Button>
		</div>
	);
}
