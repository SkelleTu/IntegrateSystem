import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Settings2,
  ShieldCheck,
  UnlockKeyhole,
} from "lucide-react";

interface CashRegisterMovement {
  id: number;
  cashRegisterId: number;
  userId: number;
  type: "opening" | "replenishment" | "withdrawal" | "adjustment" | "closing";
  amount: number;
  reason?: string | null;
  createdAt: string;
}

interface CashRegisterSummary {
  register: {
    id: number;
    userId: number;
    openedAt: string | Date;
    closedAt?: string | Date | null;
    openingAmount: number;
    closingAmount?: number | null;
    difference?: number | null;
    status: string;
  };
  openingAmount: number;
  cashSales: number;
  replenishments: number;
  withdrawals: number;
  adjustments: number;
  expectedAmount: number;
  movements: CashRegisterMovement[];
}

interface CashControlStatus {
  register: CashRegisterSummary["register"] | null;
  summary: CashRegisterSummary | null;
  pendingReviews: CashRegisterSummary["register"][];
}

type Operation = "open" | "close" | "withdrawal" | "replenishment" | "review" | null;

function money(cents: number | null | undefined) {
  return `R$ ${((Number(cents || 0)) / 100).toFixed(2).replace(".", ",")}`;
}

export default function CashRegisterOptions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [operation, setOperation] = useState<Operation>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [reviewRegisterId, setReviewRegisterId] = useState<number | null>(null);
  const [anchor, setAnchor] = useState({ left: 0, top: 0, visible: false });
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  const { data: status, isFetching } = useQuery<CashControlStatus>({
    queryKey: ["/api/cash-control/status"],
    queryFn: async () => {
      const res = await fetch("/api/cash-control/status");
      if (!res.ok) throw new Error("Não foi possível consultar o Caixa.");
      return res.json();
    },
    refetchInterval: 15000,
    staleTime: 5000,
  });

  const registerOpen = !!status?.register && status.register.status === "open" && !status.register.closedAt;
  const pendingReviews = status?.pendingReviews || [];

  const syncAnchor = useCallback(() => {
    const headings = Array.from(document.querySelectorAll("h3"));
    const heading = headings.find((node) => node.textContent?.toLowerCase().includes("itens no carrinho"));
    const target = heading?.parentElement || document.querySelector("[data-cashier-cart]");
    if (!target) {
      setAnchor((prev) => ({ ...prev, visible: false }));
      return;
    }
    const rect = target.getBoundingClientRect();
    const buttonWidth = 150;
    setAnchor({
      left: Math.max(8, rect.right - buttonWidth - 4),
      top: Math.max(72, rect.top - 6),
      visible: true,
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(syncAnchor, 80);
    const observer = new MutationObserver(syncAnchor);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", syncAnchor);
    window.addEventListener("scroll", syncAnchor, true);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("resize", syncAnchor);
      window.removeEventListener("scroll", syncAnchor, true);
    };
  }, [syncAnchor]);

  const resetForm = () => {
    setAmount("");
    setReason("");
    setPassword("");
    setReviewRegisterId(null);
  };

  const closeDialog = () => {
    setOperation(null);
    resetForm();
  };

  const runOperation = async () => {
    try {
      const numericAmount = Number(amount.replace(",", "."));
      if (["open", "close", "review", "withdrawal", "replenishment"].includes(operation || "")) {
        if (!Number.isFinite(numericAmount) || numericAmount < 0 || (operation !== "open" && numericAmount <= 0)) {
          toast({ title: "Valor inválido", description: "Informe um valor financeiro válido.", variant: "destructive" });
          return;
        }
      }

      let response: Response;
      if (operation === "open") {
        response = await apiRequest("POST", "/api/cash-control/open", { openingAmount: numericAmount, password });
      } else if (operation === "close") {
        response = await apiRequest("POST", "/api/cash-control/close", { closingAmount: numericAmount, password });
      } else if (operation === "withdrawal") {
        response = await apiRequest("POST", "/api/cash-control/withdrawal", { amount: numericAmount, reason });
      } else if (operation === "replenishment") {
        response = await apiRequest("POST", "/api/cash-control/replenishment", { amount: numericAmount, reason });
      } else if (operation === "review") {
        response = await apiRequest("POST", "/api/cash-control/review", {
          registerId: reviewRegisterId,
          closingAmount: numericAmount,
          password,
        });
      } else {
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "A operação não pôde ser concluída.");

      await queryClient.invalidateQueries({ queryKey: ["/api/cash-control/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });

      const titles: Record<string, string> = {
        open: "Caixa aberto com sucesso",
        close: "Caixa fechado com sucesso",
        withdrawal: "Sangria registrada",
        replenishment: "Suprimento registrado",
        review: "Fechamento automático revisado",
      };
      toast({ title: titles[operation || ""] || "Operação concluída" });
      closeDialog();
    } catch (error: any) {
      toast({
        title: "Não foi possível concluir",
        description: error?.message || "Erro inesperado na operação do Caixa.",
        variant: "destructive",
      });
    }
  };

  const dialogTitle = useMemo(() => ({
    open: "Abertura do Caixa",
    close: "Fechamento do Caixa",
    withdrawal: "Sangria",
    replenishment: "Suprimento",
    review: "Revisão do Fechamento Automático",
  } as Record<string, string>)[operation || ""] || "Opções do Caixa", [operation]);

  const dialogNeedsPassword = operation === "open" || operation === "close" || operation === "review";

  if (!anchor.visible) return null;

  return (
    <>
      <div
        className="fixed z-[90]"
        style={{ left: anchor.left, top: anchor.top }}
      >
        <div className="relative">
          {menuOpen && (
            <div className="absolute right-0 top-11 w-[290px] max-w-[calc(100vw-16px)] rounded-2xl border border-white/10 bg-zinc-950/98 backdrop-blur-xl shadow-2xl p-2 space-y-1">
              <div className="px-3 py-2 border-b border-white/5 mb-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white font-black uppercase italic text-[10px] tracking-widest">Opções do Caixa</span>
                  <button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/cash-control/status"] })} className="text-white/30 hover:text-primary">
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                  <span className={registerOpen ? "text-emerald-400" : "text-white/40"}>{registerOpen ? "Caixa Aberto" : "Caixa Fechado"}</span>
                  {status?.summary && <span className="text-primary">{money(status.summary.expectedAmount)}</span>}
                </div>
              </div>

              <OptionButton
                icon={<UnlockKeyhole className="w-4 h-4" />}
                label="Abertura do Caixa"
                disabled={registerOpen}
                onClick={() => { setOperation("open"); setMenuOpen(false); }}
              />
              <OptionButton
                icon={<LockKeyhole className="w-4 h-4" />}
                label="Fechamento do caixa"
                disabled={!registerOpen}
                onClick={() => { setOperation("close"); setMenuOpen(false); }}
              />
              <OptionButton
                icon={<ArrowDownToLine className="w-4 h-4" />}
                label="Sangria"
                disabled={!registerOpen}
                onClick={() => { setOperation("withdrawal"); setMenuOpen(false); }}
              />
              <OptionButton
                icon={<ArrowUpFromLine className="w-4 h-4" />}
                label="Suprimento"
                disabled={!registerOpen}
                onClick={() => { setOperation("replenishment"); setMenuOpen(false); }}
              />

              {pendingReviews.length > 0 && (
                <div className="pt-1 mt-1 border-t border-white/5">
                  <button
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors"
                    onClick={() => {
                      setReviewRegisterId(pendingReviews[0].id);
                      setOperation("review");
                      setMenuOpen(false);
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-amber-300 font-black uppercase italic text-[9px] tracking-widest">Revisões pendentes</span>
                      <span className="block text-white/40 text-[8px] uppercase mt-0.5">{pendingReviews.length} fechamento(s) automático(s)</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          <Button
            ref={anchorRef}
            type="button"
            variant="outline"
            aria-label="Opções do Caixa"
            onClick={() => setMenuOpen((value) => !value)}
            className="h-9 px-2.5 rounded-xl bg-zinc-950/95 border-white/10 text-white hover:text-primary hover:border-primary/40 shadow-xl backdrop-blur-md gap-1.5"
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline text-[9px] font-black uppercase italic tracking-widest">Opções do Caixa</span>
          </Button>
        </div>
      </div>

      <Dialog open={!!operation} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="uppercase italic tracking-tighter text-2xl font-black flex items-center gap-2">
              {operation === "open" && <UnlockKeyhole className="w-5 h-5 text-primary" />}
              {operation === "close" && <LockKeyhole className="w-5 h-5 text-primary" />}
              {operation === "withdrawal" && <ArrowDownToLine className="w-5 h-5 text-primary" />}
              {operation === "replenishment" && <ArrowUpFromLine className="w-5 h-5 text-primary" />}
              {operation === "review" && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {dialogTitle}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {operation === "open" && "Abra uma nova sessão de Caixa usando a mesma senha administrativa do estabelecimento."}
              {operation === "close" && "Conferência final da sessão atual. O servidor recalcula o saldo esperado antes de confirmar."}
              {operation === "withdrawal" && "Retire dinheiro do Caixa com registro auditável e reflexo imediato no Financeiro."}
              {operation === "replenishment" && "Adicione dinheiro ao Caixa com registro auditável e reflexo imediato no Financeiro."}
              {operation === "review" && "Este Caixa foi encerrado automaticamente às 00:00 e precisa da conferência dos donos."}
            </DialogDescription>
          </DialogHeader>

          {operation === "close" && status?.summary && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <SummaryTile label="Abertura" value={money(status.summary.openingAmount)} />
              <SummaryTile label="Vendas em dinheiro" value={money(status.summary.cashSales)} />
              <SummaryTile label="Suprimentos" value={money(status.summary.replenishments)} />
              <SummaryTile label="Sangrias" value={money(status.summary.withdrawals)} />
              <div className="col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
                <span className="text-white/50 text-[9px] font-black uppercase tracking-widest">Saldo esperado</span>
                <span className="text-primary text-xl font-black italic">{money(status.summary.expectedAmount)}</span>
              </div>
            </div>
          )}

          {operation === "review" && reviewRegisterId && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-300">
                <Clock3 className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest">Sessão #{reviewRegisterId}</span>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">O fechamento ocorreu automaticamente. Informe o valor físico contado agora para concluir a revisão.</p>
            </div>
          )}

          {(operation === "open" || operation === "close" || operation === "review" || operation === "withdrawal" || operation === "replenishment") && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-white/40 text-[9px] font-black uppercase tracking-widest">
                  {operation === "open" ? "Valor inicial / troco" : "Valor"}
                </Label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="h-14 bg-black border-white/10 text-2xl font-black text-primary text-center rounded-xl"
                  autoFocus
                />
              </div>

              {(operation === "withdrawal" || operation === "replenishment") && (
                <div className="space-y-2">
                  <Label className="text-white/40 text-[9px] font-black uppercase tracking-widest">Motivo / observação</Label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={operation === "withdrawal" ? "Ex.: retirada para banco" : "Ex.: reforço de troco"}
                    className="h-12 bg-black border-white/10 text-white rounded-xl"
                  />
                </div>
              )}

              {dialogNeedsPassword && (
                <div className="space-y-2">
                  <Label className="text-white/40 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Senha administrativa
                  </Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="A mesma senha usada para entrar na plataforma"
                    className="h-12 bg-black border-white/10 text-white rounded-xl"
                    onKeyDown={(e) => e.key === "Enter" && void runOperation()}
                  />
                  <p className="text-[8px] text-white/25 uppercase tracking-widest">A senha não é salva pelo Caixa.</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={closeDialog} className="border-white/10 text-white bg-transparent hover:bg-white/5">Cancelar</Button>
            <Button
              onClick={() => void runOperation()}
              disabled={
                !amount ||
                (dialogNeedsPassword && !password) ||
                ((operation === "withdrawal" || operation === "replenishment") && !reason.trim())
              }
              className="bg-primary text-black font-black uppercase italic disabled:opacity-40"
            >
              {operation === "review" ? "Concluir Revisão" : operation === "close" ? "Confirmar Fechamento" : "Confirmar Operação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OptionButton({ icon, label, disabled, onClick }: { icon: React.ReactNode; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-white/80 hover:text-primary hover:bg-white/5 disabled:opacity-25 disabled:pointer-events-none transition-colors"
    >
      <span className="text-primary">{icon}</span>
      <span className="text-[9px] font-black uppercase italic tracking-widest">{label}</span>
    </button>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 p-3">
      <div className="text-[8px] font-black uppercase tracking-widest text-white/30">{label}</div>
      <div className="mt-1 text-sm font-black italic text-white">{value}</div>
    </div>
  );
}
