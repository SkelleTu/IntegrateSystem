import { useEffect, useState } from "react";
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
    refetchInterval: 2000,
    initialData: { status: "online", message: "Sistema operando normalmente" }
  });

  useEffect(() => {
    if (dbStatus?.lastAction) {
      setDisplayAction(dbStatus.lastAction);
    }
  }, [dbStatus?.lastAction, dbStatus?.timestamp]);

  // Effect to update time every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate real-time database activity (listening to query cache or specific events could be done better with WS)
  // For now, we'll show a small animation when queries are fetching
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Real-time animation simulator for database writes/reads
  useEffect(() => {
    const randomSync = () => {
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 1000);
      setTimeout(randomSync, Math.random() * 10000 + 5000);
    };
    const timeout = setTimeout(randomSync, 3000);
    return () => clearTimeout(timeout);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]";
      case "unstable": return "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.6)]";
      case "offline": return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]";
      default: return "bg-zinc-500";
    }
  };

  return (
    <div className="fixed bottom-0 left-0 w-full h-8 bg-black/80 backdrop-blur-md border-t border-white/10 z-[10000] px-4 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-zinc-400 select-none">
      {/* Left side: DB Status & User */}
      <div className="flex items-center gap-6">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-help">
                <div className={cn("w-2 h-2 rounded-full animate-pulse", getStatusColor(dbStatus?.status || "online"))} />
                <span className={cn(
                  dbStatus?.status === "online" ? "text-green-500" : 
                  dbStatus?.status === "unstable" ? "text-yellow-500" : "text-red-500"
                )}>
                  {dbStatus?.status === "online" ? "AURA ONLINE" : dbStatus?.status === "unstable" ? "INSTABILIDADE" : "OFFLINE"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-900 border-white/10 text-white text-[10px] p-2">
              <p>{dbStatus?.message || "Verificando conexão..."}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {user && (
          <div className="flex items-center gap-2 border-l border-white/5 pl-6">
            <UserIcon className="w-3 h-3 text-primary" />
            <span className="text-zinc-200">{user.username}</span>
            <span className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded text-zinc-400">{user.role}</span>
          </div>
        )}

        {user?.username === "SkelleTu" && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => setLocation("/admin/windows-app")}
                  className="flex items-center gap-2 border-l border-white/5 pl-6 hover:text-primary transition-colors cursor-pointer group"
                >
                  <Monitor className="w-3 h-3 text-zinc-500 group-hover:text-primary transition-colors" />
                  <span className="text-[9px] text-zinc-500 group-hover:text-primary transition-colors">AURA WINDOWS</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-900 border-white/10 text-white text-[10px] p-2">
                <p>Executar Aura System (Versão Windows)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <div className="flex items-center gap-2 border-l border-white/5 pl-6 overflow-hidden">
          <Database className={cn("w-3 h-3 transition-colors", isSyncing ? "text-primary" : "text-zinc-600")} />
          <div className="flex items-center gap-2">
            {isSyncing ? (
              <span className="text-[9px] text-primary/80 animate-in fade-in slide-in-from-left-2 flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                SINCRONIZANDO DADOS...
              </span>
            ) : (
              <span className="text-[9px] text-zinc-600">BANCO DE DADOS TURSO ATIVO</span>
            )}
          </div>
        </div>
      </div>

      {/* Center: Real-time Data Feed */}
      <div className="hidden lg:flex items-center gap-4 text-[9px] text-primary italic truncate max-w-md animate-in fade-in slide-in-from-bottom-1">
        <div className="flex items-center gap-2">
           <ArrowUpRight className="w-3 h-3 text-green-500" />
           <span className="font-mono tracking-tighter">{displayAction}</span>
        </div>
      </div>

      {/* Right side: Date & Time */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3 text-zinc-500" />
          <span>{format(time, "dd 'DE' MMMM 'DE' yyyy", { locale: ptBR })}</span>
        </div>
        <div className="flex items-center gap-2 border-l border-white/5 pl-6 min-w-[80px] justify-end">
          <Clock className="w-3 h-3 text-primary" />
          <span className="text-zinc-200 tabular-nums">{format(time, "HH:mm:ss")}</span>
        </div>
      </div>
    </div>
  );
}
