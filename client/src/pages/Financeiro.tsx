import { useQuery, useMutation } from "@tanstack/react-query";
import { Transaction, insertTransactionSchema } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, DollarSign, PlusCircle, Wallet, LayoutDashboard, Receipt, BarChartHorizontal, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo, useCallback } from "react";
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
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Financeiro() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [businessType, setBusinessType] = useState<string>("outro");
  const businessToday = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [dateRange, setDateRange] = useState({ start: businessToday, end: businessToday });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const dateRangeValid = dateRange.start <= dateRange.end;

  if (user?.role !== "admin" && user?.role !== "owner" && user?.masterAccessAuthorized !== true) {
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
      const start = new Date(dateRange.start + 'T00:00:00-03:00');
      const end = new Date(dateRange.end + 'T23:59:59.999-03:00');
      const res = await fetch(`/api/sales?start=${start.toISOString()}&end=${end.toISOString()}`);
      return res.json();
    },
    enabled: dateRangeValid,
    refetchInterval: 30000,
  });

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", dateRange.start, dateRange.end, businessType],
    queryFn: async () => {
      const start = new Date(dateRange.start + 'T00:00:00-03:00');
      const end = new Date(dateRange.end + 'T23:59:59.999-03:00');
      const url = `/api/transactions?start=${start.toISOString()}&end=${end.toISOString()}&businessType=${businessType}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erro ao buscar transações");
      return res.json();
    },
    enabled: dateRangeValid,
    refetchInterval: 15000,
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
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erro ao salvar transação");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      setIsDialogOpen(false);
      form.reset();
      setAmountDisplay("");
      toast({ title: "Lançamento realizado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao realizar lançamento", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/transactions/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Lançamento excluído com sucesso" });
    }
  });

  const formatCurrency = useCallback((value: string) => {
    const numbers = value.replace(/\D/g, '');
    const cents = parseInt(numbers || '0', 10);
    const reais = cents / 100;
    return reais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, []);

  const [amountDisplay, setAmountDisplay] = useState("");

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, fieldOnChange: (value: number) => void) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const cents = parseInt(rawValue || '0', 10);
    setAmountDisplay(formatCurrency(rawValue));
    // A schema de transação no backend não tem transform * 100, então enviamos centavos
    fieldOnChange(cents);
  };


  const { data: cogsData } = useQuery<any>({
    queryKey: ["/api/financial/cogs", dateRange.start, dateRange.end],
    queryFn: async () => { const res=await fetch(`/api/financial/cogs?start=${dateRange.start}&end=${dateRange.end}`); if(!res.ok) throw new Error("Erro ao calcular lucro bruto"); return res.json(); },
    enabled: dateRangeValid,
    refetchInterval: 30000,
  });
  const { data: inventory = [] } = useQuery<any[]>({
    queryKey: ["/api/inventory"],
  });

  const chartData = useMemo(() => {
    const byDay = new Map<string, { day: string; sales: number; income: number; expenses: number }>();
    (sales || []).filter(s => s.status === "completed").forEach(s => {
      const d = format(new Date(s.createdAt), "dd/MM");
      const row = byDay.get(d) || { day: d, sales: 0, income: 0, expenses: 0 };
      row.sales += Number(s.totalAmount || 0) / 100;
      byDay.set(d, row);
    });
    (transactions || []).forEach(t => {
      const d = format(new Date(t.createdAt), "dd/MM");
      const row = byDay.get(d) || { day: d, sales: 0, income: 0, expenses: 0 };
      if (t.type === "income" && t.category !== "vendas") row.income += Number(t.amount || 0) / 100;
      if (t.type === "expense") row.expenses += Number(t.amount || 0) / 100;
      byDay.set(d, row);
    });
    return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [sales, transactions]);

  const expenseComposition = useMemo(() => {
    const map = new Map<string, number>();
    (transactions || []).filter(t => t.type === "expense").forEach(t => {
      const label = String(t.category || "outros").replace(/^./, x => x.toUpperCase());
      map.set(label, (map.get(label) || 0) + Number(t.amount || 0) / 100);
    });
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [transactions]);

  const financialData = useMemo(() => {
    if (!sales || !transactions) return { gross: 0, net: 0, expenses: 0, extraIncome: 0, count: 0, inventoryValue: 0, finalNetBalance: 0 };
    const completedSales = (sales || []).filter(s => s.status === "completed");
    
    const toFiniteNumber = (value: unknown) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    };
    const extraIncome = (transactions || []).filter(t => t.type === "income" && t.category !== "vendas" && t.businessType === businessType).reduce((sum, t) => sum + toFiniteNumber(t.amount), 0);
    const expenses = (transactions || []).filter(t => t.type === "expense" && t.businessType === businessType).reduce((sum, t) => sum + toFiniteNumber(t.amount), 0);
    const inventoryValue = inventory.reduce((sum, item) => sum + (toFiniteNumber(item.costPrice) * toFiniteNumber(item.quantity)), 0);
    const salesGross = completedSales.reduce((sum, s) => sum + toFiniteNumber(s.totalAmount), 0);
    const grossProfit = toFiniteNumber(cogsData?.grossProfit);
    const totalNet = grossProfit + extraIncome - expenses;
    const finalNetBalance = totalNet;
    return { gross: salesGross + extraIncome, net: totalNet, grossProfit, expenses, extraIncome, count: completedSales.length, inventoryValue, finalNetBalance };
  }, [sales, transactions, inventory, businessType, cogsData]);

  const onSubmit = (data: any) => {
    transactionMutation.mutate(data);
  };

  return (
    <div className="h-full bg-[#0a0a0a] text-zinc-100 flex flex-col lg:flex-row gap-0 overflow-hidden">
      <aside className="w-full lg:w-96 bg-zinc-900/50 border-r border-white/5 p-6 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
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
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Lucro Bruto</span>
              <DollarSign className={`w-4 h-4 ${financialData.grossProfit >= 0 ? 'text-primary' : 'text-red-500'}`} />
            </div>
            <div className={`text-4xl font-black italic tracking-tighter ${financialData.grossProfit >= 0 ? 'text-white' : 'text-red-500'}`}>
              R$ {(financialData.grossProfit / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-primary/80 tracking-widest">Lucro Líquido</span>
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div className={`text-4xl font-black italic tracking-tighter ${financialData.finalNetBalance >= 0 ? 'text-primary' : 'text-red-500'}`}>
              R$ {(financialData.finalNetBalance / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[9px] text-zinc-500 font-medium">Resultado líquido do período (lucro bruto + outras entradas - despesas)</p>
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
              <Button className="w-full bg-zinc-800/70 text-white border border-white/10 hover:bg-primary hover:text-black hover:border-primary/40 font-black uppercase italic h-14 rounded-xl transition-all shadow-[0_10px_35px_rgba(0,0,0,0.25)]">
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
                            <SelectItem value="outro">Padaria</SelectItem>
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
                          <Input {...field} required aria-required="true" className="bg-black border-white/10 h-12 rounded-xl" />
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
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-black text-xl">R$</span>
                            <Input 
                              type="text" 
                              inputMode="numeric"
                              placeholder="0,00"
                              required
                              aria-required="true"
                              className="bg-black border-white/10 h-14 rounded-xl font-black text-xl italic pl-14 text-right" 
                              onChange={(e) => handleAmountChange(e, field.onChange)} 
                              value={amountDisplay} 
                            />
                          </div>
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
            <input type="date" max={dateRange.end} value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-transparent text-white text-[11px] font-bold border-0 focus:ring-0 [color-scheme:dark] px-3" />
            <div className="h-4 w-[1px] bg-white/10" />
            <input type="date" min={dateRange.start} value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-transparent text-white text-[11px] font-bold border-0 focus:ring-0 [color-scheme:dark] px-3" />
          </div>
          
          <Select value={businessType} onValueChange={(v: any) => setBusinessType(v)}>
            <SelectTrigger className="w-[180px] bg-black border-white/10 text-white font-black uppercase italic text-[11px] h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10 text-white font-black italic">
              <SelectItem value="outro">Unidade Padaria</SelectItem>
            </SelectContent>
          </Select>
        </header>

        <div className="flex-1 overflow-hidden p-6">
          {!dateRangeValid && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
              Intervalo inválido: a data inicial não pode ser posterior à data final.
            </div>
          )}
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
                      <TableHead className="text-zinc-500 uppercase text-[10px] font-black italic p-6 text-center w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.map((t) => (
                      <TableRow key={t.id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="text-xs text-zinc-400 p-6">{format(new Date(t.createdAt), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-bold text-sm uppercase p-6">
                          {t.description.includes("ESTORNO") ? (
                            <span className="text-red-500 font-black tracking-tighter italic">VENDA CANCELADA</span>
                          ) : t.description}
                        </TableCell>
                        <TableCell className="p-6">
                          <Badge variant="outline" className={`text-[9px] border-0 p-0 uppercase font-black ${t.type === 'income' ? 'text-primary' : 'text-red-500'}`}>
                            {t.category === 'caixa' ? 'Caixa' : (t.type === 'income' ? 'Crédito' : (t.description.includes("ESTORNO") ? 'Cancelamento' : 'Débito'))}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right p-6 font-black italic ${t.type === 'income' ? 'text-primary' : 'text-red-500'}`}>
                          {t.type === 'income' ? '+' : '-'} R$ {(t.amount / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="p-6 text-center">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                            onClick={() => deleteMutation.mutate(t.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!transactions || transactions.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-64 text-center text-zinc-500 font-black italic uppercase text-xs">Sem registros</TableCell>
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

            <TabsContent value="analysis" className="flex-1 bg-zinc-900/20 border border-white/5 rounded-2xl overflow-y-auto p-6 mt-0 custom-scrollbar">
              <div className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-black/35 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div><p className="text-[10px] uppercase tracking-[0.25em] font-black text-zinc-500">Performance financeira</p><h3 className="mt-1 text-xl font-black italic uppercase tracking-tight text-white">Fluxo de resultado</h3></div>
                      <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-black text-[9px] uppercase">Tempo real</Badge>
                    </div>
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                          <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                          <XAxis dataKey="day" stroke="#71717a" tick={{ fontSize: 10, fontWeight: 700 }} />
                          <YAxis stroke="#71717a" tick={{ fontSize: 10 }} tickFormatter={(v) => "R$ " + v} />
                          <Tooltip formatter={(value: number) => ["R$ " + Number(value).toFixed(2), ""]} contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 10, fontWeight: 800 }} />
                          <Line type="monotone" dataKey="sales" name="Vendas" stroke="#22d3ee" strokeWidth={3} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="income" name="Entradas" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="expenses" name="Despesas" stroke="#f87171" strokeWidth={2.5} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/35 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                    <p className="text-[10px] uppercase tracking-[0.25em] font-black text-zinc-500">Composição</p><h3 className="mt-1 text-xl font-black italic uppercase tracking-tight text-white">Despesas por categoria</h3>
                    <div className="h-[280px] w-full mt-2">
                      {expenseComposition.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={expenseComposition} dataKey="value" nameKey="name" cx="50%" cy="48%" outerRadius={92} innerRadius={52} paddingAngle={3}>
                              {expenseComposition.map((_, index) => <Cell key={index} fill={["#22d3ee", "#a78bfa", "#f87171", "#fbbf24", "#34d399", "#60a5fa"][index % 6]} />)}
                            </Pie>
                            <Tooltip formatter={(value: number) => ["R$ " + Number(value).toFixed(2), ""]} contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 9, fontWeight: 800 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : <div className="h-full flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-zinc-600">Sem despesas no período</div>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Lucro líquido</p><p className={financialData.net >= 0 ? "mt-2 text-2xl font-black italic text-primary" : "mt-2 text-2xl font-black italic text-red-400"}>R$ {(financialData.net / 100).toFixed(2)}</p></div>
                  <div className="rounded-2xl border border-white/10 bg-black/35 p-5"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Entradas extras</p><p className="mt-2 text-2xl font-black italic text-violet-300">R$ {(financialData.extraIncome / 100).toFixed(2)}</p></div>
                  <div className="rounded-2xl border border-white/10 bg-black/35 p-5"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Despesas</p><p className="mt-2 text-2xl font-black italic text-red-400">R$ {(financialData.expenses / 100).toFixed(2)}</p></div>
                  <div className="rounded-2xl border border-white/10 bg-black/35 p-5"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Ticket médio</p><p className="mt-2 text-2xl font-black italic text-white">R$ {financialData.count > 0 ? (financialData.gross / 100 / financialData.count).toFixed(2) : "0,00"}</p></div>
                </div>
                <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-black/30 to-violet-500/5 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div><p className="text-[9px] uppercase tracking-[0.25em] font-black text-primary/70">Indicador principal</p><h3 className="text-2xl font-black italic uppercase tracking-tight">Lucro líquido do período</h3></div>
                    <div className={financialData.net >= 0 ? "text-4xl font-black italic tracking-tighter text-primary" : "text-4xl font-black italic tracking-tighter text-red-400"}>R$ {(financialData.net / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">Resultado após todas as entradas e despesas registradas no intervalo selecionado.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
