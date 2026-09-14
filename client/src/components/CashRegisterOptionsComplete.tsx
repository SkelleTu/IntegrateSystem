import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  UnlockKeyhole,
} from "lucide-react";

type Status = {
  register: any | null;
  summary: any | null;
  pendingReviews?: any[];
};

type Operation =
  | "open"
  | "close"
  | "withdrawal"
  | "replenishment"
  | "config"
  | null;

const money = (cents: number | null | undefined) =>
  `R$ ${((Number(cents || 0)) / 100).toFixed(2).replace(".", ",")}`;

export default function CashRegisterOptionsComplete() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [operation, setOperation] = useState<Operation>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [observation, setObservation] = useState("");
  const [tolerance, setTolerance] = useState("");
  const [tolerancePassword, setTolerancePassword] = useState("");
  const [position, setPosition] = useState({ left: 0, top: 78, ready: false });

  const { data: status } = useQuery<Status>({
    queryKey: ["/api/cash-control/status"],
    queryFn: async () => {
      const response = await fetch("/api/cash-control/status");
      if (!response.ok) throw new Error("Não foi possível consultar o Caixa.");
      return response.json();
    },
    refetchInterval: 15000,
    staleTime: 5000,
  });

  const { data: config } = useQuery<{ toleranceCents: number }>({
    queryKey: ["/api/cash-audit/config"],
    queryFn: async () => {
      const response = await fetch("/api/cash-audit/config");
      if (!response.ok) throw new Error("Não foi possível carregar a tolerância.");
      return response.json();
    },
    staleTime: 10000,
  });

  const registerOpen = Boolean(
    status?.register &&
      status.register.status === "open" &&
      !status.register.closedAt,
  );
  const pendingReviews = status?.pendingReviews ?? [];
  const expectedAmount = Number(status?.summary?.expectedAmount ?? 0);
  const currentTolerance = Number(config?.toleranceCents ?? 0);

  const syncPosition = useCallback(() => {
    const heading = Array.from(document.querySelectorAll("h3")).find((node) =>
      node.textContent?.toLowerCase().includes("itens no carrinho"),
    );
    const target =
      heading?.parentElement ?? document.querySelector("[data-cashier-cart]");

    if (!target) {
      setPosition({ left: Math.max(window.innerWidth - 180, 8), top: 78, ready: true });
      return;
    }

    const rect = target.getBoundingClientRect();
    setPosition({
      left: Math.max(8, rect.right - 154),
      top: Math.max(72, rect.top - 6),
      ready: true,
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(syncPosition, 100);
    window.addEventListener("resize", syncPosition);
    window.addEventListener("scroll", syncPosition, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("scroll", syncPosition, true);
    };
  }, [syncPosition]);

  const reset = () => {
    setAmount("");
    setReason("");
    setPassword("");
    setObservation("");
    setTolerancePassword("");
  };

  const closeDialog = () => {
    setOperation(null);
    reset();
  };

  const run = async () => {
    try {
      if (operation === "open") {
        const value = Number(amount.replace(",", "."));
        if (!Number.isFinite(value) || value < 0 || !password) {
          throw new Error("Informe o valor inicial e a senha administrativa.");
        }
        const response = await apiRequest("POST", "/api/cash-control/open", {
          openingAmount: value,
          password,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Não foi possível abrir o Caixa.");
        toast({ title: "Caixa aberto com sucesso" });
        await queryClient.invalidateQueries({ queryKey: ["/api/cash-control/status"] });
        closeDialog();
        return;
      }

      if (operation === "withdrawal" || operation === "replenishment") {
        const value = Number(amount.replace(",", "."));
        if (!Number.isFinite(value) || value <= 0 || !reason.trim()) {
          throw new Error("Informe valor e motivo.");
        }
        const endpoint =
          operation === "withdrawal"
            ? "/api/cash-control/withdrawal"
            : "/api/cash-control/replenishment";
        const response = await apiRequest("POST", endpoint, {
          amount: value,
          reason: reason.trim(),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Não foi possível concluir a movimentação.");
        toast({ title: operation === "withdrawal" ? "Sangria registrada" : "Suprimento registrado" });
        await queryClient.invalidateQueries({ queryKey: ["/api/cash-control/status"] });
        closeDialog();
        return;
      }

      if (operation === "config") {
        const value = Number(tolerance.replace(",", "."));
        if (!Number.isFinite(value) || value < 0 || !tolerancePassword) {
          throw new Error("Informe a tolerância e a senha administrativa.");
        }
        const response = await apiRequest("POST", "/api/cash-audit/config", {
          tolerance: value,
          password: tolerancePassword,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Não foi possível salvar a tolerância.");
        toast({ title: "Tolerância atualizada" });
        await queryClient.invalidateQueries({ queryKey: ["/api/cash-audit/config"] });
        closeDialog();
        return;
      }

      if (operation === "close") {
        const value = Number(amount.replace(",", "."));
        const registerId = status?.register?.id;
        if (!registerId || !Number.isFinite(value) || value < 0 || !password) {
          throw new Error("Informe o valor físico e a senha administrativa.");
        }
        const response = await apiRequest("POST", "/api/cash-control/close", {
          registerId,
          closingAmount: value,
          password,
          observation: observation.trim() || null,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Não foi possível fechar o Caixa.");
        toast({ title: "Caixa fechado com sucesso" });
        await queryClient.invalidateQueries({ queryKey: ["/api/cash-control/status"] });
        closeDialog();
      }
    } catch (error: any) {
      toast({
        title: "Não foi possível concluir",
        description: error?.message || "Erro inesperado",
        variant: "destructive",
      });
    }
  };

  if (!position.ready) return null;

  return (
    <>
      <div className="fixed z-[90]" style={{ left: position.left, top: position.top }}>
        <div className="relative">
          {menuOpen && (
            <div className="absolute right-0 top-11 w-[310px] max-w-[calc(100vw-16px)] rounded-2xl border border-white/10 bg-zinc-950/98 p-2 shadow-2xl">
              <div className="border-b border-white/5 px-3 py-2">
                <span className="text-[10px] font-black uppercase italic tracking-widest text-white">
                  Opções do Caixa
                </span>
                <div className="mt-2 flex justify-between text-[9px] font-black uppercase">
                  <span className={registerOpen ? "text-emerald-400" : "text-white/40"}>
                    {registerOpen ? "Caixa Aberto" : "Caixa Fechado"}
                  </span>
                  <span className="text-primary">{money(expectedAmount)}</span>
                </div>
              </div>

              <Option
                icon={<UnlockKeyhole className="h-4 w-4" />}
                text="Abertura do Caixa"
                onClick={() => {
                  setOperation("open");
                  setMenuOpen(false);
                }}
                disabled={registerOpen}
              />
              <Option
                icon={<LockKeyhole className="h-4 w-4" />}
                text="Fechamento do Caixa"
                onClick={() => {
                  setOperation("close");
                  setMenuOpen(false);
                }}
                disabled={!registerOpen}
              />
              <Option
                icon={<ArrowDownToLine className="h-4 w-4" />}
                text="Sangria"
                onClick={() => {
                  setOperation("withdrawal");
                  setMenuOpen(false);
                }}
                disabled={!registerOpen}
              />
              <Option
                icon={<ArrowUpFromLine className="h-4 w-4" />}
                text="Suprimento"
                onClick={() => {
                  setOperation("replenishment");
                  setMenuOpen(false);
                }}
                disabled={!registerOpen}
              />

              <div className="mt-1 border-t border-white/5 pt-1">
                <Option
                  icon={<Settings2 className="h-4 w-4" />}
                  text="Configuração administrativa"
                  onClick={() => {
                    setTolerance((currentTolerance / 100).toFixed(2).replace(".", ","));
                    setOperation("config");
                    setMenuOpen(false);
                  }}
                />
              </div>

              {pendingReviews.length > 0 && (
                <button
                  type="button"
                  className="mt-1 flex w-full gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-left"
                  onClick={() => {
                    toast({ title: "Revisão administrativa disponível", description: "A revisão automática continua disponível no módulo de auditoria." });
                    setMenuOpen(false);
                  }}
                >
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-300">
                    Revisões pendentes ({pendingReviews.length})
                  </span>
                </button>
              )}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => setMenuOpen((value) => !value)}
            className="h-9 gap-1.5 rounded-xl border-white/10 bg-zinc-950/95 px-2.5 text-white hover:text-primary"
          >
            <Settings2 className="h-4 w-4" />
            <span className="hidden text-[9px] font-black uppercase italic tracking-widest sm:inline">
              Opções do Caixa
            </span>
          </Button>
        </div>
      </div>

      <Dialog open={Boolean(operation)} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-zinc-950 text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-black uppercase italic">
              {operation === "open" && <UnlockKeyhole className="h-5 w-5 text-primary" />}
              {operation === "close" && <LockKeyhole className="h-5 w-5 text-primary" />}
              {(operation === "withdrawal" || operation === "replenishment") && <Settings2 className="h-5 w-5 text-primary" />}
              {operation === "config" && <ShieldCheck className="h-5 w-5 text-primary" />}
              {operation === "open" && "Abertura do Caixa"}
              {operation === "close" && "Fechamento do Caixa"}
              {operation === "withdrawal" && "Sangria"}
              {operation === "replenishment" && "Suprimento"}
              {operation === "config" && "Configuração Administrativa"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {operation === "close"
                ? `Saldo esperado no Caixa: ${money(expectedAmount)}.`
                : operation === "open"
                  ? "Informe o valor inicial e confirme com a senha administrativa."
                  : "O sistema mantém o estado e os valores do Caixa no servidor."}
            </DialogDescription>
          </DialogHeader>

          {operation === "config" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                  Tolerância vigente
                </span>
                <div className="text-2xl font-black italic text-primary">{money(currentTolerance)}</div>
              </div>
              <div>
                <Label>Nova tolerância (R$)</Label>
                <Input
                  className="mt-2 h-14 bg-black text-center text-2xl font-black text-primary"
                  value={tolerance}
                  onChange={(event) => setTolerance(event.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label>Senha administrativa</Label>
                <Input
                  type="password"
                  className="mt-2 bg-black"
                  value={tolerancePassword}
                  onChange={(event) => setTolerancePassword(event.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>{operation === "close" ? "Valor físico conferido (R$)" : "Valor (R$)"}</Label>
                <Input
                  className="mt-2 h-14 bg-black text-center text-2xl font-black text-primary"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0,00"
                />
              </div>

              {(operation === "withdrawal" || operation === "replenishment") && (
                <div>
                  <Label>Motivo</Label>
                  <Textarea
                    className="mt-2 min-h-24 bg-black"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Informe o motivo da movimentação"
                  />
                </div>
              )}

              {operation === "close" && (
                <div>
                  <Label>Observação administrativa</Label>
                  <Textarea
                    className="mt-2 min-h-20 bg-black"
                    value={observation}
                    onChange={(event) => setObservation(event.target.value)}
                    placeholder="Observação opcional"
                  />
                </div>
              )}

              <div>
                <Label>Senha administrativa</Label>
                <Input
                  type="password"
                  className="mt-2 bg-black"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button type="button" onClick={run}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Option({
  icon,
  text,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  text: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {icon}
      <span>{text}</span>
    </button>
  );
}
