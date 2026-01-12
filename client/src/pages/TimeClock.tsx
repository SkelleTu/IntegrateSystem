import { useUser } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Fingerprint, History, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

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
            rp: { name: "BarberFlow" },
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
    <div className="min-h-screen bg-transparent p-4 flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="bg-white/10 backdrop-blur-md rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-2xl font-black italic uppercase text-white tracking-tighter">Registro de Ponto</h1>
      </div>

      <div className="relative group">
        <div className="absolute -inset-0.5 bg-primary/20 rounded-2xl blur opacity-75"></div>
        <div className="relative flex flex-col items-center justify-center p-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl text-center">
          <p className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/50 mb-4 italic">Status de Operação</p>
          
          <div className="relative mb-6">
            <div className="absolute -inset-12 bg-primary/30 rounded-full blur-3xl animate-pulse"></div>
            <div className="relative z-10 w-20 h-28 flex items-center justify-center">
              <Fingerprint className="w-full h-full text-primary drop-shadow-[0_0_25px_rgba(0,255,102,0.9)] animate-pulse" />
            </div>
          </div>

          <h3 className="text-xl font-black italic uppercase text-white tracking-tighter mb-6">{currentAction.label}</h3>
          
          {!user.fingerprintId ? (
            <Button size="lg" className="w-full font-black uppercase italic bg-yellow-500 text-black" onClick={() => registerFingerprintMutation.mutate()}>
              Cadastrar Digital
            </Button>
          ) : (
            <Button size="lg" className="w-full font-black uppercase italic bg-primary text-black flex items-center justify-center gap-2" onClick={() => registerClockMutation.mutate(currentAction.type)}>
              <Fingerprint className="w-5 h-5" />
              {currentAction.label}
            </Button>
          )}

          <div className="mt-6 pt-4 border-t border-white/5 w-full">
            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
              Operador: <span className="text-zinc-300">{user.username}</span>
            </p>
            <p className="text-[9px] text-zinc-600 mt-1 uppercase font-bold">
              {user.fingerprintId ? "Biometria Ativa" : "Biometria Pendente"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-zinc-400">
          <History className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Linha do Tempo</span>
        </div>
        <div className="space-y-3">
          {timeClockHistory?.map((clock) => {
            const labels: Record<string, string> = { in: "Entrada", break_start: "Intervalo", break_end: "Retorno", out: "Saída" };
            return (
              <div key={clock.id} className="p-4 border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-black italic uppercase text-[11px] text-primary">{labels[clock.type] || "Ponto"}</p>
                </div>
                <p className="text-[10px] font-bold text-zinc-400">{new Date(clock.timestamp).toLocaleString('pt-BR')}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
