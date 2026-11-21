import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";

type AuthorizationRequest = {
  resolve: (authorized: boolean) => void;
};

export function MasterAuthorizationDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resolveRequest, setResolveRequest] = useState<((authorized: boolean) => void) | null>(null);

  useEffect(() => {
    const handleRequest = (event: Event) => {
      const request = (event as CustomEvent<AuthorizationRequest>).detail;
      setPassword("");
      setError("");
      setResolveRequest(() => request.resolve);
      setOpen(true);
    };

    window.addEventListener("aura:request-master-auth", handleRequest);
    return () => window.removeEventListener("aura:request-master-auth", handleRequest);
  }, []);

  const close = (authorized: boolean) => {
    if (submitting) return;
    setOpen(false);
    setPassword("");
    setError("");
    const resolve = resolveRequest;
    setResolveRequest(null);
    resolve?.(authorized);
  };

  const authorize = async () => {
    if (!password || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/authorize-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ masterPassword: password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Senha master inválida. Verifique e tente novamente.");
        return;
      }

      queryClient.setQueryData(["/api/auth/me"], (current: any) => current ? { ...current, masterAccessAuthorized: true, masterAccessExpiresAt: Number(data.expiresAt || Date.now() + 5 * 60 * 1000) } : current);
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setOpen(false);
      setPassword("");
      const resolve = resolveRequest;
      setResolveRequest(null);
      resolve?.(true);
    } catch {
      setError("Não foi possível validar a senha. Verifique sua conexão e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) close(false); }}>
      <DialogContent className="z-[10000] bg-zinc-950 border-cyan-400/20 text-white shadow-[0_0_60px_rgba(0,229,255,.15)] sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
            <ShieldCheck className="h-6 w-6 text-cyan-300" />
          </div>
          <DialogTitle className="text-xl font-black uppercase italic tracking-tight">
            Autorização da conta master
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Este setor exige autorização temporária. Peça ao responsável pela conta master para inserir a senha abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-3">
          <Label htmlFor="aura-master-password" className="text-zinc-300">Senha da conta master</Label>
          <div className="relative">
            <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
            <Input
              id="aura-master-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") void authorize(); }}
              disabled={submitting}
              placeholder="Digite a senha master"
              className="border-zinc-700 bg-black pl-10 text-white focus-visible:ring-cyan-400"
            />
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" disabled={submitting} onClick={() => close(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void authorize()}
            disabled={!password || submitting}
            className="bg-cyan-400 font-bold text-black hover:bg-cyan-300"
          >
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Validando...</> : "Autorizar acesso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
