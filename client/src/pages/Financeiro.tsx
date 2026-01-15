import { useQuery, useMutation } from "@tanstack/react-query";
import { Sale, Transaction, insertTransactionSchema } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Calendar as CalendarIcon, ArrowLeft, TrendingUp, TrendingDown, DollarSign, PlusCircle, MinusCircle, Wallet } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

export default function Financeiro() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [businessType, setBusinessType] = useState<"barbearia" | "padaria">("barbearia");
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "fiscal">("overview");

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-white text-4xl font-black uppercase italic italic-accent mb-4 tracking-tighter">Acesso Restrito</h1>
        <p className="text-white/60 max-w-md uppercase text-sm font-bold tracking-widest leading-relaxed">
          Esta área é reservada exclusivamente ao administrador do sistema para gestão financeira estratégica.
        </p>
        <Button onClick={() => setLocation("/")} className="mt-8 uppercase font-black italic tracking-tighter bg-primary text-black hover:bg-white h-12 px-8">Voltar ao Início</Button>
      </div>
    );
  }

  const { data: sales, isLoading: isLoadingSales } = useQuery<any[]>({
    queryKey: ["/api/sales", dateRange.start, dateRange.end],
    queryFn: async () => {
      const res = await fetch(`/api/sales?start=${dateRange.start}&end=${dateRange.end}`);
      return res.json();
    },
    refetchInterval: 5000,
  });

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", dateRange.start, dateRange.end, businessType],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?start=${dateRange.start}&end=${dateRange.end}&businessType=${businessType}`);
      return res.json();
    },
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
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Lançamento realizado com sucesso" });
    }
  });

  const financialData = useMemo(() => {
    if (!sales || !transactions) return { gross: 0, net: 0, expenses: 0, extraIncome: 0, count: 0 };
    
    const completedSales = sales.filter(s => s.status === "completed");
    const salesGross = completedSales.reduce((sum, s) => sum + s.totalAmount, 0);
    
    const margin = businessType === "barbearia" ? 0.85 : 0.45;
    const baseNet = Math.round(salesGross * margin);

    const extraIncome = transactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalNet = baseNet + extraIncome - expenses;

    return { 
      gross: salesGross + extraIncome, 
      net: totalNet, 
      expenses, 
      extraIncome, 
      count: completedSales.length 
    };
  }, [sales, transactions, businessType]);

  const onSubmit = (data: any) => {
    transactionMutation.mutate({ ...data, businessType });
  };

  const isLoading = isLoadingSales || isLoadingTransactions;

  return (
    <div className="min-h-screen bg-black p-4 md:p-8 lg:p-12 space-y-8 max-w-[2400px] mx-auto overflow-x-hidden selection:bg-primary selection:text-black">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 bg-zinc-900/40 p-6 md:p-8 rounded-2xl border border-white/10 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-6">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:text-primary hover:bg-white/5 w-14 h-14 rounded-full"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="w-8 h-8" />
            </Button>
            <div className="flex flex-col">
              <h1 className="text-white text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">Gestão <span className="text-primary">Financeira</span></h1>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em] mt-1">Analytics & Performance v2.0</p>
            </div>
          </div>
          
          {/* Botão de Novo Lançamento em destaque */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-primary hover:bg-white text-black font-black uppercase italic h-14 px-8 rounded-xl shadow-[0_0_20px_rgba(0,255,102,0.3)] hover:shadow-[0_0_30px_rgba(0,255,102,0.5)] transition-all animate-in fade-in zoom-in duration-500">
                <PlusCircle className="w-6 h-6 mr-2" /> Novo Lançamento
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-md rounded-2xl p-8">
              <DialogHeader>
                <DialogTitle className="uppercase font-black italic text-2xl tracking-tighter mb-4">Lançamento Financeiro</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] uppercase font-black tracking-widest text-white/40 pl-1">Tipo de Movimentação</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black border-white/10 h-12 rounded-xl font-bold">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-zinc-900 border-white/10 text-white">
                            <SelectItem value="expense" className="font-bold uppercase italic text-xs">Despesa (Saída)</SelectItem>
                            <SelectItem value="income" className="font-bold uppercase italic text-xs">Aporte (Entrada)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] uppercase font-black tracking-widest text-white/40 pl-1">Descrição do Lançamento</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Pagamento de Fornecedor..." className="bg-black border-white/10 h-12 rounded-xl font-bold" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] uppercase font-black tracking-widest text-white/40 pl-1">Valor Monetário (R$)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            className="bg-black border-white/10 h-14 rounded-xl font-black text-xl italic tracking-tighter"
                            onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value) * 100))}
                            value={field.value ? field.value / 100 : ""}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full h-14 bg-primary text-black uppercase font-black italic text-lg rounded-xl shadow-xl transition-all" disabled={transactionMutation.isPending}>
                    {transactionMutation.isPending ? <Loader2 className="animate-spin" /> : "Confirmar Lançamento"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-4 bg-black/40 p-2 rounded-xl border border-white/5">
            <Select value={businessType} onValueChange={(v: any) => setBusinessType(v)}>
              <SelectTrigger className="w-[160px] bg-black border-white/10 text-white font-black uppercase italic text-xs h-12 rounded-xl">
                <SelectValue placeholder="Negócio" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                <SelectItem value="barbearia" className="uppercase font-black italic text-xs">Barbearia</SelectItem>
                <SelectItem value="padaria" className="uppercase font-black italic text-xs">Padaria</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-4 px-4 h-12 bg-black rounded-xl border border-white/10">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <div className="flex items-center gap-3">
                <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-transparent text-white text-xs font-bold border-0 focus:ring-0 [color-scheme:dark]"
                />
                <span className="text-zinc-700 font-black italic text-xs">/</span>
                <input 
                  type="date" 
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-transparent text-white text-xs font-bold border-0 focus:ring-0 [color-scheme:dark]"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        {[
          { label: "Faturamento Bruto", value: financialData.gross, icon: TrendingUp, color: "text-primary", desc: "Volume total de entradas" },
          { label: "Despesas Totais", value: financialData.expenses, icon: MinusCircle, color: "text-red-500", desc: "Saídas e custos operacionais" },
          { label: "Lucro Líquido", value: financialData.net, icon: DollarSign, color: "text-primary", desc: "Resultado operacional final", highlight: true },
          { label: "Volume de Vendas", value: financialData.count, icon: Wallet, color: "text-white/60", desc: "Atendimentos concluídos", isNumber: true },
        ].map((card, idx) => (
          <Card key={idx} className={`bg-zinc-900/60 border-white/5 backdrop-blur-xl shadow-2xl transition-all hover:scale-[1.02] ${card.highlight ? 'border-primary/20 bg-primary/5' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">{card.label}</CardTitle>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`${card.color} text-3xl md:text-4xl font-black italic tracking-tighter leading-none`}>
                {card.isNumber ? card.value : `R$ ${(card.value / 100).toFixed(2)}`}
              </div>
              <p className="text-[10px] text-white/40 uppercase font-bold italic mt-2 tracking-wide">{card.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <Card className="bg-zinc-900/60 border-white/5 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-white/5 p-6 md:p-8 bg-white/5">
            <CardTitle className="text-white uppercase font-black italic text-xl md:text-2xl tracking-tighter flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <PlusCircle className="w-5 h-5 text-primary" />
              </div>
              Lançamentos Manuais
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-black/40">
                    <TableRow className="border-white/5">
                      <TableHead className="text-white/40 uppercase text-[10px] font-black italic tracking-widest pl-8 py-6">Data</TableHead>
                      <TableHead className="text-white/40 uppercase text-[10px] font-black italic tracking-widest py-6">Descrição</TableHead>
                      <TableHead className="text-white/40 uppercase text-[10px] font-black italic tracking-widest py-6">Status</TableHead>
                      <TableHead className="text-white/40 uppercase text-[10px] font-black italic tracking-widest text-right pr-8 py-6">Montante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.map((t) => (
                      <TableRow key={t.id} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="text-white text-xs font-bold pl-8 py-6">
                          {format(new Date(t.createdAt), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="text-white text-sm font-black uppercase italic tracking-tighter py-6">
                          {t.description}
                        </TableCell>
                        <TableCell className="py-6">
                          <Badge variant="outline" className={`text-[9px] font-black uppercase italic tracking-widest border-0 px-0 ${t.type === "income" ? "text-primary" : "text-red-500"}`}>
                            {t.type === "income" ? "Crédito" : "Débito"}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right pr-8 py-6 text-sm font-black italic tracking-tighter ${t.type === "income" ? "text-primary" : "text-red-500"}`}>
                          {t.type === "income" ? "+" : "-"} R$ {(t.amount / 100).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!transactions || transactions.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-24 text-white/40 uppercase text-[10px] font-black italic tracking-[0.4em]">
                          Nenhum registro encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-white/5 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-white/5 p-6 md:p-8 bg-white/5">
            <CardTitle className="text-white uppercase font-black italic text-xl md:text-2xl tracking-tighter flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              Histórico de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-black/40">
                    <TableRow className="border-white/5">
                      <TableHead className="text-white/40 uppercase text-[10px] font-black italic tracking-widest pl-8 py-6">Horário</TableHead>
                      <TableHead className="text-white/40 uppercase text-[10px] font-black italic tracking-widest py-6">Valor Bruto</TableHead>
                      <TableHead className="text-white/40 uppercase text-[10px] font-black italic tracking-widest py-6">Margem Líquida</TableHead>
                      <TableHead className="text-white/40 uppercase text-[10px] font-black italic tracking-widest text-right pr-8 py-6">Análise</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales?.filter(s => s.status === "completed").map((sale) => (
                      <TableRow key={sale.id} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="text-white text-xs font-bold pl-8 py-6">
                          {format(new Date(sale.createdAt), "HH:mm:ss")}
                        </TableCell>
                        <TableCell className="text-white text-sm font-black italic tracking-tighter py-6">
                          R$ {(sale.totalAmount / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-primary text-sm font-black italic tracking-tighter py-6">
                          R$ {((sale.totalAmount * (businessType === "barbearia" ? 0.85 : 0.45)) / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right pr-8 py-6">
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] font-black uppercase italic">Venda OK</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!sales || sales.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-24 text-white/40 uppercase text-[10px] font-black italic tracking-[0.4em]">
                          Sem histórico de vendas no período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
