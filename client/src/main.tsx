import { createRoot } from "react-dom/client";
import "./index.css";
import { installAuraRuntimeMonitor } from "./lib/runtimeMonitor";

installAuraRuntimeMonitor();

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
