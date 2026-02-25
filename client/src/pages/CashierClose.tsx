import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Wallet, 
  TrendingUp, 
  Calculator, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CashRegister, Sale } from "@shared/schema";

export default function CashierClose() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [closingAmount, setClosingAmount] = useState("");
  
  const { data: register, isLoading: isLoadingRegister } = useQuery<CashRegister>({
    queryKey: ["/api/cash-register/open"],
  });

  const { data: sales = [] } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
    enabled: !!register,
  });

  // Calculate expected total based on cash sales only
  const totalCashSales = useMemo(() => {
    return sales
      .filter(s => 
        s.status === "completed" && 
        s.cashRegisterId === register?.id &&
        (s as any).paymentMethod === "cash"
      )
      .reduce((sum, s) => sum + s.totalAmount, 0);
  }, [sales, register?.id]);
  
  const expectedTotal = (register?.openingAmount || 0) + totalCashSales;

  const closeMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiRequest("POST", "/api/cash-register/close", { closingAmount: amount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/cash-register/open"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/open"] });
      toast({ title: "Caixa encerrado com sucesso!" });
      setLocation("/caixa");
    },
  });

  const handleClose = () => {
    const amount = Number(closingAmount.replace(",", "."));
    if (isNaN(amount)) return;
    closeMutation.mutate(amount);
  };

  if (isLoadingRegister) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!register) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black gap-4">
        <AlertCircle className="w-16 h-16 text-zinc-800" />
        <p className="text-zinc-500 font-bold uppercase tracking-widest">Nenhum caixa aberto</p>
        <Button onClick={() => setLocation("/caixa")} variant="outline">Voltar ao PDV</Button>
      </div>
    );
  }

  const actualAmount = Math.round(Number(closingAmount.replace(",", ".")) * 100) || 0;
  const diff = actualAmount - expectedTotal;
  const isDiffAcceptable = Math.abs(diff) <= 300; // R$ 3,00 tolerance

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 flex flex-col items-center max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl space-y-12"
      >
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/caixa")}
              className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-105 transition-all"
            >
              <ArrowLeft className="h-6 w-6 text-zinc-400" />
            </Button>
            <div className="space-y-1">
              <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
                FECHAMENTO <span className="text-red-600">DE CAIXA</span>
              </h1>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-white/5 border-white/10 text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                  ID OPERAÇÃO: #{register.id}
                </Badge>
                <Badge variant="outline" className="bg-red-600/10 border-red-600/20 text-red-600 font-bold uppercase tracking-widest text-[10px]">
                  STATUS: AGUARDANDO CONTAGEM
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="hidden md:block text-right">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">Operador Atual</p>
            <p className="text-white font-black italic text-xl uppercase tracking-tighter">ID {register.userId}</p>
          </div>
        </div>

        {/* Financial Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="panel-translucent border-white/5 bg-gradient-to-br from-white/5 to-transparent overflow-hidden group">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-zinc-800/50 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                  <Wallet className="h-6 w-6 text-zinc-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Abertura</span>
              </div>
              <div>
                <p className="text-3xl font-black italic tracking-tighter text-white">R$ {((register.openingAmount || 0) / 100).toFixed(2)}</p>
                <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest mt-1">Saldo inicial em gaveta</p>
              </div>
            </CardContent>
          </Card>

          <Card className="panel-translucent border-white/5 bg-gradient-to-br from-white/5 to-transparent overflow-hidden group">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Vendas (Cash)</span>
              </div>
              <div>
                <p className="text-3xl font-black italic tracking-tighter text-primary">R$ {(totalCashSales / 100).toFixed(2)}</p>
                <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest mt-1">Transações concluídas em dinheiro</p>
              </div>
            </CardContent>
          </Card>

          <Card className="panel-translucent border-primary/20 bg-primary/5 relative overflow-hidden ring-1 ring-primary/20">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Calculator className="h-24 w-24 text-primary" />
            </div>
            <CardContent className="p-8 space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">VALOR TOTAL ESPERADO</span>
              </div>
              <div>
                <p className="text-5xl font-black italic tracking-tighter text-white">R$ {(expectedTotal / 100).toFixed(2)}</p>
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3" /> Cálculo Automático Aura
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Input Section */}
        <div className="max-w-2xl mx-auto w-full space-y-8 py-12">
          <div className="space-y-4 text-center">
            <h2 className="text-sm font-black uppercase tracking-[0.5em] text-zinc-500">Contagem Física da Gaveta</h2>
            <div className="relative group">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                className="bg-zinc-950 border-white/10 text-white text-6xl md:text-8xl h-32 md:h-48 font-black italic tracking-tighter rounded-3xl px-10 focus:border-red-600/50 transition-all text-center shadow-[0_0_50px_rgba(220,38,38,0.05)] focus:shadow-[0_0_80px_rgba(220,38,38,0.15)] placeholder:text-zinc-900"
                autoFocus
              />
              <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none opacity-20 group-focus-within:opacity-50 transition-opacity">
                <span className="text-4xl md:text-6xl font-black italic">R$</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-6 pt-4">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${isDiffAcceptable ? 'bg-primary' : 'bg-red-500'} animate-pulse`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tolerância: R$ 3,00</span>
              </div>
              <div className="h-4 w-[1px] bg-white/10" />
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Data/Hora: {new Date().toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          <AnimatePresence>
            {closingAmount && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-10 rounded-3xl border-2 flex flex-col items-center gap-4 transition-all ${
                  isDiffAcceptable 
                    ? 'bg-primary/5 border-primary/20 shadow-[0_0_40px_rgba(0,255,102,0.1)]' 
                    : 'bg-red-600/5 border-red-600/20 shadow-[0_0_40px_rgba(220,38,38,0.1)]'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isDiffAcceptable ? 'text-primary' : 'text-red-500'}`}>
                    Diferença Identificada
                  </span>
                  <p className={`text-4xl font-black italic tracking-tighter ${isDiffAcceptable ? 'text-white' : 'text-red-600'}`}>
                    {diff === 0 ? "EQUILIBRADO" : `R$ ${Math.abs(diff / 100).toFixed(2)}`}
                  </p>
                </div>
                
                {!isDiffAcceptable && (
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center max-w-sm">
                    A diferença excede a margem de segurança. <br/>Verifique os lançamentos antes de prosseguir.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-4 pt-8">
            <Button
              size="lg"
              onClick={handleClose}
              disabled={closeMutation.isPending || !closingAmount}
              className="h-20 bg-red-600 hover:bg-white text-white hover:text-black font-black uppercase italic text-2xl rounded-2xl shadow-[0_20px_40px_rgba(220,38,38,0.2)] hover:shadow-none transition-all group"
            >
              {closeMutation.isPending ? (
                <Loader2 className="animate-spin h-8 w-8" />
              ) : (
                <>
                  FINALIZAR EXPEDIENTE <ChevronRight className="ml-2 h-8 w-8 group-hover:translate-x-2 transition-transform" />
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setLocation("/caixa")}
              className="h-12 text-zinc-500 hover:text-white uppercase font-black tracking-widest text-[10px]"
            >
              VOLTAR AO PDV SEM ENCERRAR
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
