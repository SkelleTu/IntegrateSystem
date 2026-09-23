import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportAuraRuntimeEvent } from "./runtimeMonitor";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class AuraRuntimeErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportAuraRuntimeEvent(
      "react-render-error",
      "Erro capturado por Error Boundary do React",
      {
        phase: "renderer",
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        componentStack: errorInfo.componentStack,
      },
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
          <div className="max-w-xl w-full border border-red-500/30 rounded-xl p-8 bg-red-500/5">
            <h1 className="text-xl font-bold mb-2">Aura System encontrou um erro</h1>
            <p className="text-sm text-white/70">
              O erro foi registrado automaticamente no monitor de runtime.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
