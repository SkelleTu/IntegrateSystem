import { useQuery, useMutation } from "@tanstack/react-query";
import { Sale } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar as CalendarIcon, XCircle, ArrowLeft, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
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
import { useAuth } from "@/hooks/use-auth";

export default function Reports() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: format(new Date(), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });

  const [saleToCancel, setSaleToCancel] = useState<number | null>(null);
  const [masterPassword, setMasterPassword] = useState("");

  const { data: sales, isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales", dateRange.start, dateRange.end],
    queryFn: async () => {
      const start = dateRange.start ? `${dateRange.start}T00:00:00.000Z` : "";
      const end = dateRange.end ? `${dateRange.end}T23:59:59.999Z` : "";
      const res = await fetch(`/api/sales?start=${start}&end=${end}`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/sales/${id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({ title: "Venda cancelada com sucesso" });
      setSaleToCancel(null);
      setMasterPassword("");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao cancelar venda", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleCancelClick = () => {
    if (!saleToCancel) return;

    if (user?.username !== "SkelleTu") {
      if (masterPassword !== "Victor.!.1999") {
        toast({
          title: "Acesso Negado",
          description: "Senha da conta master incorreta.",
          variant: "destructive"
        });
        return;
      }
    }

    cancelMutation.mutate(saleToCancel);
  };

  const totalCompleted = sales?.filter(s => s.status === "completed").reduce((sum, s) => sum + s.totalAmount, 0) || 0;

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:text-primary hover:bg-white/5"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-white text-3xl font-black italic uppercase tracking-tighter">Relatórios e Contabilidade</h1>
            <p className="text-white/40 uppercase text-xs font-bold">Gestão financeira e histórico de vendas</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900 p-2 rounded-lg border border-white/10">
          <CalendarIcon className="w-4 h-4 text-primary" />
          <input 
            type="date" 
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="bg-transparent text-white text-sm border-0 focus:ring-0"
          />
          <span className="text-white/40">até</span>
          <input 
            type="date" 
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="bg-transparent text-white text-sm border-0 focus:ring-0"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white/40 text-xs font-bold uppercase">Total em Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-primary text-4xl font-black italic tracking-tighter">
              R$ {(totalCompleted / 100).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900 border-white/10">
        <CardHeader>
          <CardTitle className="text-white uppercase italic tracking-tighter">Histórico de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader className="border-white/10">
                <TableRow>
                  <TableHead className="text-white/40 uppercase text-xs font-bold">Data/Hora</TableHead>
                  <TableHead className="text-white/40 uppercase text-xs font-bold">Valor</TableHead>
                  <TableHead className="text-white/40 uppercase text-xs font-bold">Status</TableHead>
                  <TableHead className="text-white/40 uppercase text-xs font-bold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales?.map((sale) => (
                  <TableRow key={sale.id} className="border-white/5">
                    <TableCell className="text-white font-medium">
                      {format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-white font-bold">
                      R$ {(sale.totalAmount / 100).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sale.status === "completed" ? "default" : "destructive"} className="uppercase text-[10px] font-black italic">
                        {sale.status === "completed" ? "Concluída" : "Cancelada"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {sale.status === "completed" && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => setSaleToCancel(sale.id)}
                          disabled={cancelMutation.isPending}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={saleToCancel !== null} onOpenChange={(open) => !open && setSaleToCancel(null)}>
        <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-6 h-6 text-red-500" />
              <AlertDialogTitle className="uppercase italic font-black tracking-tighter">Confirmar Cancelamento</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-white/60">
              Esta ação irá estornar o estoque e registrar o cancelamento no financeiro. Esta operação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {user?.username !== "SkelleTu" && (
            <div className="py-4 space-y-2">
              <label className="text-xs font-bold uppercase text-white/40">Senha da Conta Master (SkelleTu)</label>
              <Input
                type="password"
                placeholder="Insira a senha master para autorizar"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                className="bg-black border-white/10 text-white focus:border-primary/50 transition-colors"
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setSaleToCancel(null);
                setMasterPassword("");
              }}
              className="bg-transparent border-white/10 text-white hover:bg-white/5"
            >
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelClick}
              disabled={cancelMutation.isPending || (user?.username !== "SkelleTu" && !masterPassword)}
              className="bg-red-600 hover:bg-red-700 text-white border-0"
            >
              {cancelMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Confirmar Cancelamento"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}