import { useEffect, useRef, useState } from "react";
import { queryClient } from "@tanstack/react-query";

/**
 * Sincronizador transversal do PDV. As operações acontecem no backend;
 * este componente apenas invalida leituras derivadas após respostas de escrita.
 * Também garante que cada pagamento em cartão seja classificado como débito ou crédito
 * antes de ser enviado ao servidor, sem criar estado de negócio fora do backend.
 */
export default function CashierDataPersistenceBridge() {
  const [cardPromptOpen, setCardPromptOpen] = useState(false);
  const [pendingCardButton, setPendingCardButton] = useState<HTMLButtonElement | null>(null);
  const cardTypeQueueRef = useRef<Array<"debit" | "credit">>([]);
  const bypassCardPromptRef = useRef(false);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button") as HTMLButtonElement | null;
      if (!button || bypassCardPromptRef.current) return;
      const label = button.textContent?.trim().toUpperCase() || "";
      if (label !== "CART") return;

      event.preventDefault();
      event.stopImmediatePropagation();
      setPendingCardButton(button);
      setCardPromptOpen(true);
    };

    document.addEventListener("click", onDocumentClick, true);

    window.fetch = async (...args) => {
      const input = args[0];
      const init = args[1];
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = String(init?.method || (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET")).toUpperCase();
      const normalized = new URL(url, window.location.origin).pathname;

      let nextArgs = args;
      if (normalized === "/api/sales" && method === "POST" && init?.body && typeof init.body === "string") {
        try {
          const payload = JSON.parse(init.body);
          if (Array.isArray(payload.payments)) {
            let cursor = 0;
            payload.payments = payload.payments.map((payment: any) => {
              if (payment?.method !== "card") return payment;
              const selected = cardTypeQueueRef.current[cursor++];
              return selected
                ? { ...payment, method: selected === "credit" ? "card_credit" : "card_debit" }
                : payment;
            });
            cardTypeQueueRef.current = cardTypeQueueRef.current.slice(cursor);
            nextArgs = [input, { ...init, body: JSON.stringify(payload) }];
          }
        } catch {
          // Mantém a requisição original para que a validação do servidor decida.
        }
      }

      const response = await originalFetch(...nextArgs);
      const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method) && response.ok;

      if (isWrite && normalized === "/api/sales") {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/sales"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/transactions"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/inventory"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/products/cashier-items"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/menu-items-combined"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/cash-register/open"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/cash-registers/history"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/cash-control/status"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/cash-control/reports/history"] }),
        ]);
      }

      if (isWrite && (normalized === "/api/inventory" || normalized.startsWith("/api/inventory/") || normalized.startsWith("/api/products/"))) {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/inventory"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/products/cashier-items"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/menu-items-combined"] }),
        ]);
      }

      if (isWrite && normalized.startsWith("/api/cash-control/")) {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/cash-control/status"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/cash-control/reports/history"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/cash-register/open"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/cash-registers/history"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/transactions"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/sales"] }),
        ]);
      }

      if (isWrite && normalized.startsWith("/api/cash-audit/")) {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/cash-control/status"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/cash-control/reports/history"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/cash-registers/history"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/transactions"] }),
        ]);
      }

      return response;
    };

    return () => {
      document.removeEventListener("click", onDocumentClick, true);
      window.fetch = originalFetch;
    };
  }, []);

  const chooseCardType = (type: "debit" | "credit") => {
    cardTypeQueueRef.current.push(type);
    const button = pendingCardButton;
    setPendingCardButton(null);
    setCardPromptOpen(false);
    if (button) {
      bypassCardPromptRef.current = true;
      button.click();
      window.setTimeout(() => { bypassCardPromptRef.current = false; }, 0);
    }
  };

  return (
    <>
      {cardPromptOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-7 shadow-2xl">
            <div className="mb-6">
              <div className="text-primary text-xs font-black uppercase tracking-[0.25em]">Pagamento em cartão</div>
              <h2 className="mt-2 text-3xl font-black uppercase italic tracking-tighter text-white">Qual é o tipo?</h2>
              <p className="mt-2 text-sm text-white/45">Selecione débito ou crédito. Essa informação será gravada junto à venda e aparecerá nos relatórios.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => chooseCardType("debit")} className="h-20 rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-300 font-black uppercase tracking-widest hover:bg-blue-500/20 transition-colors">Débito</button>
              <button type="button" onClick={() => chooseCardType("credit")} className="h-20 rounded-2xl border border-violet-500/30 bg-violet-500/10 text-violet-300 font-black uppercase tracking-widest hover:bg-violet-500/20 transition-colors">Crédito</button>
            </div>
            <button type="button" onClick={() => { setPendingCardButton(null); setCardPromptOpen(false); }} className="mt-4 w-full rounded-xl py-3 text-xs font-black uppercase tracking-widest text-white/40 hover:bg-white/5 hover:text-white">Cancelar</button>
          </div>
        </div>
      )}
    </>
  );
}
