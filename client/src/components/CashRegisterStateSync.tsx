import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Mantém o estado legado do PDV sincronizado com o estado canônico do Caixa.
 * A abertura/fechamento acontece no endpoint /api/cash-control/*; o Cashier
 * ainda possui uma consulta histórica em /api/cash-register/open. Quando a
 * consulta canônica é atualizada, invalidamos somente essa leitura legada,
 * sem criar um segundo estado ou controlador do Caixa.
 */
export default function CashRegisterStateSync() {
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
