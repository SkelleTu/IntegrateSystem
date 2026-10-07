import { createRoot } from "react-dom/client";
import "./index.css";
import { installAuraRuntimeMonitor } from "./lib/runtimeMonitor";
import { installAuraWebMCP } from "./lib/webmcp";

installAuraRuntimeMonitor();

// Expose structured Aura operations to WebMCP-capable browsers/agents.
// The bridge uses the current browser session; credentials are never passed to WebMCP.
void installAuraWebMCP().catch((error) => {
  console.warn("WebMCP do Aura não pôde ser instalado:", error);
});

// Habilita o modo PWA do Aurora Agent no Chrome e em navegadores compatíveis.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.error("Falha ao registrar o Service Worker do Aurora Agent:", error);
    });
  });
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemento #root não encontrado");
}

const root = createRoot(rootElement);

// Carregamos a aplicação só depois de instalar o monitor para capturar
// também erros/logs ocorridos durante a avaliação inicial dos módulos React.
void Promise.all([
  import("./App"),
  import("./lib/AuraRuntimeErrorBoundary"),
])
  .then(([appModule, boundaryModule]) => {
    const App = appModule.default;
    const { AuraRuntimeErrorBoundary } = boundaryModule;

    root.render(
      <AuraRuntimeErrorBoundary>
        <App />
      </AuraRuntimeErrorBoundary>,
    );
  })
  .catch((error) => {
    console.error("Falha ao carregar os módulos principais do Aura System:", error);
    throw error;
  });
