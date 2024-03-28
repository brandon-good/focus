import { useState } from "react";
import "./ConfigInstall.css";
import Button from "@mui/material/Button";

export default function Home() {
	const [installDir, setInstallDir] = useState(null);

	return (
		<div id="config-install-container">
			<h1>Where would you like to install Focus?</h1>
			{installDir && <span>{`Installing at ${installDir}`}</span>}
			<div>
				<Button
					onClick={() =>
						window.ipcRenderer
							.invoke("open-dialog", {
								configInstall: true,
								buttonLabel: "Install Here",
								title: "Choose Installation Directory",
							})
							.then((newInstallDir) => {
								if (newInstallDir) setInstallDir(newInstallDir);
							})
					}
				>
					Browse
				</Button>
				{installDir && (
					<Button
						onClick={() =>
							window.ipcRenderer.send("set-install-dir", installDir)
						}
						variant="contained"
					>
						Done
					</Button>
				)}
			</div>
		</div>
	);
}
