import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Monitor, RefreshCw, ShieldAlert } from "lucide-react";

type RuntimeState =
  | { kind: "checking"; message: string }
  | { kind: "ready"; message: string; database: string }
  | { kind: "browser"; message: string }
  | { kind: "error"; message: string };

export default function AuraWindows() {
  const electronApiAvailable =
    typeof window !== "undefined" && Boolean((window as any).electronAPI);
  const [runtime, setRuntime] = useState<RuntimeState>({
    kind: "checking",
    message: "Verificando o ambiente local...",
  });

  const refreshRuntime = useCallback(async () => {
    if (!electronApiAvailable) {
      setRuntime({
        kind: "browser",
        message: "Esta página foi aberta no navegador. O navegador não tem acesso ao disco, aos processos ou aos arquivos locais do Windows.",
      });
      return;
    }

    setRuntime({ kind: "checking", message: "Verificando o servidor desktop e o banco local..." });

    try {
      const [healthResponse, databaseResponse] = await Promise.all([
        fetch("/health", { cache: "no-store" }),
        fetch("/api/db/status", { cache: "no-store" }),
      ]);

      if (!healthResponse.ok || !databaseResponse.ok) {
        throw new Error("O servidor local não respondeu corretamente.");
      }

      const [health, database] = await Promise.all([
        healthResponse.json(),
        databaseResponse.json(),
      ]);

      if (
        health.status !== "ok" ||
        health.service !== "integrated-system" ||
        database.status !== "online" ||
        database.provider !== "sqlite-local"
      ) {
        throw new Error("O aplicativo abriu, mas o servidor ou o banco SQLite local não passou na verificação.");
      }

      setRuntime({
        kind: "ready",
        message: "Aplicativo desktop ativo; servidor local e banco SQLite responderam.",
        database: database.provider,
      });
    } catch (error) {
      setRuntime({
        kind: "error",
        message: error instanceof Error ? error.message : "Falha ao verificar o runtime Windows.",
      });
    }
  }, [electronApiAvailable]);

  useEffect(() => {
    void refreshRuntime();
  }, [refreshRuntime]);

  const statusIcon =
    runtime.kind === "ready" ? CheckCircle2 :
    runtime.kind === "browser" ? ShieldAlert :
    runtime.kind === "error" ? AlertCircle :
    RefreshCw;

  const StatusIcon = statusIcon;

  return (
    <div className="min-h-screen space-y-6 bg-zinc-950 p-6 text-white">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-primary">
            <Monitor className="h-8 w-8" />
            Aura Windows Runtime
          </h1>
          <p className="text-zinc-400">
            Diagnóstico do aplicativo desktop e de seu servidor local.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void refreshRuntime()}
          disabled={runtime.kind === "checking"}
          className="border-zinc-800 text-white hover:bg-zinc-900"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${runtime.kind === "checking" ? "animate-spin" : ""}`} />
          Atualizar diagnóstico
        </Button>
      </div>

      <Alert className="border-zinc-800 bg-zinc-900 text-white">
        <StatusIcon className={`h-4 w-4 ${runtime.kind === "ready" ? "text-emerald-400" : runtime.kind === "error" ? "text-red-400" : "text-amber-400"}`} />
        <AlertTitle className="font-bold">
          {runtime.kind === "ready" ? "Runtime Windows verificado" :
           runtime.kind === "browser" ? "Navegador web detectado" :
           runtime.kind === "error" ? "Falha na verificação" :
           "Verificando runtime"}
        </AlertTitle>
        <AlertDescription className="text-zinc-400">{runtime.message}</AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300">Ambiente de execução</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zinc-400">
            {electronApiAvailable ? "Electron desktop detectado" : "Aplicação web no navegador"}
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300">Banco de dados</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zinc-400">
            {runtime.kind === "ready" ? runtime.database : "Ainda não verificado"}
          </CardContent>
        </Card>
      </div>

      {runtime.kind === "browser" && (
        <Alert className="border-amber-500/20 bg-amber-500/5 text-white">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <AlertTitle className="font-bold text-amber-300">Acesso local indisponível no navegador</AlertTitle>
          <AlertDescription className="text-zinc-400">
            Abra o executável Aura System no Windows para verificar o servidor local, o banco SQLite e os recursos nativos. A versão hospedada não pode navegar nem abrir arquivos do computador.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
