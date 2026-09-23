import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installAuraRuntimeMonitor } from "./lib/runtimeMonitor";
import { AuraRuntimeErrorBoundary } from "./lib/AuraRuntimeErrorBoundary";

installAuraRuntimeMonitor();

createRoot(document.getElementById("root")!).render(
  <AuraRuntimeErrorBoundary>
    <App />
  </AuraRuntimeErrorBoundary>,
);
