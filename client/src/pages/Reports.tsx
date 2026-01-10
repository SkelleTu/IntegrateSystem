import { useQuery, useMutation } from "@tanstack/react-query";
import { Sale } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar as CalendarIcon, XCircle, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Reports() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: format(new Date(), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: sales, isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales", dateRange.start, dateRange.end],
    queryFn: async () => {
      const res = await fetch(`/api/sales?start=${dateRange.start}T00:00:00.000Z&end=${dateRange.end}T23:59:59.999Z`);
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
    }
  });

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
                          onClick={() => cancelMutation.mutate(sale.id)}
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
    </div>
  );
}