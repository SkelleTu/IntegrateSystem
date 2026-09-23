type RuntimeData = Record<string, unknown>;

declare global {
  interface Window {
    __AURA_RUNTIME_INSTALLED__?: boolean;
  }
}

const ENDPOINT = "/api/runtime/event";
const startedAt = Date.now();
let sequence = 0;
let heartbeatTimer: number | undefined;
let lastRoute = window.location.href;
let pendingRequests = 0;

function trim(value: unknown, max = 300): string {
  const text = String(value ?? "");
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function safeUrl(input: string): string {
  try {
    const url = new URL(input, window.location.href);
    return url.pathname + (url.search ? "[query]" : "");
  } catch {
    return trim(input, 300);
  }
}

function elementDescriptor(element: Element | null): RuntimeData {
  if (!element) return {};

  const html = element as HTMLElement;
  const attrs: RuntimeData = {
    tag: element.tagName.toLowerCase(),
    id: html.id || undefined,
    role: html.getAttribute("role") || undefined,
    ariaLabel: html.getAttribute("aria-label") || undefined,
    name: html.getAttribute("name") || undefined,
    type: html.getAttribute("type") || undefined,
    testId: html.getAttribute("data-testid") || undefined,
    href: html.getAttribute("href")
      ? safeUrl(html.getAttribute("href") || "")
      : undefined,
  };

  return Object.fromEntries(
    Object.entries(attrs).filter(([, value]) => value !== undefined && value !== ""),
  );
}

function postEvent(event: string, message: string, data: RuntimeData = {}) {
  sequence += 1;

  const payload = {
    event,
    message,
    data: {
      source: "renderer",
      sequence,
      elapsedMs: Date.now() - startedAt,
      route: window.location.pathname,
      url: safeUrl(window.location.href),
      ...data,
    },
  };

  try {
    const body = JSON.stringify(payload);

    if (navigator.sendBeacon && event === "renderer-beforeunload") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(ENDPOINT, blob);
      return;
    }

    void window.fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: body.length < 60_000,
    }).catch(() => {});
  } catch {
    // Observability must never interfere with the product.
  }
}

function routeChanged(source: string) {
  const nextRoute = window.location.href;
  if (nextRoute === lastRoute) return;

  const previous = lastRoute;
  lastRoute = nextRoute;

  postEvent("route-change", "Navegação da interface detectada", {
    source,
    from: safeUrl(previous),
    to: safeUrl(nextRoute),
  });
}

function installHistoryTracking() {
  const historyAny = window.history as History & {
    __auraPushState?: History["pushState"];
    __auraReplaceState?: History["replaceState"];
  };

  if (!historyAny.__auraPushState) {
    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    historyAny.__auraPushState = originalPushState;
    historyAny.__auraReplaceState = originalReplaceState;

    window.history.pushState = function (...args) {
      const result = originalPushState(...args);
      routeChanged("history.pushState");
      return result;
    };

    window.history.replaceState = function (...args) {
      const result = originalReplaceState(...args);
      routeChanged("history.replaceState");
      return result;
    };
  }

  window.addEventListener("popstate", () => routeChanged("popstate"));
  window.addEventListener("hashchange", () => routeChanged("hashchange"));
}

function installFetchTracking() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (input, init) {
    const started = performance.now();
    const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    const rawUrl = typeof input === "string" ? input : input.url;
    pendingRequests += 1;

    postEvent("network-request-start", `${method} ${safeUrl(rawUrl)}`, {
      method,
      url: safeUrl(rawUrl),
      pendingRequests,
    });

    try {
      const response = await originalFetch(input, init);

      postEvent(
        response.ok ? "network-request-success" : "network-request-http-error",
        `${method} ${safeUrl(rawUrl)} ${response.status}`,
        {
          method,
          url: safeUrl(rawUrl),
          status: response.status,
          ok: response.ok,
          durationMs: Math.round(performance.now() - started),
          pendingRequests: Math.max(0, pendingRequests - 1),
        },
      );

      return response;
    } catch (error) {
      postEvent("network-request-failed", `${method} ${safeUrl(rawUrl)} falhou`, {
        method,
        url: safeUrl(rawUrl),
        durationMs: Math.round(performance.now() - started),
        pendingRequests: Math.max(0, pendingRequests - 1),
        error: error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : { value: String(error) },
      });

      throw error;
    } finally {
      pendingRequests = Math.max(0, pendingRequests - 1);
    }
  };
}

function installDomTracking() {
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element
      ? event.target.closest("button,a,[role='button'],input,select,textarea,[data-testid]")
      : null;

    if (!target) return;

    postEvent("ui-click", "Interação de clique detectada", {
      element: elementDescriptor(target),
    });
  }, true);

  document.addEventListener("change", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    postEvent("ui-change", "Alteração de campo detectada", {
      element: elementDescriptor(target),
      // Intencionalmente não registramos o valor digitado.
    });
  }, true);

  document.addEventListener("submit", (event) => {
    const target = event.target instanceof Element ? event.target : null;

    postEvent("ui-submit", "Envio de formulário detectado", {
      element: elementDescriptor(target),
    });
  }, true);

  document.addEventListener("focusin", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    postEvent("ui-focus", "Foco de elemento detectado", {
      element: elementDescriptor(target),
    });
  }, true);
}

function installErrorTracking() {
  window.addEventListener("error", (event) => {
    postEvent("renderer-error", "Erro JavaScript no renderer", {
      error: {
        name: event.error?.name || "ErrorEvent",
        message: trim(event.message, 2000),
        stack: trim(event.error?.stack, 6000),
      },
      sourceFile: safeUrl(event.filename || ""),
      line: event.lineno,
      column: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    postEvent("renderer-unhandled-rejection", "Promise rejeitada sem tratamento", {
      reason: reason instanceof Error
        ? { name: reason.name, message: reason.message, stack: reason.stack }
        : { value: trim(reason, 2000) },
    });
  });
}

function startHeartbeat() {
  heartbeatTimer = window.setInterval(() => {
    postEvent("renderer-heartbeat", "Renderer ativo", {
      uptimeMs: Date.now() - startedAt,
      pendingRequests,
      visibilityState: document.visibilityState,
    });
  }, 1000);
}

export function installAuraRuntimeMonitor() {
  if (window.__AURA_RUNTIME_INSTALLED__) return;
  window.__AURA_RUNTIME_INSTALLED__ = true;

  installHistoryTracking();
  installFetchTracking();
  installDomTracking();
  installErrorTracking();
  startHeartbeat();

  postEvent("renderer-monitor-start", "Monitor do renderer iniciado", {
    phase: "renderer",
    progress: 100,
  });

  window.addEventListener("load", () => {
    postEvent("renderer-load-complete", "DOM da interface terminou de carregar", {
      phase: "renderer",
      progress: 100,
    });
  });

  window.addEventListener("beforeunload", () => {
    if (heartbeatTimer) {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = undefined;
    }

    postEvent("renderer-beforeunload", "Renderer encerrando", {
      phase: "shutdown",
      progress: 100,
    });
  });
}
