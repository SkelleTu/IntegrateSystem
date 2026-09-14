import { useEffect } from "react";
import { queryClient } from "@tanstack/react-query";

/**
 * Sincronizador transversal do PDV. As operações acontecem no backend;
 * este componente apenas invalida leituras derivadas após respostas de escrita.
 * Não cria estado paralelo nem executa a operação novamente.
 */
export default function CashierDataPersistenceBridge() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
      const input = args[0];
      const init = args[1];
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = String(init?.method || (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET")).toUpperCase();

      const response = await originalFetch(...args);
      const normalized = new URL(url, window.location.origin).pathname;
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
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
