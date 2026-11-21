let nativeFetch: typeof window.fetch | null = null;
let pendingAuthorization: Promise<boolean> | null = null;

export async function requestMasterAuthorization(): Promise<boolean> {
  if (pendingAuthorization) return pendingAuthorization;

  pendingAuthorization = new Promise<boolean>((resolve) => {
    window.dispatchEvent(new CustomEvent("aura:request-master-auth", {
      detail: { resolve },
    }));
  });

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
