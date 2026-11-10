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
import { ShieldAlert, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface MasterPasswordGuardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
}

export function MasterPasswordGuard({ open, onOpenChange, onSuccess, title = "Acesso Restrito" }: MasterPasswordGuardProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const handleConfirm = () => {
    // The authenticated server session is the source of truth.
    // Never keep a second, hard-coded master password in the client.
    if (user?.role === "owner") {
      onSuccess();
      onOpenChange(false);
      return;
    }

    toast({
      title: "Acesso negado",
      description: "Entre com a conta proprietária autorizada para acessar esta área.",
      variant: "destructive",
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-zinc-950 border-white/10 text-white">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            <AlertDialogTitle className="uppercase italic font-black tracking-tighter text-xl">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-zinc-400">
            Esta área é restrita à conta proprietária autenticada. Confirme para continuar.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center gap-3 py-5 text-sm text-zinc-300">
          <Lock className="w-4 h-4 text-primary" />
          <span>Conta atual: {user?.username ?? "não autenticada"}</span>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-primary text-black font-black uppercase italic tracking-tighter"
          >
            Autorizar Acesso
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
