import { useState } from "react";
import "./Preview.css";
import DeleteIcon from "@mui/icons-material/Delete";
import Rating from "@mui/material/Rating";

export default function Preview({ expanded, photo, setProjects }) {
	const [isHover, setIsHover] = useState(false);

	return (
		<div
			className="preview"
			onMouseEnter={() => setIsHover(true)}
			onMouseLeave={() => setIsHover(false)}
			style={{
				border: photo.selected ? "2px solid #89B3F7" : "none",
				width: expanded ? "15rem" : "100%rem",
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
					src={photo.previewPath}
					style={{ cursor: "pointer" }}
				/>
				{isHover && (
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
		</div>
	);
}
