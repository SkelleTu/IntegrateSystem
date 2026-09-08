import { useEffect, useState } from "react";
import { useSmartInterval } from "@/hooks/use-smart-interval";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import { useUser } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Wifi, 
  WifiOff, 
  Database, 
  User as UserIcon, 
  Clock, 
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  Monitor
} from "lucide-react";
import { useLocation } from "wouter";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface DBStatus {
  status: "online" | "offline" | "unstable";
  message: string;
  latency?: number;
  lastAction?: string;
  timestamp?: number;
}

export function StatusBar() {
  const { data: user } = useUser();
  const [, setLocation] = useLocation();
  const [time, setTime] = useState(new Date());
  const [displayAction, setDisplayAction] = useState<string>("Sistema ocioso");

  // Poll for database status
  const { data: dbStatus } = useQuery<DBStatus>({
    queryKey: ["/api/db/status"],
    refetchInterval: 10000,
    initialData: { status: "online", message: "Sistema operando normalmente" }
  });

  useEffect(() => {
    if (dbStatus?.lastAction) {
      setDisplayAction(dbStatus.lastAction);
    }
  }, [dbStatus?.lastAction, dbStatus?.timestamp]);

  const isVisible = usePageVisibility();

  // Relógio — pausa quando a aba está oculta, atualiza imediatamente ao voltar
  useSmartInterval(() => setTime(new Date()), 1000);

  const [isSyncing, setIsSyncing] = useState(false);
  
  // Animação de sincronização — só roda quando a aba está visível
  useEffect(() => {
    if (!isVisible) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const randomSync = () => {
      setIsSyncing(true);
      timeoutId = setTimeout(() => {
        setIsSyncing(false);
        timeoutId = setTimeout(randomSync, Math.random() * 10000 + 5000);
      }, 1000);
    };
    timeoutId = setTimeout(randomSync, 3000);
    return () => clearTimeout(timeoutId);
  }, [isVisible]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]";
      case "unstable": return "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.6)]";
      case "offline": return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]";
      default: return "bg-zinc-500";
    }
  };

  return (
    <div className="fixed bottom-0 left-0 w-full h-8 bg-black/80 backdrop-blur-md border-t border-white/10 z-[10000] px-2 md:px-4 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-zinc-400 select-none overflow-hidden">
      {/* Left side: DB Status & User */}
      <div className="flex items-center gap-3 md:gap-6 min-w-0 overflow-hidden">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-help shrink-0">
                <div className={cn("w-2 h-2 rounded-full animate-pulse", getStatusColor(dbStatus?.status || "online"))} />
                <span className={cn(
                  "hidden xs:inline",
                  dbStatus?.status === "online" ? "text-green-500" : 
                  dbStatus?.status === "unstable" ? "text-yellow-500" : "text-red-500"
                )}>
                  {dbStatus?.status === "online" ? "AURA" : dbStatus?.status === "unstable" ? "INSTÁVEL" : "OFFLINE"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-900 border-white/10 text-white text-[10px] p-2">
              <p>{dbStatus?.message || "Verificando conexão..."}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {user && (
          <div className="flex items-center gap-1.5 border-l border-white/5 pl-3 md:pl-6 shrink-0">
            <UserIcon className="w-3 h-3 text-primary" />
            <span className="text-zinc-200 truncate max-w-[80px] md:max-w-none">{user.username}</span>
            <span className="hidden sm:inline text-[8px] bg-white/10 px-1.5 py-0.5 rounded text-zinc-400">{user.role}</span>
          </div>
        )}

        {user?.username === "SkelleTu" && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => setLocation("/admin/windows-app")}
                  className="hidden md:flex items-center gap-2 border-l border-white/5 pl-6 hover:text-primary transition-colors cursor-pointer group"
                >
                  <Monitor className="w-3 h-3 text-zinc-500 group-hover:text-primary transition-colors" />
                  <span className="text-[9px] text-zinc-500 group-hover:text-primary transition-colors">WINDOWS</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-900 border-white/10 text-white text-[10px] p-2">
                <p>Executar Aura System (Versão Windows)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <div className="hidden sm:flex items-center gap-2 border-l border-white/5 pl-3 md:pl-6 overflow-hidden">
          <Database className={cn("w-3 h-3 transition-colors shrink-0", isSyncing ? "text-primary" : "text-zinc-600")} />
          <div className="flex items-center gap-2 min-w-0">
            {isSyncing ? (
              <span className="text-[9px] text-primary/80 animate-in fade-in slide-in-from-left-2 flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5 animate-spin shrink-0" />
                <span className="hidden md:inline">SINCRONIZANDO...</span>
              </span>
            ) : (
              <span className="text-[9px] text-zinc-600 truncate">BANCO DE DADOS TURSO ATIVO</span>
            )}
          </div>
        </div>
      </div>

      {/* Center: Real-time Data Feed */}
      <div className="hidden lg:flex items-center gap-4 text-[9px] text-primary italic truncate max-w-md animate-in fade-in slide-in-from-bottom-1 px-4">
        <div className="flex items-center gap-2 min-w-0">
           <ArrowUpRight className="w-3 h-3 text-green-500 shrink-0" />
           <span className="font-mono tracking-tighter truncate">{displayAction}</span>
        </div>
      </div>

      {/* Right side: Date & Time */}
      <div className="flex items-center gap-2 md:gap-6 shrink-0">
        <div className="hidden md:flex items-center gap-2">
          <Calendar className="w-3 h-3 text-zinc-500" />
          <span>{format(time, "dd 'DE' MMMM 'DE' yyyy", { locale: ptBR })}</span>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 md:border-l md:border-white/5 md:pl-6">
          <Clock className="w-3 h-3 text-primary" />
          <span className="text-zinc-200 tabular-nums">{format(time, "HH:mm:ss")}</span>
        </div>
      </div>
    </div>
  );
}
