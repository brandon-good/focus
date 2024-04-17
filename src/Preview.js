import { useState } from "react";
import "./Preview.css";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Rating from "@mui/material/Rating";
import TextField from "@mui/material/TextField";

export default function Preview({ expanded, photo, setProjects }) {
	const [isHover, setIsHover] = useState(false);
	const [tag, setTag] = useState("");

	return (
		<div
			className="preview"
			onMouseEnter={() => setIsHover(true)}
			onMouseLeave={() => {
				setIsHover(false);
				setTag("");
			}}
			style={{
				border: photo.selected
					? "2px solid #89B3F7"
					: isHover
					? "1px solid rgba(137, 179, 247, 0.5)"
					: "none",
				width: expanded ? "15rem" : "100%",
			}}
		>
			<span>{photo.name}</span>
			<div className="preview-img-container">
				<img
					alt={photo.name}
					onClick={() =>
						window.ipcRenderer
							.invoke("select-photo", photo.name)
							.then((newProjects) => setProjects([...newProjects]))
					}
					src={photo.previewPathURL}
					style={{ cursor: "pointer" }}
				/>
				{(isHover || photo.selected) && (
					<DeleteIcon
						onClick={() =>
							window.ipcRenderer
								.invoke("delete-photo", photo.name)
								.then((newProjects) => setProjects([...newProjects]))
						}
						sx={{ color: "white", cursor: "pointer" }}
					/>
				)}
			</div>
			<Rating
				value={photo.rating}
				onChange={(e, rating) =>
					window.ipcRenderer
						.invoke("set-rating", photo.name, rating)
						.then((newProjects) => setProjects([...newProjects]))
				}
			/>
			{photo.tags.length > 0 && (
				<div className="tags-container">
					{photo.tags.map((photoTag) => (
						<Chip
							label={photoTag}
							onDelete={() =>
								window.ipcRenderer
									.invoke("remove-tag", photo.name, photoTag)
									.then((newProjects) => setProjects([...newProjects]))
							}
						/>
					))}
				</div>
			)}
			{(isHover || photo.selected) && (
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
							window.ipcRenderer
								.invoke("add-tag", photo.name, tag)
								.then((newProjects) => setProjects([...newProjects]));
							setTag("");
						}}
						size="small"
					>
						<AddIcon fontSize="small" />
					</IconButton>
				</div>
			)}
		</div>
	);
}
