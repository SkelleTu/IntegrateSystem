let nativeFetch: typeof window.fetch | null = null;
let pendingAuthorization: Promise<boolean> | null = null;

export async function requestMasterAuthorization(): Promise<boolean> {
  if (pendingAuthorization) return pendingAuthorization;
  pendingAuthorization = (async () => {
    const password = window.prompt(
      "Esta ação não está liberada para esta conta.\n\nSolicite à conta master que informe sua senha para autorizar temporariamente."
    );
    if (!password) return false;

    const send = nativeFetch || window.fetch.bind(window);
    try {
      const response = await send("/api/auth/authorize-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ masterPassword: password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        window.alert(data.message || "Senha master inválida.");
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

export function installMasterAccessInterceptor(): void {
  if (typeof window === "undefined" || nativeFetch) return;
  nativeFetch = window.fetch.bind(window);
  const send = nativeFetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init);
    const response = await send(request.clone());
    if (response.status !== 403 || new URL(request.url).pathname === "/api/auth/authorize-master") {
      return response;
    }

    const payload = await response.clone().json().catch(() => null) as { code?: string } | null;
    if (payload?.code !== "MASTER_PASSWORD_REQUIRED") return response;

    const authorized = await requestMasterAuthorization();
    if (!authorized) return response;
    return send(request.clone());
  };
}
