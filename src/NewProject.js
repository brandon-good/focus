import { useState } from "react";
import "./NewProject.css";
import HomeIcon from "@mui/icons-material/Home";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";

export default function CreateProject() {
	const [name, setName] = useState("");
	const [transferFiles, setTransferFiles] = useState(true);
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
			<FormControlLabel
				control={
					<Switch
						defaultChecked
						onChange={() => setTransferFiles(!transferFiles)}
						value={transferFiles}
					/>
				}
				label="Transfer files"
			/>
			{transferFiles ? (
				<div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
					<TextField
						error={errors.srcDir}
						helperText={errors.srcDir ? "Directory does not exist" : ""}
						label="Transfer from..."
						onClick={() =>
							window.ipcRenderer
								.invoke(
									"open-dialog",
									false,
									"Source Here",
									"Choose Source Directory"
								)
								.then((newSrcDir) => {
									if (newSrcDir) setSrcDir(newSrcDir);
								})
						}
						value={srcDir}
					/>
					<TextField
						error={errors.destDir}
						helperText={errors.destDir ? "Directory does not exist" : ""}
						label="Transfer to..."
						onClick={() =>
							window.ipcRenderer
								.invoke(
									"open-dialog",
									false,
									"Destination Here",
									"Choose Destination Directory"
								)
								.then((newDestDir) => {
									if (newDestDir) setDestDir(newDestDir);
								})
						}
						value={destDir}
					/>
				</div>
			) : (
				<TextField
					error={errors.destDir}
					helperText={errors.destDir ? "Directory does not exist" : ""}
					label="Import from..."
					onClick={() =>
						window.ipcRenderer
							.invoke("open-dialog", false, "Import Here", "Choose Directory")
							.then((newDestDir) => {
								if (newDestDir) setDestDir(newDestDir);
							})
					}
					value={destDir}
				/>
			)}
			<Button
				onClick={() =>
					window.ipcRenderer
						.invoke(
							"create-project",
							name,
							transferFiles ? srcDir : "",
							destDir
						)
						.then((newErrors) => setErrors(newErrors))
				}
				variant="contained"
			>
				Create project
			</Button>
		</div>
	);
}
