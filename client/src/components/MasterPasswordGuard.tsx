import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldAlert, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface MasterPasswordGuardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
}

export function MasterPasswordGuard({
  open,
  onOpenChange,
  onSuccess,
  title = "Acesso Restrito",
}: MasterPasswordGuardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [masterPassword, setMasterPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMasterAccount =
    String(user?.role || "").trim().toLowerCase() === "owner" ||
    String(user?.username || "").trim().toLowerCase() === "skelletu";

  // Master accounts must never see the authorization dialog.
  // Release the pending action as soon as the authenticated role is available.
  useEffect(() => {
    if (open && isMasterAccount) {
      onSuccess();
      onOpenChange(false);
    }
  }, [open, isMasterAccount, onSuccess, onOpenChange]);

  const handleConfirm = async () => {
    if (isMasterAccount) {
      onSuccess();
      onOpenChange(false);
      return;
    }

    if (!masterPassword) {
      toast({
        title: "Senha obrigatória",
        description: "Informe a senha da conta master para continuar.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/authorize-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ masterPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Senha master inválida.");
      }

      setMasterPassword("");
      onOpenChange(false);
      onSuccess();

      toast({
        title: "Acesso autorizado",
        description: "Acesso master temporário concedido para esta sessão.",
      });
    } catch (error: any) {
      toast({
        title: "Acesso negado",
        description: error?.message || "Não foi possível autorizar o acesso.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isMasterAccount) return null;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSubmitting) {
          setMasterPassword("");
        }
        onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent className="bg-zinc-950 border-white/10 text-white">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            <AlertDialogTitle className="uppercase italic font-black tracking-tighter text-xl">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-zinc-400">
            Esta função é restrita à conta master. Contas inferiores devem confirmar a senha da conta master para continuar.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!isMasterAccount && (
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Lock className="w-4 h-4 text-primary" />
              <span>Conta atual: {user?.username ?? "não autenticada"}</span>
            </div>
            <Input
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isSubmitting) {
                  void handleConfirm();
                }
              }}
              placeholder="Senha da conta master"
              autoComplete="current-password"
              autoFocus
              disabled={isSubmitting}
              className="bg-black border-zinc-800 text-white"
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel
            className="bg-transparent border-white/10 text-white hover:bg-white/5"
            disabled={isSubmitting}
          >
            Cancelar
          </AlertDialogCancel>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isSubmitting || (!isMasterAccount && !masterPassword)}
            className="bg-primary text-black font-black uppercase italic tracking-tighter"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validando...
              </>
            ) : (
              "Autorizar Acesso"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
