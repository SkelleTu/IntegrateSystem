import { useEffect, useState } from "react";
import { useSmartInterval } from "@/hooks/use-smart-interval";
import { useUser } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Database, User as UserIcon, Clock, Calendar, ArrowUpRight, Monitor, CloudOff, Cloud } from "lucide-react";
import { useLocation } from "wouter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import DatabaseControl from "@/components/DatabaseControl";

interface DBStatus {
  status: "online" | "offline" | "unstable";
  message: string;
  latency?: number;
  lastAction?: string;
  timestamp?: number;
}

interface GoogleDriveStatus {
  available: boolean;
  lastSuccessfulBackupAt: number | null;
  lastErrorMessage: string | null;
}

export function StatusBar() {
  const { data: user } = useUser();
  const [, setLocation] = useLocation();
  const [time, setTime] = useState(new Date());
  const [displayAction, setDisplayAction] = useState<string>("Sistema ocioso");

  const { data: dbStatus } = useQuery<DBStatus>({
    queryKey: ["/api/db/status"],
    refetchInterval: 10000,
    initialData: { status: "online", message: "Sistema operando normalmente" }
  });

  const { data: googleDriveStatus } = useQuery<GoogleDriveStatus>({
    queryKey: ["/api/google-drive/status"],
    refetchInterval: 10000,
    initialData: { available: true, lastSuccessfulBackupAt: null, lastErrorMessage: null },
  });

  useEffect(() => {
    if (dbStatus?.lastAction) setDisplayAction(dbStatus.lastAction);
  }, [dbStatus?.lastAction, dbStatus?.timestamp]);

  useSmartInterval(() => setTime(new Date()), 1000);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]";
      case "unstable": return "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.6)]";
      case "offline": return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]";
      default: return "bg-zinc-500";
    }
  };

  const driveUnavailable = googleDriveStatus?.available === false;
  const driveError = googleDriveStatus?.lastErrorMessage || "O backup do banco não pôde ser sincronizado com o Google Drive.";

  return (
    <div className="fixed bottom-0 left-0 w-full h-8 bg-black/80 backdrop-blur-md border-t border-white/10 z-[10000] px-2 md:px-4 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-zinc-400 select-none overflow-visible">
      <div className="flex items-center gap-3 md:gap-6 min-w-0 flex-1 overflow-hidden">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-help shrink-0">
                <div className={cn("w-2 h-2 rounded-full animate-pulse", getStatusColor(dbStatus?.status || "online"))} />
                <span className={cn("hidden xs:inline", dbStatus?.status === "online" ? "text-green-500" : dbStatus?.status === "unstable" ? "text-yellow-500" : "text-red-500")}>
                  {dbStatus?.status === "online" ? "AURA" : dbStatus?.status === "unstable" ? "INSTÁVEL" : "OFFLINE"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-900 border-white/10 text-white text-[10px] p-2"><p>{dbStatus?.message || "Verificando conexão..."}</p></TooltipContent>
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
                <button onClick={() => setLocation("/admin/windows-app")} className="hidden md:flex items-center gap-2 border-l border-white/5 pl-6 hover:text-primary transition-colors cursor-pointer group shrink-0">
                  <Monitor className="w-3 h-3 text-zinc-500 group-hover:text-primary transition-colors" />
                  <span className="text-[9px] text-zinc-500 group-hover:text-primary transition-colors">WINDOWS</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-900 border-white/10 text-white text-[10px] p-2"><p>Executar Aura System (Versão Windows)</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "hidden sm:flex items-center gap-2 border-l pl-3 md:pl-6 overflow-hidden min-w-0 cursor-help",
                driveUnavailable ? "border-red-500/20" : "border-white/5"
              )}>
                {driveUnavailable ? (
                  <>
                    <CloudOff className="w-3 h-3 text-red-400 shrink-0" />
                    <span className="text-[9px] text-red-400 truncate">GOOGLE DRIVE INDISPONÍVEL</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3 h-3 text-zinc-500 shrink-0" />
                    <span className="text-[9px] text-zinc-600 truncate">GOOGLE DRIVE ATIVO</span>
                  </>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-900 border-white/10 text-white text-[10px] p-2 max-w-sm">
              <p>{driveUnavailable ? driveError : "Backup automático do SQLite sincronizado com o Google Drive."}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="hidden lg:flex items-center gap-2 border-l border-white/5 pl-6 overflow-hidden min-w-0">
          <Database className="w-3 h-3 text-zinc-600 shrink-0" />
          <span className="text-[9px] text-zinc-600 truncate">{dbStatus?.message || "Banco de dados"}</span>
        </div>

        <DatabaseControl embedded />
      </div>

      <div className="hidden lg:flex items-center gap-4 text-[9px] text-primary italic truncate max-w-md animate-in fade-in slide-in-from-bottom-1 px-4 shrink-0">
        <div className="flex items-center gap-2 min-w-0"><ArrowUpRight className="w-3 h-3 text-green-500 shrink-0" /><span className="font-mono tracking-tighter truncate">{displayAction}</span></div>
      </div>

      <div className="flex items-center gap-2 md:gap-6 shrink-0">
        <div className="hidden md:flex items-center gap-2"><Calendar className="w-3 h-3 text-zinc-500" /><span>{format(time, "dd 'DE' MMMM 'DE' yyyy", { locale: ptBR })}</span></div>
        <div className="flex items-center gap-1.5 md:gap-2 md:border-l md:border-white/5 md:pl-6"><Clock className="w-3 h-3 text-primary" /><span className="text-zinc-200 tabular-nums">{format(time, "HH:mm:ss")}</span></div>
      </div>
    </div>
  );
}
