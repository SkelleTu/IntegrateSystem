import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { LockKeyhole, Settings2, ShieldCheck, UnlockKeyhole } from "lucide-react";

type CashStatus = { register: { status: string } | null };

export default function CashRegisterOpeningFallback() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [password, setPassword] = useState("");
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const { data: status } = useQuery<CashStatus>({
    queryKey: ["/api/cash-control/status"],
    queryFn: async () => {
      const res = await fetch("/api/cash-control/status");
      if (!res.ok) throw new Error("Não foi possível consultar o Caixa.");
      return res.json();
    },
    refetchInterval: 15000,
    staleTime: 5000,
  });

  const registerOpen = !!status?.register && status.register.status === "open";

  const sync = useCallback(() => {
    if (document.querySelector("h3") && Array.from(document.querySelectorAll("h3")).some(h => h.textContent?.toLowerCase().includes("itens no carrinho"))) {
      setVisible(false);
      return;
    }

    const legacyButton = Array.from(document.querySelectorAll("button")).find(
      (node) => node.textContent?.toLowerCase().includes("iniciar turno")
    ) as HTMLButtonElement | undefined;

    if (!legacyButton) {
      setVisible(false);
      return;
    }

    const card = legacyButton.closest("div[class*='rounded-2xl']") || legacyButton.parentElement?.parentElement;
    if (!card) {
      setVisible(false);
      return;
    }

    legacyButton.dataset.auraLegacyHidden = "true";
    legacyButton.style.display = "none";

    const rect = (card as HTMLElement).getBoundingClientRect();
    setPosition({
      left: Math.max(12, rect.right - 190),
      top: Math.max(76, rect.top + 20),
    });
    setVisible(!registerOpen);

    return () => {
      if (legacyButton.dataset.auraLegacyHidden === "true") {
        legacyButton.style.display = "";
        delete legacyButton.dataset.auraLegacyHidden;
      }
    };
  }, [registerOpen]);

  useEffect(() => {
    let restore: (() => void) | undefined;
    const run = () => {
      restore?.();
      restore = sync();
    };
    const timer = window.setTimeout(run, 100);
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", run);
    window.addEventListener("scroll", run, true);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("resize", run);
      window.removeEventListener("scroll", run, true);
      restore?.();
    };
  }, [sync]);

  const openCash = async () => {
    const numericAmount = Number(amount.replace(",", "."));
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      toast({ title: "Valor inicial inválido", variant: "destructive" });
      return;
    }
    try {
      const res = await apiRequest("POST", "/api/cash-control/open", { openingAmount: numericAmount, password });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Não foi possível abrir o Caixa.");
      await queryClient.invalidateQueries({ queryKey: ["/api/cash-control/status"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/cash-register/open"] });
      setDialogOpen(false);
      setMenuOpen(false);
      setPassword("");
      setAmount("");
      toast({ title: "Caixa aberto com sucesso" });
    } catch (error: any) {
      toast({ title: "Falha na abertura", description: error?.message || "Erro inesperado.", variant: "destructive" });
    }
  };

  if (!visible) return null;

  return (
    <>
      <div className="fixed z-[90]" style={{ left: position.left, top: position.top }}>
        <div className="relative">
          {menuOpen && (
            <div className="absolute right-0 top-11 w-[270px] rounded-2xl border border-white/10 bg-zinc-950/98 backdrop-blur-xl shadow-2xl p-2">
              <div className="px-3 py-2 border-b border-white/5 mb-1">
                <span className="text-white font-black uppercase italic text-[10px] tracking-widest">Opções do Caixa</span>
                <p className="text-white/30 text-[8px] uppercase tracking-widest mt-1">Caixa fechado</p>
              </div>
              <button
                type="button"
                className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-white/90 hover:text-primary hover:bg-white/5 transition-colors"
                onClick={() => { setDialogOpen(true); setMenuOpen(false); }}
              >
                <UnlockKeyhole className="w-4 h-4 text-primary" />
                <span className="text-[9px] font-black uppercase italic tracking-widest">Abertura do Caixa</span>
              </button>
              <div className="px-3 pb-2 pt-1 text-[8px] text-white/25 uppercase tracking-widest flex items-center gap-1.5">
                <LockKeyhole className="w-3 h-3" /> Fechamento indisponível com o caixa fechado
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            aria-label="Opções do Caixa"
            onClick={() => setMenuOpen(value => !value)}
            className="h-9 px-2.5 rounded-xl bg-zinc-950/95 border-white/10 text-white hover:text-primary hover:border-primary/40 shadow-xl backdrop-blur-md gap-1.5"
          >
            <Settings2 className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase italic tracking-widest">Opções do Caixa</span>
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase italic tracking-tighter text-2xl font-black flex items-center gap-2">
              <UnlockKeyhole className="w-5 h-5 text-primary" /> Abertura do Caixa
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Operação administrativa. Use a mesma senha utilizada para entrar na plataforma do estabelecimento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-white/40 text-[9px] font-black uppercase tracking-widest">Saldo inicial / troco</label>
              <Input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" className="h-14 bg-black border-white/10 text-xl text-primary font-black text-center rounded-xl" autoFocus />
            </div>
            <div className="space-y-2">
              <label className="text-white/40 text-[9px] font-black uppercase tracking-widest flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> Senha administrativa</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha de acesso à plataforma" className="h-12 bg-black border-white/10 text-white rounded-xl" onKeyDown={e => e.key === "Enter" && void openCash()} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-white/10 text-white bg-transparent hover:bg-white/5">Cancelar</Button>
            <Button onClick={() => void openCash()} disabled={!password || !amount} className="bg-primary text-black font-black uppercase italic">Abrir Caixa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
