import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, Monitor, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function WindowsAppRunner() {
  const [isRunning, setIsRunning] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Monitor className="h-8 w-8 text-primary" />
          Aura System - Windows Runtime
        </h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="border-white/10 text-white hover:bg-white/5"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reiniciar Interface
          </Button>
          <Button 
            className="bg-primary text-black font-bold hover:bg-primary/90"
            onClick={() => setIsRunning(true)}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Abrir em Nova Janela
          </Button>
        </div>
      </div>

      <Alert className="bg-primary/10 border-primary/20 text-white">
        <InfoIcon className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary font-bold">Acesso Direto à Plataforma</AlertTitle>
        <AlertDescription className="text-zinc-400">
          Você pode operar a versão Windows diretamente abaixo. Caso a visualização integrada falhe, utilize o botão "Abrir em Nova Janela" para forçar a renderização nativa do ambiente Replit.
        </AlertDescription>
      </Alert>

      <Card className="bg-zinc-900/50 border-white/5 overflow-hidden flex-1 min-h-[800px] flex flex-col">
        <CardHeader className="border-b border-white/5 bg-black/20 shrink-0">
          <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Plataforma Aura - Windows Executable View
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 bg-black relative min-h-0">
          <iframe 
            src="/" 
            className="w-full h-full border-none bg-black" 
            title="Aura Windows View"
            style={{ minHeight: "800px" }}
          />
          <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur px-3 py-1.5 rounded border border-white/10 text-[10px] text-primary font-mono animate-pulse">
            CONNECTED TO VIRTUAL_DISPLAY:0
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
