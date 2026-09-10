import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MasterPasswordGuardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
}

export function MasterPasswordGuard({ open, onOpenChange, onSuccess, title = "Acesso Restrito" }: MasterPasswordGuardProps) {
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  const handleConfirm = async () => {
    if (!password || isVerifying) return;

    setIsVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-admin-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Senha Incorreta",
          description: data.message || "A senha administrativa informada é inválida.",
          variant: "destructive",
        });
        return;
      }

      onSuccess();
      onOpenChange(false);
      setPassword("");
    } catch (error: any) {
      toast({
        title: "Falha na autorização",
        description: error?.message || "Não foi possível validar a senha administrativa.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(value) => {
      if (!value) setPassword("");
      onOpenChange(value);
    }}>
      <AlertDialogContent className="bg-zinc-950 border-white/10 text-white">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            <AlertDialogTitle className="uppercase italic font-black tracking-tighter text-xl">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-zinc-400">
            Esta operação exige a senha administrativa do estabelecimento, a mesma utilizada no acesso à plataforma.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-zinc-500 tracking-widest flex items-center gap-2">
              <Lock className="w-3 h-3" />
              Senha Administrativa
            </Label>
            <Input
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleConfirm()}
              className="bg-black border-white/5 focus:border-primary/50 text-white h-12"
              autoFocus
              disabled={isVerifying}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => setPassword("")}
            disabled={isVerifying}
            className="bg-transparent border-white/10 text-white hover:bg-white/5"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
            disabled={!password || isVerifying}
            className="bg-primary text-black font-black uppercase italic tracking-tighter disabled:opacity-50"
          >
            {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Autorizar Acesso"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
