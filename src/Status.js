import "./Status.css";

export default function Status({ projects }) {
	return (
		<div id="status-container">
			<div
				id="status-icon"
				style={{
					background: projects.some(
						(project) => project.loading || project.exporting
					)
						? "red"
						: "green",
				}}
			></div>
			<span>
				{projects.some((project) => project.loading && project.archived)
					? "Unarchiving project..."
					: projects.some((project) => project.loading)
					? "Creating project..."
					: projects.some((project) => project.exporting)
					? "Exporting project..."
					: "Ready"}
			</span>
		</div>
	);
}
