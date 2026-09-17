import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, LockKeyhole, RefreshCw, Settings2, ShieldCheck, UnlockKeyhole } from "lucide-react";

type Summary = {
  register: any;
  openingAmount: number;
  cashSales: number;
  cardSales: number;
  pixSales: number;
  otherSales: number;
  replenishments: number;
  withdrawals: number;
  adjustments: number;
  expectedAmount: number;
  movements: any[];
  detailedSales: any[];
  operator?: any;
  toleranceCents?: number;
  review?: any;
};
type Status = { register: any | null; summary: Summary | null; pendingReviews: any[] };
type Action = "open" | "close" | "withdrawal" | "replenishment" | "review" | "config" | null;

const money = (c: number | undefined | null) => `R$ ${((Number(c || 0)) / 100).toFixed(2).replace(".", ",")}`;
const formatDate = (d: any) => {
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? "Data indisponível" : x.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
};

export default function CashRegisterControlCenter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [action, setAction] = useState<Action>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [observation, setObservation] = useState("");
  const [tolerance, setTolerance] = useState("");
  const [tolerancePassword, setTolerancePassword] = useState("");
  const [autoOpenShown, setAutoOpenShown] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);

  const { data: status, isFetching } = useQuery<Status>({
    queryKey: ["/api/cash-control/status"],
    queryFn: async () => {
      const response = await fetch("/api/cash-control/status");
      if (!response.ok) throw new Error("Não foi possível consultar o estado do Caixa.");
      return response.json();
    },
    refetchInterval: 15000,
    staleTime: 5000,
  });

  const { data: config } = useQuery<{ toleranceCents: number }>({
    queryKey: ["/api/cash-audit/config"],
    queryFn: async () => {
      const response = await fetch("/api/cash-audit/config");
      if (!response.ok) throw new Error("Não foi possível carregar a configuração administrativa.");
      return response.json();
    },
    staleTime: 10000,
  });

  const { data: reviewDetail } = useQuery<any>({
    queryKey: ["/api/cash-audit/review", selectedReviewId],
    queryFn: async () => {
      const response = await fetch(`/api/cash-audit/review/${selectedReviewId}`);
      if (!response.ok) throw new Error("Não foi possível carregar a revisão do fechamento.");
      return response.json();
    },
    enabled: !!selectedReviewId && action === "review",
    staleTime: 5000,
  });

  const registerOpen = !!status?.register && status.register.status === "open" && !status.register.closedAt;
  const pendingReviews = Array.isArray(status?.pendingReviews) ? status.pendingReviews : [];
  const currentTolerance = config?.toleranceCents ?? 0;
  const physicalCents = useMemo(() => {
    const normalized = amount.trim().replace(",", ".");
    if (!normalized) return null;
    const n = Number(normalized);
    return Number.isFinite(n) ? Math.round(n * 100) : null;
  }, [amount]);
  const expected = action === "review" ? Number(reviewDetail?.expectedAmount || 0) : Number(status?.summary?.expectedAmount || 0);
  const difference = physicalCents === null ? null : physicalCents - expected;

  useEffect(() => {
    if (status && !registerOpen && !autoOpenShown) {
      setAction("open");
      setAutoOpenShown(true);
    }
    if (registerOpen) setAutoOpenShown(false);
  }, [status, registerOpen, autoOpenShown]);

  const reset = () => {
    setAmount("");
    setReason("");
    setPassword("");
    setObservation("");
    setTolerancePassword("");
    setSelectedReviewId(null);
  };

  const closeAction = () => {
    setAction(null);
    reset();
  };

  const run = async () => {
    try {
      if (action === "open") {
        const n = Number(amount.replace(",", "."));
        if (!Number.isFinite(n) || n < 0 || !password) throw new Error("Informe o saldo inicial e a senha administrativa.");
        const response = await apiRequest("POST", "/api/cash-control/open", { openingAmount: n, password });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Não foi possível abrir o Caixa.");
        toast({ title: "Caixa aberto com sucesso" });
        await queryClient.invalidateQueries({ queryKey: ["/api/cash-control/status"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/cash-register/open"] });
        closeAction();
        return;
      }

      if (action === "withdrawal" || action === "replenishment") {
        const n = Number(amount.replace(",", "."));
        if (!Number.isFinite(n) || n <= 0 || !reason.trim()) throw new Error("Informe um valor válido e o motivo da movimentação.");
        const endpoint = action === "withdrawal" ? "/api/cash-control/withdrawal" : "/api/cash-control/replenishment";
        const response = await apiRequest("POST", endpoint, { amount: n, reason: reason.trim() });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Não foi possível registrar a movimentação.");
        toast({ title: action === "withdrawal" ? "Sangria registrada" : "Suprimento registrado" });
        await queryClient.invalidateQueries({ queryKey: ["/api/cash-control/status"] });
        closeAction();
        return;
      }

      if (action === "config") {
        const n = Number(tolerance.replace(",", "."));
        if (!Number.isFinite(n) || n < 0 || !tolerancePassword) throw new Error("Informe a tolerância e a senha administrativa.");
        const response = await apiRequest("POST", "/api/cash-audit/config", { tolerance: n, password: tolerancePassword });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Não foi possível salvar a tolerância.");
        toast({ title: "Tolerância atualizada" });
        await queryClient.invalidateQueries({ queryKey: ["/api/cash-audit/config"] });
        closeAction();
        return;
      }

      if (action === "close" || action === "review") {
        const n = Number(amount.replace(",", "."));
        const registerId = action === "review" ? selectedReviewId : status?.register?.id;
        if (!Number.isFinite(n) || n < 0 || !password || !registerId) throw new Error("Informe o valor físico e a senha administrativa.");
        const endpoint = action === "review" ? "/api/cash-audit/review" : "/api/cash-control/close";
        const response = await apiRequest("POST", endpoint, {
          registerId,
          closingAmount: n,
          password,
          observation: observation.trim() || null,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Não foi possível concluir o fechamento.");
        toast({ title: action === "review" ? "Revisão concluída" : "Caixa fechado com sucesso" });
        await queryClient.invalidateQueries({ queryKey: ["/api/cash-control/status"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/cash-register/open"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/cash-registers/history"] });
        closeAction();
      }
    } catch (error: any) {
      toast({ title: "Não foi possível concluir", description: error?.message || "Erro inesperado.", variant: "destructive" });
    }
  };

  const openReview = (id: number) => {
    setSelectedReviewId(id);
    setAction("review");
    setMenuOpen(false);
    setAmount("");
    setPassword("");
    setObservation("");
  };

  const actionTitle = action === "open" ? "Abertura do Caixa" : action === "close" ? "Fechamento do Caixa" : action === "withdrawal" ? "Sangria" : action === "replenishment" ? "Suprimento" : action === "review" ? "Revisão de Fechamento" : "Configuração Administrativa";
  const actionDescription = action === "open"
    ? "Abra o caixa nesta sessão. O estado fica gravado no servidor e será reaproveitado quando o PDV for aberto novamente."
    : action === "close"
      ? "Confira o valor esperado e informe somente a contagem física da gaveta."
      : action === "review"
        ? "Este Caixa foi encerrado automaticamente e aguarda conferência administrativa."
        : action === "config"
          ? "Defina a diferença máxima considerada dentro da tolerância administrativa."
          : "A movimentação fica vinculada ao Caixa aberto e entra no histórico financeiro.";

  return (
    <>
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <Button
          type="button"
          variant="outline"
          onClick={() => setMenuOpen(true)}
          className="fixed right-4 top-[78px] z-[95] h-10 px-3 rounded-xl bg-zinc-950/95 border-white/10 text-white hover:text-primary hover:border-primary/30 shadow-xl backdrop-blur-md"
        >
          <Settings2 className="w-4 h-4 mr-2" />
          <span className="text-[9px] font-black uppercase italic tracking-widest">Opções do Caixa</span>
        </Button>
        <DialogContent className="z-[9990] bg-zinc-950 border-white/10 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="uppercase italic text-2xl font-black flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" /> Opções do Caixa
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Estado atual: <span className={registerOpen ? "text-emerald-400 font-black" : "text-white/50 font-black"}>{registerOpen ? "CAIXA ABERTO" : "CAIXA FECHADO"}</span>
              {isFetching && <RefreshCw className="inline ml-2 w-3 h-3 animate-spin" />}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Button variant="outline" disabled={registerOpen} className="justify-start h-14 bg-white/5 border-white/10 text-white" onClick={() => { setAction("open"); setMenuOpen(false); }}>
              <UnlockKeyhole className="w-4 h-4 mr-3 text-primary" />
              <span className="font-black uppercase italic text-xs tracking-widest">Abertura do Caixa</span>
            </Button>
            <Button variant="outline" disabled={!registerOpen} className="justify-start h-14 bg-white/5 border-white/10 text-white" onClick={() => { setAction("close"); setMenuOpen(false); }}>
              <LockKeyhole className="w-4 h-4 mr-3 text-primary" />
              <span className="font-black uppercase italic text-xs tracking-widest">Fechamento do Caixa</span>
            </Button>
            <Button variant="outline" disabled={!registerOpen} className="justify-start h-14 bg-white/5 border-white/10 text-white" onClick={() => { setAction("withdrawal"); setMenuOpen(false); }}>
              <ArrowDownToLine className="w-4 h-4 mr-3 text-red-400" />
              <span className="font-black uppercase italic text-xs tracking-widest">Sangria</span>
            </Button>
            <Button variant="outline" disabled={!registerOpen} className="justify-start h-14 bg-white/5 border-white/10 text-white" onClick={() => { setAction("replenishment"); setMenuOpen(false); }}>
              <ArrowUpFromLine className="w-4 h-4 mr-3 text-emerald-400" />
              <span className="font-black uppercase italic text-xs tracking-widest">Suprimento</span>
            </Button>
            <Button variant="outline" className="justify-start h-14 bg-white/5 border-white/10 text-white" onClick={() => { setTolerance((currentTolerance / 100).toFixed(2).replace(".", ",")); setAction("config"); setMenuOpen(false); }}>
              <ShieldCheck className="w-4 h-4 mr-3 text-primary" />
              <span className="font-black uppercase italic text-xs tracking-widest">Configuração administrativa</span>
            </Button>
          </div>

          {pendingReviews.length > 0 && (
            <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex items-center gap-2 text-amber-300 text-[10px] font-black uppercase tracking-widest mb-2">
                <AlertTriangle className="w-4 h-4" /> Revisões pendentes ({pendingReviews.length})
              </div>
              <div className="grid gap-2 max-h-44 overflow-y-auto pr-1">
                {pendingReviews.map((review: any) => (
                  <Button key={review.id} variant="outline" className="justify-between bg-black/30 border-amber-500/10 text-white h-12" onClick={() => openReview(review.id)}>
                    <span className="text-left">
                      <span className="block text-[9px] font-black uppercase tracking-widest">Caixa #{review.id}</span>
                      <span className="block text-[8px] text-white/40 uppercase">Encerrado {formatDate(review.closedAt)}</span>
                    </span>
                    <span className="text-[9px] font-black uppercase text-amber-300">Ver detalhes</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!action} onOpenChange={(open) => !open && closeAction()}>
        <DialogContent className="z-[9999] bg-zinc-950 border-white/10 text-white sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="uppercase italic text-2xl font-black flex items-center gap-2">
              {action === "review" ? <AlertTriangle className="w-5 h-5 text-amber-400" /> : action === "open" ? <UnlockKeyhole className="w-5 h-5 text-primary" /> : <Settings2 className="w-5 h-5 text-primary" />}
              {actionTitle}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">{actionDescription}</DialogDescription>
          </DialogHeader>

          {action === "close" || action === "review" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <div><span className="text-[8px] uppercase tracking-widest text-white/35">Abertura</span><div className="font-black text-lg">{money(action === "review" ? reviewDetail?.openingAmount : status?.summary?.openingAmount)}</div></div>
                <div><span className="text-[8px] uppercase tracking-widest text-white/35">Dinheiro vendido</span><div className="font-black text-lg text-emerald-300">{money(action === "review" ? reviewDetail?.cashSales : status?.summary?.cashSales)}</div></div>
                <div><span className="text-[8px] uppercase tracking-widest text-white/35">Suprimentos</span><div className="font-black text-lg">{money(action === "review" ? reviewDetail?.replenishments : status?.summary?.replenishments)}</div></div>
                <div><span className="text-[8px] uppercase tracking-widest text-white/35">Sangrias</span><div className="font-black text-lg">{money(action === "review" ? reviewDetail?.withdrawals : status?.summary?.withdrawals)}</div></div>
                <div className="col-span-2 rounded-lg border border-primary/20 bg-primary/5 p-3"><span className="text-[8px] uppercase tracking-widest text-primary/60">Valor esperado</span><div className="text-2xl font-black italic text-primary">{money(expected)}</div></div>
              </div>

              <div>
                <Label>Valor físico contado (R$)</Label>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" className="mt-2 h-14 bg-black border-white/10 text-2xl text-primary font-black text-center" autoFocus={!reviewDetail || !!action} />
              </div>
              {difference !== null && (
                <div className={`rounded-xl border p-4 ${difference === 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                  <div className="flex justify-between items-center"><span className="text-[9px] uppercase tracking-widest font-black text-white/40">Diferença</span><span className="text-xl font-black">{money(difference)}</span></div>
                </div>
              )}
              <div>
                <Label>Senha administrativa</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 bg-black border-white/10" />
              </div>
              <div>
                <Label>Observação</Label>
                <Textarea value={observation} onChange={(e) => setObservation(e.target.value)} className="mt-2 bg-black border-white/10 min-h-24" placeholder="Opcional" />
              </div>
            </div>
          ) : action === "open" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><span className="text-[8px] uppercase tracking-widest text-white/40">Sessão atual</span><div className="text-lg font-black text-primary">Nenhum Caixa aberto</div></div>
              <div><Label>Saldo inicial / troco (R$)</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" className="mt-2 h-14 bg-black border-white/10 text-2xl text-primary font-black text-center" autoFocus /></div>
              <div><Label>Senha administrativa</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void run()} className="mt-2 bg-black border-white/10" /></div>
            </div>
          ) : action === "withdrawal" || action === "replenishment" ? (
            <div className="space-y-4">
              <div><Label>Valor (R$)</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" className="mt-2 h-14 bg-black border-white/10 text-2xl text-primary font-black text-center" autoFocus /></div>
              <div><Label>Motivo obrigatório</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="mt-2 bg-black border-white/10 min-h-24" placeholder={action === "withdrawal" ? "Ex.: pagamento de fornecedor" : "Ex.: reforço de troco"} /></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><span className="text-[8px] uppercase tracking-widest text-white/40">Tolerância vigente</span><div className="text-2xl font-black text-primary">{money(currentTolerance)}</div></div>
              <div><Label>Nova tolerância (R$)</Label><Input value={tolerance} onChange={(e) => setTolerance(e.target.value)} inputMode="decimal" placeholder="0,00" className="mt-2 h-14 bg-black border-white/10 text-2xl text-primary font-black text-center" /></div>
              <div><Label>Senha administrativa</Label><Input type="password" value={tolerancePassword} onChange={(e) => setTolerancePassword(e.target.value)} className="mt-2 bg-black border-white/10" /></div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeAction} className="border-white/10 text-white">Cancelar</Button>
            <Button onClick={() => void run()} className="bg-primary text-black font-black uppercase italic" disabled={action === "open" ? !amount || !password : action === "config" ? !tolerance || !tolerancePassword : action === "withdrawal" || action === "replenishment" ? !amount || !reason.trim() : !amount || !password}>
              {action === "open" ? "Abrir Caixa" : action === "close" ? "Fechar Caixa" : action === "review" ? "Concluir Revisão" : action === "withdrawal" ? "Registrar Sangria" : action === "replenishment" ? "Registrar Suprimento" : "Salvar Tolerância"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
