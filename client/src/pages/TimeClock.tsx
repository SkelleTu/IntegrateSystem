import { useUser } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Fingerprint, History, ArrowLeft, Clock, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import auraLogo from "@assets/AURA_1768346008566.png";

export default function TimeClock() {
  const { data: user } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: timeClockStatus, refetch: refetchStatus } = useQuery<any>({
    queryKey: ["/api/time-clock/status"],
    enabled: !!user
  });

  const { data: timeClockHistory, refetch: refetchHistory } = useQuery<any[]>({
    queryKey: ["/api/time-clock/history"],
    enabled: !!user
  });

  const registerFingerprintMutation = useMutation({
    mutationFn: async () => {
      try {
        toast({ title: "Iniciando...", description: "Por favor, siga as instruções do seu navegador para ler sua digital." });
        const challenge = window.crypto.getRandomValues(new Uint8Array(32));
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "Aura" },
            user: {
              id: window.crypto.getRandomValues(new Uint8Array(16)),
              name: user?.username || "user",
              displayName: user?.username || "User"
            },
            pubKeyCredParams: [{ alg: -7, type: "public-key" }],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required"
            },
            timeout: 60000
          }
        });
        if (!credential) throw new Error("Falha ao acessar sensor biométrico.");
        const fpId = (credential as any).id;
        const res = await apiRequest("POST", "/api/auth/register-fingerprint", { fingerprintId: fpId });
        return res.json();
      } catch (err: any) {
        if (err.name === "NotAllowedError") {
          throw new Error("Operação cancelada ou sensor não encontrado.");
        }
        throw new Error("Erro ao ler digital real.");
      }
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Sua digital foi cadastrada!" });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => toast({ title: "Falha", description: error.message, variant: "destructive" })
  });

  const registerClockMutation = useMutation({
    mutationFn: async (type: string) => {
      if (!user?.fingerprintId) throw new Error("Cadastre sua digital primeiro!");
      try {
        const challenge = window.crypto.getRandomValues(new Uint8Array(32));
        const savedId = Uint8Array.from(atob(user.fingerprintId.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge,
            allowCredentials: [{ id: savedId, type: "public-key" }],
            userVerification: "required",
            timeout: 60000
          }
        });
        if (!assertion) throw new Error("Verificação falhou.");
        const res = await apiRequest("POST", "/api/time-clock/register", { type, fingerprintId: user.fingerprintId });
        return res.json();
      } catch (err: any) {
        throw new Error("Digital não reconhecida.");
      }
    },
    onSuccess: (data) => {
      const labels: Record<string, string> = {
        in: "Expediente Iniciado",
        break_start: "Intervalo Iniciado",
        break_end: "Expediente Retomado",
        out: "Expediente Finalizado"
      };
      toast({ title: labels[data.type] || "Ponto Registrado" });
      refetchStatus();
      refetchHistory();
    },
    onError: (error: any) => toast({ title: "Erro", description: error.message, variant: "destructive" })
  });

  const getNextAction = () => {
    if (!timeClockStatus?.latest) return { type: "in", label: "Iniciar Expediente" };
    const lastType = timeClockStatus.latest.type;
    if (lastType === "in") return { type: "break_start", label: "Intervalo" };
    if (lastType === "break_start") return { type: "break_end", label: "Retomar Expediente" };
    if (lastType === "break_end") return { type: "out", label: "Término de Expediente" };
    return { type: "in", label: "Iniciar Expediente" };
  };

  const currentAction = getNextAction();

  if (!user) return null;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black flex flex-col items-center">
      {/* Background Image with matching effects */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 scale-[1.05] blur-[4px]"
        style={{ backgroundImage: `url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=2564)` }}
      />
      
      {/* Dark Overlay Gradient */}
      <div className="absolute inset-0 z-1 bg-gradient-to-b from-black/60 via-black/80 to-black pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl p-6 flex flex-col gap-8">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setLocation("/app")} 
              className="bg-white/5 border-white/10 hover:bg-white/20 transition-all rounded-full h-12 w-12"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Button>
            <div>
              <h1 className="text-3xl font-black italic uppercase text-white tracking-tighter leading-none">Ponto <span className="text-primary">Digital</span></h1>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-1 italic">Sistema de Biometria Aura</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <Clock className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-white font-black italic uppercase text-xs tracking-widest">
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Action Card */}
          <div className="lg:col-span-7">
            <Card className="bg-black/40 backdrop-blur-2xl border-white/10 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
              <CardContent className="p-10 flex flex-col items-center text-center relative z-10">
                <div className="mb-10 relative">
                  <div className="absolute -inset-16 bg-primary/20 rounded-full blur-[60px] opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="relative bg-white/5 p-8 rounded-full border border-white/10 backdrop-blur-md">
                    <Fingerprint className="w-24 h-24 text-primary drop-shadow-[0_0_15px_rgba(0,229,255,0.6)]" />
                  </div>
                </div>

                <div className="space-y-2 mb-10">
                  <p className="text-[10px] uppercase font-black tracking-[0.4em] text-primary/70 italic">Próxima Ação</p>
                  <h3 className="text-4xl font-black italic uppercase text-white tracking-tighter leading-tight">
                    {currentAction.label}
                  </h3>
                </div>
                
                {!user.fingerprintId ? (
                  <Button 
                    size="lg" 
                    className="w-full h-16 font-black uppercase italic text-lg tracking-widest bg-primary hover:bg-primary/90 text-black shadow-[0_0_40px_rgba(0,229,255,0.3)] transition-all hover:scale-[1.02] active:scale-95" 
                    onClick={() => registerFingerprintMutation.mutate()}
                  >
                    Configurar Biometria
                  </Button>
                ) : (
                  <Button 
                    size="lg" 
                    className="w-full h-16 font-black uppercase italic text-lg tracking-widest bg-primary hover:bg-primary/90 text-black flex items-center justify-center gap-4 shadow-[0_0_40px_rgba(0,229,255,0.3)] transition-all hover:scale-[1.02] active:scale-95" 
                    onClick={() => registerClockMutation.mutate(currentAction.type)}
                  >
                    <Fingerprint className="w-6 h-6" />
                    Registrar Ponto
                  </Button>
                )}

                <div className="mt-10 pt-8 border-t border-white/10 w-full flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    <p className="text-[11px] text-zinc-300 uppercase font-black tracking-widest italic">
                      Operador: <span className="text-white">{user.username}</span>
                    </p>
                  </div>
                  <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
                    ID: {user.id} • {user.fingerprintId ? "Biometria Verificada" : "Aguardando Cadastro"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar / History Section */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <History className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[12px] font-black uppercase tracking-[0.2em] italic text-white">Linha do Tempo</span>
              </div>
              <Calendar className="w-4 h-4 text-zinc-600" />
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {timeClockHistory?.length ? timeClockHistory.map((clock) => {
                const labels: Record<string, string> = { 
                  in: "Entrada", 
                  break_start: "Intervalo", 
                  break_end: "Retorno", 
                  out: "Saída" 
                };
                const colors: Record<string, string> = {
                  in: "text-primary",
                  break_start: "text-yellow-500",
                  break_end: "text-primary",
                  out: "text-red-500"
                };
                return (
                  <div 
                    key={clock.id} 
                    className="p-5 border border-white/5 rounded-2xl bg-white/[0.03] backdrop-blur-md hover:bg-white/[0.06] transition-all group"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <p className={`font-black italic uppercase text-[12px] tracking-wider ${colors[clock.type] || "text-zinc-300"}`}>
                        {labels[clock.type] || "Ponto"}
                      </p>
                      <div className="h-[1px] flex-1 mx-4 bg-white/5 group-hover:bg-white/10 transition-all" />
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">
                        {new Date(clock.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                        {new Date(clock.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                      </p>
                      <div className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[8px] font-black text-zinc-500 uppercase italic">Verificado</div>
                    </div>
                  </div>
                );
              }) : (
                <div className="p-10 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center">
                  <Clock className="w-8 h-8 text-zinc-800 mb-4" />
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest italic">Nenhum registro hoje</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

