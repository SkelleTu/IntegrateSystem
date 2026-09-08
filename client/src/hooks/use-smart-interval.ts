import { useEffect, useRef } from "react";

/**
 * Substituto inteligente para setInterval.
 * - Pausa automaticamente quando a aba fica oculta (visibilitychange).
 * - Ao retornar para a aba, executa o callback imediatamente e reinicia o intervalo.
 * - Quando `enabled` for false, o intervalo não roda.
 */
export function useSmartInterval(
  callback: () => void,
  delay: number,
  enabled: boolean = true
) {
  const callbackRef = useRef(callback);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sempre usa a versão mais recente do callback sem reiniciar o intervalo
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const start = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => callbackRef.current(), delay);
    };

    const pause = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        pause();
      } else {
        // Executa imediatamente ao voltar para a aba para evitar dados desatualizados
        callbackRef.current();
        start();
      }
    };

    // Inicia apenas se a aba estiver visível
    if (!document.hidden) {
      start();
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      pause();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [delay, enabled]);
}
