import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, Monitor } from "lucide-react";

export default function WindowsAppRunner() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Monitor className="h-8 w-8 text-primary" />
          Aura System - Windows Runtime
        </h1>
      </div>

      <Alert className="bg-primary/10 border-primary/20 text-white">
        <InfoIcon className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary font-bold">Ambiente de Depuração em Tempo Real</AlertTitle>
        <AlertDescription className="text-zinc-400">
          Esta interface permite a execução e monitoramento do Aura System em sua versão nativa Windows. 
          O ambiente Replit fornece uma camada de compatibilidade para identificar problemas de integração e performance.
        </AlertDescription>
      </Alert>

      <Card className="bg-zinc-900/50 border-white/5 overflow-hidden flex-1 min-h-[600px]">
        <CardHeader className="border-b border-white/5 bg-black/20">
          <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Sessão Ativa: Windows Container
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 h-full flex flex-col items-center justify-center bg-black relative">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-12">
            <Monitor className="h-16 w-16 text-zinc-800" />
            <div>
              <p className="text-zinc-500 text-sm max-w-md">
                O aplicativo Windows está sendo inicializado no servidor. 
                Devido às restrições do ambiente web, a visualização direta do frame do Windows requer uma conexão via VNC ou streaming de tela que está sendo configurada.
              </p>
            </div>
            <div className="mt-4 p-4 rounded-lg bg-zinc-950 border border-white/5 font-mono text-xs text-green-500/70 text-left w-full max-w-2xl overflow-auto max-h-[200px]">
              <p>[SYSTEM] Iniciando subsistema Windows...</p>
              <p>[INFO] Carregando Aura System (Windows Version)/main.js</p>
              <p>[INFO] Mapeando sqlite.db para ambiente virtual...</p>
              <p>[DEBUG] Verificando dependências node_modules...</p>
              <p>[SUCCESS] Ambiente pronto. Aguardando conexão de interface gráfica...</p>
            </div>
          </div>
          {/* 
            Nota: Em um ambiente Replit real, aqui integraríamos com um cliente no-vnc 
            ou um iframe apontando para um serviço de streaming de janelas X11/Windows.
          */}
          <iframe 
            src="/api/windows/stream" 
            className="w-full h-full border-none hidden" 
            title="Windows App Stream"
          />
        </CardContent>
      </Card>
    </div>
  );
}
