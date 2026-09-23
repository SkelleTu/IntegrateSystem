import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installAuraRuntimeMonitor } from "./lib/runtimeMonitor";

installAuraRuntimeMonitor();

createRoot(document.getElementById("root")!).render(<App />);
