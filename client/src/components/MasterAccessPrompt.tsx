import { useLayoutEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LockKeyhole, Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type MasterAccessRequest = {
  onSuccess: () => void | Promise<void>;
  onCancel: () => void;
  title?: string;
};

declare global {
  interface WindowEventMap {
    "aura:master-access-required": CustomEvent<MasterAccessRequest>;
  }
}

export function MasterAccessPrompt() {
  const { toast } = useToast();
  const [request, setRequest] = useState<MasterAccessRequest | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useLayoutEffect(() => {
    const originalFetch = window.fetch.bind(window);
    const onRequest = (event: Event) => {
      const detail = (event as CustomEvent<MasterAccessRequest>).detail;
      setRequest(detail);
      setPassword("");
    };
    window.addEventListener("aura:master-access-required", onRequest);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestToSend = new Request(input, init);
      const response = await originalFetch(requestToSend.clone());
      if (
        response.status !== 403 ||
        new URL(requestToSend.url).pathname === "/api/auth/authorize-master"
      ) return response;

      const payload = await response.clone().json().catch(() => null) as { code?: string } | null;
      if (payload?.code !== "MASTER_PASSWORD_REQUIRED") return response;

      return await new Promise<Response>((resolve) => {
        const onSuccess = async () => {
          try {
            resolve(await originalFetch(requestToSend.clone()));
          } catch {
            resolve(response);
          }
        };
        const onCancel = () => resolve(response);
        window.dispatchEvent(new CustomEvent<MasterAccessRequest>("aura:master-access-required", {
          detail: { onSuccess, onCancel, title: "Autorização da conta master" },
        }));
      });
    };

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener("aura:master-access-required", onRequest);
    };
  }, []);

  const close = () => {
    if (submitting) return;
    request?.onCancel();
    setRequest(null);
    setPassword("");
  };

  const authorize = async () => {
    if (!password || submitting || !request) return;
    setSubmitting(true);
    try {
      const response = await window.fetch("/api/auth/authorize-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ masterPassword: password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Senha master inválida.");
      const pending = request;
      setRequest(null);
      setPassword("");
      await pending.onSuccess();
      toast({
        title: "Acesso autorizado",
        description: "A ação foi liberada pela conta master nesta sessão por 15 minutos.",
      });
    } catch (error: any) {
      toast({
        title: "Autorização negada",
        description: error?.message || "Não foi possível validar a senha master.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={!!request} onOpenChange={(open) => { if (!open) close(); }}>
      <AlertDialogContent className="bg-zinc-950 border-cyan-400/20 text-white">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
            <AlertDialogTitle className="uppercase font-black tracking-tight">
              {request?.title || "Acesso restrito"}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-zinc-400">
            Esta função não está liberada no escopo da conta subordinada. Para continuar, solicite à conta master que informe sua senha.
            A autorização será temporária e ficará registrada na auditoria.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 py-3">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <LockKeyhole className="w-4 h-4 text-cyan-400" />
            Senha da conta master
          </div>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void authorize(); }}
            placeholder="Digite a senha master"
            autoComplete="current-password"
            autoFocus
            disabled={submitting}
            className="bg-black border-zinc-800 text-white"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting} className="border-white/10 bg-transparent text-white hover:bg-white/5">
            Cancelar
          </AlertDialogCancel>
          <Button onClick={() => void authorize()} disabled={!password || submitting} className="bg-cyan-400 text-black font-black">
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Validando...</> : "Autorizar e continuar"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
