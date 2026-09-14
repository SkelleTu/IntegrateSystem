import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Mantém a leitura histórica do PDV sincronizada com o estado canônico do Caixa.
 * Abertura/fechamento continuam tendo um único dono no backend:
 * /api/cash-control/*. Este componente apenas invalida a leitura legada ativa
 * depois que o estado canônico é atualizado.
 */
export default function CashRegisterStateSyncBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      const key = event?.query?.queryKey;
      if (!Array.isArray(key) || key[0] !== "/api/cash-control/status") return;

      void queryClient.invalidateQueries({
        queryKey: ["/api/cash-register/open"],
        refetchType: "active",
      });
    });

    return unsubscribe;
  }, [queryClient]);

  return null;
}
