import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Folder, 
  File, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw, 
  AlertCircle, 
  Play,
  FileText,
  Terminal
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  extension?: string;
}

interface FileError {
  message: string;
  stack?: string;
  timestamp: string;
}

export default function AuraWindows() {
  const [currentPath, setCurrentPath] = useState(".");
  const { toast } = useToast();
  const [logs, setLogs] = useState<string[]>([]);

  const { data: files, isLoading, error, refetch } = useQuery<FileItem[]>({
    queryKey: ["/api/windows/files", currentPath],
    queryFn: async () => {
      const res = await fetch(`/api/windows/files?path=${encodeURIComponent(currentPath)}`);
      if (!res.ok) throw new Error("Falha ao listar arquivos");
      return res.json();
    }
  });

  const { data: errors } = useQuery<FileError[]>({
    queryKey: ["/api/windows/errors"],
    refetchInterval: 5000
  });

  const openFileMutation = useMutation({
    mutationFn: async (filePath: string) => {
      const res = await apiRequest("POST", "/api/windows/open", { path: filePath });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Sucesso", description: "Arquivo aberto com sucesso" });
      } else {
        toast({ 
          title: "Erro ao abrir", 
          description: data.error, 
          variant: "destructive" 
        });
      }
    },
    onError: (err: any) => {
      toast({ 
        title: "Erro crítico", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  });

  const navigateUp = () => {
    if (currentPath === ".") return;
    const parts = currentPath.split("/");
    parts.pop();
    setCurrentPath(parts.length === 0 ? "." : parts.join("/"));
  };

  const handleItemClick = (item: FileItem) => {
    if (item.isDirectory) {
      setCurrentPath(item.path);
    } else {
      openFileMutation.mutate(item.path);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-zinc-950 min-h-screen text-white">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Aura Windows Explorer</h1>
          <p className="text-zinc-400">Gerencie arquivos e monitore erros do sistema desktop.</p>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => refetch()}
          className="border-zinc-800 hover:bg-zinc-900"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-zinc-900 border-zinc-800">
          <CardHeader className="border-b border-zinc-800 py-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={navigateUp}
                disabled={currentPath === "."}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-mono bg-black/50 px-2 py-1 rounded border border-zinc-800">
                {currentPath}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-zinc-500">
                  Carregando arquivos...
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full text-red-400 gap-2">
                  <AlertCircle className="w-8 h-8" />
                  <span>Erro ao carregar diretório</span>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {files?.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => handleItemClick(file)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left group"
                    >
                      {file.isDirectory ? (
                        <Folder className="w-5 h-5 text-blue-400 fill-blue-400/20" />
                      ) : (
                        <FileText className="w-5 h-5 text-zinc-400" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {file.name}
                        </p>
                        {!file.isDirectory && (
                          <p className="text-xs text-zinc-500">
                            {(file.size! / 1024).toFixed(1)} KB
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500" />
                    </button>
                  ))}
                  {files?.length === 0 && (
                    <div className="p-8 text-center text-zinc-500 italic">
                      Pasta vazia
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                Console de Erros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] rounded border border-zinc-800 bg-black p-4 font-mono text-[10px]">
                {errors && errors.length > 0 ? (
                  <div className="space-y-4">
                    {errors.map((err, i) => (
                      <div key={i} className="text-red-400 border-l-2 border-red-900 pl-2">
                        <p className="font-bold">[{new Date(err.timestamp).toLocaleTimeString()}] {err.message}</p>
                        {err.stack && <pre className="mt-1 opacity-50 overflow-x-auto">{err.stack}</pre>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-zinc-600 italic">Nenhum erro registrado recentemente...</div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 border-zinc-800 hover:bg-zinc-800"
                onClick={() => handleItemClick({ name: "main.js", path: "main.js", isDirectory: false })}
              >
                <Play className="w-4 h-4" />
                Executar main.js
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 border-zinc-800 hover:bg-zinc-800"
                onClick={() => setCurrentPath(".")}
              >
                <Folder className="w-4 h-4" />
                Ir para Raiz
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
