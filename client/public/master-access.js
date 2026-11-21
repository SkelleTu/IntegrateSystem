(() => {
  const originalFetch = window.fetch.bind(window);
  let pendingAuthorization = null;

  async function authorizeWithMaster() {
    if (pendingAuthorization) return pendingAuthorization;
    pendingAuthorization = (async () => {
      const masterPassword = window.prompt(
        "Esta ação não está liberada para esta conta.\n\nSolicite à conta master que informe sua senha para autorizar temporariamente."
      );
      if (!masterPassword) return false;

      try {
        const response = await originalFetch("/api/auth/authorize-master", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ masterPassword }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          window.alert(result.message || "Senha master inválida.");
          return false;
        }
        return true;
      } catch {
        window.alert("Não foi possível validar a senha da conta master. Tente novamente.");
        return false;
      }
    })();
    try {
      return await pendingAuthorization;
    } finally {
      pendingAuthorization = null;
    }
  }

  window.__auraRequestMasterAuthorization = authorizeWithMaster;
  window.fetch = async (input, init) => {
    const request = new Request(input, init);
    const response = await originalFetch(request.clone());
    if (response.status !== 403 || new URL(request.url).pathname === "/api/auth/authorize-master") {
      return response;
    }
    const payload = await response.clone().json().catch(() => null);
    if (payload?.code !== "MASTER_PASSWORD_REQUIRED") return response;
    if (!await authorizeWithMaster()) return response;
    return originalFetch(request.clone());
  };
})();
