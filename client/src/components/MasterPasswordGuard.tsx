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
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const handleConfirm = () => {
    // If user is already master, we don't even show the dialog usually, 
    // but as a fallback/guard:
    if (user?.username === "SkelleTu" || password === "Victor.!.1999") {
      onSuccess();
      onOpenChange(false);
      setPassword("");
    } else {
      toast({
        title: "Senha Incorreta",
        description: "A senha master informada é inválida.",
        variant: "destructive",
      });
    }
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
            Esta área é restrita. Por favor, insira a senha da conta mestre para continuar.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-zinc-500 tracking-widest flex items-center gap-2">
              <Lock className="w-3 h-3" />
              Senha Master
            </Label>
            <Input
              type="password"
              placeholder="Digite a senha Victor.!.1999"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              className="bg-black border-white/5 focus:border-primary/50 text-white h-12"
              autoFocus
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={() => setPassword("")}
            className="bg-transparent border-white/10 text-white hover:bg-white/5"
          >
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
