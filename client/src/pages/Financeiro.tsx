import { useQuery, useMutation } from "@tanstack/react-query";
import { Transaction, insertTransactionSchema } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, DollarSign, PlusCircle, Wallet, LayoutDashboard, Receipt, BarChartHorizontal } from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Financeiro() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [businessType, setBusinessType] = useState<"padaria">("padaria");
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-white text-4xl font-black uppercase italic mb-4 tracking-tighter">Acesso Restrito</h1>
        <p className="text-white/60 max-w-md uppercase text-sm font-bold tracking-widest leading-relaxed">
          Esta área é reservada exclusivamente ao administrador do sistema.
        </p>
        <Button onClick={() => setLocation("/")} className="mt-8 uppercase font-black italic tracking-tighter bg-primary text-black hover:bg-white h-12 px-8">Voltar ao Início</Button>
      </div>
    );
  }

  const { data: sales, isLoading: isLoadingSales } = useQuery<any[]>({
    queryKey: ["/api/sales", dateRange.start, dateRange.end],
    queryFn: async () => {
      const start = new Date(dateRange.start + 'T00:00:00');
      const end = new Date(dateRange.end + 'T23:59:59');
      const res = await fetch(`/api/sales?start=${start.toISOString()}&end=${end.toISOString()}`);
      return res.json();
    },
    refetchInterval: 5000,
  });

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", dateRange.start, dateRange.end, businessType],
    queryFn: async () => {
      const start = new Date(dateRange.start + 'T00:00:00');
      const end = new Date(dateRange.end + 'T23:59:59');
      const url = `/api/transactions?start=${start.toISOString()}&end=${end.toISOString()}&businessType=${businessType}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erro ao buscar transações");
      return res.json();
    },
    refetchInterval: 3000,
  });

  const form = useForm({
    resolver: zodResolver(insertTransactionSchema),
    defaultValues: {
      businessType,
      type: "expense",
      category: "outros",
      description: "",
      amount: 0,
    }
  });

  const transactionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/transactions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Lançamento realizado com sucesso" });
    }
  });

  const { data: inventory = [] } = useQuery<any[]>({
    queryKey: ["/api/inventory"],
  });

  const financialData = useMemo(() => {
    if (!sales || !transactions) return { gross: 0, net: 0, expenses: 0, extraIncome: 0, count: 0, inventoryValue: 0, finalNetBalance: 0 };
    const completedSales = (sales || []).filter(s => s.status === "completed");
    
    const extraIncome = (transactions || []).filter(t => t.type === "income" && t.businessType === businessType).reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const expenses = (transactions || []).filter(t => t.type === "expense" && t.businessType === businessType).reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    const inventoryValue = inventory.reduce((sum, item) => sum + (Number(item.costPrice) * Number(item.quantity)), 0);
    
    const salesGross = completedSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    
    const totalNet = salesGross + extraIncome - expenses;
    const finalNetBalance = salesGross + extraIncome - expenses - inventoryValue;
    return { gross: salesGross + extraIncome, net: totalNet, expenses, extraIncome, count: completedSales.length, inventoryValue, finalNetBalance };
  }, [sales, transactions, inventory, businessType]);

  const onSubmit = (data: any) => {
    transactionMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col lg:flex-row gap-0 overflow-hidden">
      <aside className="w-full lg:w-96 bg-zinc-900/50 border-r border-white/5 p-6 flex flex-col gap-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation("/")}
            className="text-zinc-500 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 uppercase font-black text-[10px] tracking-[0.2em] px-3 py-1">
            Módulo Financeiro
          </Badge>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">Performance Hub</h2>
          <p className="text-xs text-zinc-500 font-medium leading-relaxed">Acompanhamento em tempo real do fluxo de caixa e rentabilidade operacional.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="p-6 rounded-2xl bg-zinc-800/30 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Saldo Líquido</span>
              <DollarSign className={`w-4 h-4 ${financialData.net >= 0 ? 'text-primary' : 'text-red-500'}`} />
            </div>
            <div className={`text-4xl font-black italic tracking-tighter ${financialData.net >= 0 ? 'text-white' : 'text-red-500'}`}>
              R$ {(financialData.net / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-primary/80 tracking-widest">Saldo Líquido Final</span>
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div className={`text-4xl font-black italic tracking-tighter ${financialData.finalNetBalance >= 0 ? 'text-primary' : 'text-red-500'}`}>
              R$ {(financialData.finalNetBalance / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[9px] text-zinc-500 font-medium">Capital de giro real (vendas + entradas - despesas - estoque)</p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-800/20 border border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-500">Valor em Estoque</p>
              <p className="font-bold text-blue-400">R$ {(financialData.inventoryValue / 100).toFixed(2)}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-800/20 border border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-500">Ganhos</p>
              <p className="font-bold">R$ {(financialData.gross / 100).toFixed(2)}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-800/20 border border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-500">Despesas</p>
              <p className="font-bold">R$ {(financialData.expenses / 100).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-white/5">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-white text-black hover:bg-primary hover:text-white font-black uppercase italic h-14 rounded-xl transition-all shadow-xl">
                <PlusCircle className="w-5 h-5 mr-2" /> Novo Lançamento
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-white/10 text-white rounded-2xl p-8">
              <DialogHeader>
                <DialogTitle className="uppercase font-black italic text-2xl tracking-tighter mb-4">Novo Registro</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="businessType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Unidade</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black border-white/10 h-12 rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-zinc-900 border-white/10 text-white font-black italic">
                            <SelectItem value="padaria">Padaria</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Tipo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black border-white/10 h-12 rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-zinc-900 border-white/10 text-white">
                            <SelectItem value="expense">Despesa</SelectItem>
                            <SelectItem value="income">Aporte</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Descrição</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-black border-white/10 h-12 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Valor (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" className="bg-black border-white/10 h-14 rounded-xl font-black text-xl italic" onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value) * 100))} value={field.value ? field.value / 100 : ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full h-14 bg-primary text-black hover:bg-primary/90 uppercase font-black italic text-lg rounded-xl transition-colors" 
                    disabled={transactionMutation.isPending}
                  >
                    {transactionMutation.isPending ? <Loader2 className="animate-spin" /> : "Salvar Registro"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="p-6 border-b border-white/5 flex flex-wrap items-center justify-between gap-4 bg-zinc-900/20">
          <div className="flex items-center gap-4 bg-black/40 p-1.5 rounded-xl border border-white/5">
            <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-transparent text-white text-[11px] font-bold border-0 focus:ring-0 [color-scheme:dark] px-3" />
            <div className="h-4 w-[1px] bg-white/10" />
            <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-transparent text-white text-[11px] font-bold border-0 focus:ring-0 [color-scheme:dark] px-3" />
          </div>
          
          <Select value={businessType} onValueChange={(v: any) => setBusinessType(v)}>
            <SelectTrigger className="w-[180px] bg-black border-white/10 text-white font-black uppercase italic text-[11px] h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10 text-white font-black italic">
              <SelectItem value="padaria">Unidade Padaria</SelectItem>
            </SelectContent>
          </Select>
        </header>

        <div className="flex-1 overflow-hidden p-6">
          <Tabs defaultValue="transactions" className="h-full flex flex-col">
            <TabsList className="bg-zinc-900/50 border border-white/5 self-start p-1 mb-6 rounded-xl h-12">
              <TabsTrigger value="transactions" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase italic text-xs px-6">
                <Receipt className="w-4 h-4 mr-2" /> Movimentações
              </TabsTrigger>
              <TabsTrigger value="sales" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase italic text-xs px-6">
                <LayoutDashboard className="w-4 h-4 mr-2" /> Vendas
              </TabsTrigger>
              <TabsTrigger value="analysis" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase italic text-xs px-6">
                <BarChartHorizontal className="w-4 h-4 mr-2" /> Insights
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="flex-1 bg-zinc-900/20 border border-white/5 rounded-2xl overflow-hidden mt-0">
              <div className="h-full overflow-y-auto">
                <Table>
                  <TableHeader className="bg-black/50 sticky top-0 z-10">
                    <TableRow className="border-white/5">
                      <TableHead className="text-zinc-500 uppercase text-[10px] font-black italic p-6">Data</TableHead>
                      <TableHead className="text-zinc-500 uppercase text-[10px] font-black italic p-6">Descrição</TableHead>
                      <TableHead className="text-zinc-500 uppercase text-[10px] font-black italic p-6">Tipo</TableHead>
                      <TableHead className="text-zinc-500 uppercase text-[10px] font-black italic p-6 text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.map((t) => (
                      <TableRow key={t.id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="text-xs text-zinc-400 p-6">{format(new Date(t.createdAt), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-bold text-sm uppercase p-6">{t.description}</TableCell>
                        <TableCell className="p-6">
                          <Badge variant="outline" className={`text-[9px] border-0 p-0 uppercase font-black ${t.type === 'income' ? 'text-primary' : 'text-red-500'}`}>
                            {t.type === 'income' ? 'Crédito' : 'Débito'}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right p-6 font-black italic ${t.type === 'income' ? 'text-primary' : 'text-red-500'}`}>
                          {t.type === 'income' ? '+' : '-'} R$ {(t.amount / 100).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!transactions || transactions.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-64 text-center text-zinc-500 font-black italic uppercase text-xs">Sem registros</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="sales" className="flex-1 bg-zinc-900/20 border border-white/5 rounded-2xl overflow-hidden mt-0">
              <div className="h-full overflow-y-auto">
                <Table>
                  <TableHeader className="bg-black/50 sticky top-0 z-10">
                    <TableRow className="border-white/5">
                      <TableHead className="text-zinc-500 uppercase text-[10px] font-black italic p-6">Hora</TableHead>
                      <TableHead className="text-zinc-500 uppercase text-[10px] font-black italic p-6">Bruto</TableHead>
                      <TableHead className="text-zinc-500 uppercase text-[10px] font-black italic p-6">Líquido Est.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales?.filter(s => s.status === "completed").map((sale) => (
                      <TableRow key={sale.id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="text-xs text-zinc-400 p-6">{format(new Date(sale.createdAt), "HH:mm:ss")}</TableCell>
                        <TableCell className="font-bold p-6">R$ {(sale.totalAmount / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-primary font-black italic p-6">R$ {((sale.totalAmount * 0.85) / 100).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="flex-1 bg-zinc-900/20 border border-white/5 rounded-2xl p-8 mt-0">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-zinc-500 uppercase font-black italic text-[10px] tracking-widest">Resumo Operacional</h3>
                    <div className="p-6 rounded-2xl bg-black/40 border border-white/5 space-y-6">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-zinc-400">Tickets Gerados</span>
                        <span className="text-xl font-black italic">{financialData.count}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-zinc-400">Ticket Médio</span>
                        <span className="text-xl font-black italic">R$ {financialData.count > 0 ? (financialData.gross / 100 / financialData.count).toFixed(2) : "0,00"}</span>
                      </div>
                    </div>
                  </div>
               </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
