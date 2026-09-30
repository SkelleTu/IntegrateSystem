import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, Calendar, Clock, Globe, LogIn, LogOut, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Monitoring() {
  const { data: monitoring, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/monitoring"],
    refetchInterval: 5000,
  });

  if (isLoading) return <div className="min-h-screen bg-black flex items-center justify-center text-primary">Carregando monitoramento...</div>;

  const sessions = monitoring?.sessions ?? [];

  return (
    <div className="min-h-screen w-full bg-black text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-10">
        <header>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Activity className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">Monitor <span className="text-primary">Aura</span></h1>
              <p className="text-zinc-500 font-medium">Sessões, acessos e saúde operacional em tempo real.</p>
            </div>
          </div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-white/5 border-white/10 lg:col-span-2">
            <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Sessões & Acessos</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {sessions.map((session: any) => (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${session.type === "login" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                          {session.type === "login" ? <LogIn className="w-4 h-4 text-emerald-500" /> : <LogOut className="w-4 h-4 text-red-500" />}
                        </div>
                        <div>
                          <p className="font-black text-white uppercase">{session.username}</p>
                          <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500 uppercase mt-1">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(session.createdAt), "dd MMM yyyy", { locale: ptBR })}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(session.createdAt), "HH:mm:ss")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right hidden md:block text-[10px] font-bold text-zinc-600 uppercase">
                        <div className="flex items-center gap-2"><Globe className="w-3 h-3" /> {session.ipAddress || "---"}</div>
                        <div className="flex items-center gap-2 mt-1"><Monitor className="w-3 h-3" /> {session.userAgent?.split(" ")[0] || "Browser"}</div>
                      </div>
                    </div>
                  ))}
                  {sessions.length === 0 && <div className="py-16 text-center text-zinc-600 font-bold uppercase">Nenhuma sessão registrada</div>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Status do Sistema</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-black/40 rounded-xl">
                <span className="text-[10px] font-black uppercase text-zinc-500">Acessos Hoje</span>
                <span className="text-2xl font-black text-white">{sessions.filter((s:any) => new Date(s.createdAt).toDateString() === new Date().toDateString()).length}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-black/40 rounded-xl">
                <span className="text-[10px] font-black uppercase text-zinc-500">Usuários Ativos</span>
                <span className="text-2xl font-black text-primary">{new Set(sessions.filter((s:any) => s.type === "login").map((s:any) => s.userId)).size}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
