import { useState, useEffect } from "react";

/**
 * Detecta se a aba/página está visível para o usuário.
 * Retorna `true` quando a aba está em foco, `false` quando minimizada ou em segundo plano.
 */
export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(!document.hidden);

  useEffect(() => {
    const handleChange = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleChange);
    return () => document.removeEventListener("visibilitychange", handleChange);
  }, []);

  return isVisible;
}
