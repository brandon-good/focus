import { BrowserRouter, Route, Routes } from "react-router-dom";
import ConfigInstall from "./ConfigInstall";
import Home from "./Home";
import NewProject from "./NewProject";
import Projects from "./Projects";
import { createTheme, ThemeProvider } from "@mui/material/styles";

export default function App() {
	const primary = {
		main: "#89B3F7",
		hover: "#9DC0F9",
	};

	const darkTheme = createTheme({
		palette: {
			mode: "dark",
			primary: primary,
		},
		typography: {
			button: {
				textTransform: "none",
			},
		},
	});

	return (
		<ThemeProvider theme={darkTheme}>
			<BrowserRouter>
				<Routes>
					<Route path="/config-install" element={<ConfigInstall />} />
					<Route path="/home" element={<Home />} />
					<Route path="/new-project" element={<NewProject />} />
					<Route path="/projects" element={<Projects />} />
				</Routes>
			</BrowserRouter>
		</ThemeProvider>
	);
}
