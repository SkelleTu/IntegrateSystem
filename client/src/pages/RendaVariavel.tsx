import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
const V10_URL = "https://invista-pro-v10-kzlv.onrender.com";
const V10_ORIGIN = new URL(V10_URL).origin;
const MAX_STARTUP_MS = 180_000;
type ModuleState = "warming" | "loading-app" | "ready" | "error";
export default function RendaVariavel() {
  const [state, setState] = useState<ModuleState>("warming");
  const [iframeUrl, setIframeUrl] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [backendDegraded, setBackendDegraded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const startedAt = useRef(Date.now());
  const readyReceived = useRef(false);
  const fail = useCallback((message: string) => { setErrorMessage(message); setState("error"); }, []);
  useEffect(() => {
    startedAt.current = Date.now(); readyReceived.current = false;
    setElapsed(0); setErrorMessage(""); setBackendDegraded(false); setIframeUrl(""); setState("warming");
    const elapsedTimer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== V10_ORIGIN || event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type !== "INVISTA_PRO_V10_READY") return;
      readyReceived.current = true; setState("ready");
    };
    window.addEventListener("message", onMessage);
    let canceled = false; let timeout: number | undefined;
    const probe = async () => {
      if (canceled || readyReceived.current) return;
      if (Date.now() - startedAt.current > MAX_STARTUP_MS) {
        fail("A Invista PRO V10 não concluiu a inicialização dentro do tempo esperado. Tente novamente."); return;
      }
      try {
        const response = await fetch("/api/renda-variavel/health", {
          method: "GET", credentials: "include", cache: "no-store",
          headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12_000),
        });
        if (response.status === 401 || response.status === 403) {
          fail("Sua conta não possui autorização para acessar o módulo Renda Variável."); return;
        }
        const payload = await response.json().catch(() => ({}));
        if (payload?.persistenceReady === false) setBackendDegraded(true);
        if (response.ok && payload?.ready === true) {
          setState("loading-app"); setIframeUrl(V10_URL + "/?auraEmbed=1"); return;
        }
      } catch { /* A primeira requisição pode acordar o serviço suspenso do Render. */ }
      if (!canceled) timeout = window.setTimeout(probe, 2500);
    };
    void probe();
    return () => {
      canceled = true; window.clearInterval(elapsedTimer);
      if (timeout) window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
    };
  }, [attempt, fail]);
  useEffect(() => {
    if (state !== "loading-app") return;
    const timeout = window.setTimeout(() => {
      if (!readyReceived.current) fail("O servidor respondeu, mas a interface da Invista PRO V10 não confirmou que está pronta. Tente novamente.");
    }, 45_000);
    return () => window.clearTimeout(timeout);
  }, [state, fail]);
  const retry = () => setAttempt((value) => value + 1);
  const showLoader = state !== "ready";
  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, "0");
  return (
    <section className="relative h-[calc(100vh-5.5rem)] min-h-[520px] w-full overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#05070a] shadow-[0_16px_50px_rgba(0,0,0,.35)]">
      {iframeUrl && <iframe ref={iframeRef} src={iframeUrl} title="Invista PRO V10 — Renda Variável"
        className={state === "ready" ? "absolute inset-0 h-full w-full border-0 bg-[#05070a] opacity-100 transition-opacity duration-500" : "pointer-events-none absolute inset-0 h-full w-full border-0 bg-[#05070a] opacity-0"}
        allow="clipboard-read; clipboard-write; fullscreen" referrerPolicy="strict-origin-when-cross-origin"
        onError={() => fail("Não foi possível carregar a aplicação de investimentos.")} />}
      {showLoader && <div className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden bg-[#05070a] px-5 py-10 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-70" style={{
          backgroundImage: "linear-gradient(rgba(0,229,255,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,.055) 1px, transparent 1px), radial-gradient(circle at 15% 10%, rgba(0,229,255,.18), transparent 38%), radial-gradient(circle at 85% 90%, rgba(147,51,234,.12), transparent 42%)",
          backgroundSize: "42px 42px, 42px 42px, 100% 100%, 100% 100%",
        }} />
        <div className="relative z-10 w-full max-w-xl rounded-3xl border border-cyan-400/20 bg-black/65 p-7 text-center shadow-[0_20px_70px_rgba(0,0,0,.55)] backdrop-blur-2xl sm:p-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_35px_rgba(0,229,255,.14)]"><Activity className="h-8 w-8 text-cyan-300" /></div>
          <p className="text-[10px] font-black uppercase tracking-[.38em] text-cyan-300">Aura System</p>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">Renda Variável</h1>
          <p className="mt-2 text-sm text-zinc-300">{state === "error" ? "Não foi possível concluir a inicialização." : state === "loading-app" ? "Servidor disponível. Preparando a interface de investimentos..." : backendDegraded ? "O servidor respondeu, mas a persistência de dados ainda não está disponível." : "Preparando seu ambiente de investimentos..."}</p>
          <div className="mt-8 flex items-center justify-center gap-3">
            {state === "error" ? <AlertTriangle className="h-5 w-5 text-amber-300" /> : state === "loading-app" ? <Wifi className="h-5 w-5 animate-pulse text-cyan-300" /> : <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />}
            <span className="text-xs font-bold uppercase tracking-[.18em] text-zinc-200">{state === "error" ? "Verificação interrompida" : state === "loading-app" ? "Conectando à aplicação" : backendDegraded ? "Aguardando disponibilidade do banco de dados" : "Aguardando inicialização do Render"}</span>
          </div>
          {state !== "error" && <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-1/3 rounded-full bg-gradient-to-r from-cyan-500 via-cyan-300 to-cyan-500 shadow-[0_0_18px_rgba(0,229,255,.6)] animate-[aura-loading_1.5s_ease-in-out_infinite]" /></div>}
          {state === "error" ? <><p role="alert" className="mt-5 text-sm leading-relaxed text-zinc-300">{errorMessage}</p><Button onClick={retry} className="mt-6 h-11 rounded-xl bg-cyan-400 px-5 font-black text-slate-950 hover:bg-cyan-300"><RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente</Button></> :
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-zinc-400">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-cyan-300" /> Conexão segura</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-cyan-300" /> Dados preservados</span>
              <span className="tabular-nums">Tempo: {minutes}:{seconds}</span>
            </div>}
          <p className="mt-8 border-t border-white/10 pt-4 text-[9px] font-bold uppercase tracking-[.25em] text-zinc-500">Inicialização protegida • Aura System</p>
        </div>
      </div>}
      <style>{'@keyframes aura-loading { 0% { transform: translateX(-110%); } 100% { transform: translateX(330%); } }'}</style>
    </section>
  );
}
