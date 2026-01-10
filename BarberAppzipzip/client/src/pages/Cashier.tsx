import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MenuItem, CashRegister } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Minus, ShoppingCart, Banknote, CreditCard, QrCode, ArrowLeft, Landmark, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Cashier() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [openingAmount, setOpeningAmount] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "pix" | null>(null);
  const [customerAmount, setCustomerAmount] = useState("");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchTicket, setSearchTicket] = useState("");
  const [customerInfo, setCustomerInfo] = useState({ name: "", taxId: "", email: "" });
  const [showFiscalFields, setShowFiscalFields] = useState(false);

  const { data: register, isLoading: isLoadingRegister } = useQuery<CashRegister>({
    queryKey: ["/api/cash-register/open"],
    retry: false,
  });

  const { data: menuItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const openMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiRequest("POST", "/api/cash-register/open", { openingAmount: amount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/open"] });
      toast({ title: "Caixa aberto com sucesso!" });
    },
  });

  const saleMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/sales", data);
      return res.json();
    },
    onSuccess: () => {
      setCart([]);
      setPaymentModalOpen(false);
      setConfirmModalOpen(false);
      setCustomerAmount("");
      setPaymentMethod(null);
      setCustomerInfo({ name: "", taxId: "", email: "" });
      setShowFiscalFields(false);
      toast({ title: "Venda realizada com sucesso!" });
    },
  });

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.item.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const loadTicketMutation = useMutation({
    mutationFn: async (number: string) => {
      const res = await fetch(`/api/tickets/${number}`);
      if (!res.ok) throw new Error("Comanda não encontrada");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.items) {
        const ticketItems = data.items.map((i: string) => {
          const parsed = JSON.parse(i);
          return { item: { ...parsed, price: parsed.price }, quantity: parsed.quantity };
        });
        setCart(ticketItems);
        toast({ title: "Comanda Carregada", description: `Itens da comanda #${data.ticketNumber} adicionados ao carrinho.` });
      }
    },
    onError: () => {
      toast({ title: "Erro", description: "Comanda não encontrada ou sem itens", variant: "destructive" });
    }
  });

  const total = cart.reduce((sum, i) => sum + i.item.price * i.quantity, 0);

  const handleFiscalToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowFiscalFields(!showFiscalFields);
  };

  const handlePayment = (method: "cash" | "card" | "pix") => {
    setPaymentMethod(method);
    setPaymentModalOpen(true);
  };

  const finalizeSale = () => {
    const cleanTaxId = customerInfo.taxId.replace(/\D/g, "");
    if (showFiscalFields && cleanTaxId && cleanTaxId.length !== 11) {
      toast({ 
        title: "CPF Inválido", 
        description: "O CPF deve ter 11 dígitos para validação na SEFAZ.",
        variant: "destructive"
      });
      return;
    }

    saleMutation.mutate({
      sale: { 
        totalAmount: total,
        customerName: customerInfo.name || null,
        customerTaxId: cleanTaxId || null,
        customerEmail: customerInfo.email || null,
        fiscalStatus: cleanTaxId ? "pending" : "none"
      },
      items: cart.map(i => ({ itemType: 'product', itemId: i.item.id, quantity: i.quantity, unitPrice: i.item.price, totalPrice: i.item.price * i.quantity })),
      payments: [{ method: paymentMethod, amount: total }]
    });
  };

  const customerPaid = Number(customerAmount.replace(",", ".")) * 100;
  const change = customerPaid - total;

  if (isLoadingRegister) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!register) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 selection:bg-primary selection:text-black">
        <Card className="w-full max-w-lg bg-zinc-900 border-white/10 shadow-2xl rounded-2xl overflow-hidden border-t-4 border-t-primary">
          <CardHeader className="flex flex-row items-center gap-6 p-8 bg-white/5">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:text-primary hover:bg-white/5 w-12 h-12 rounded-full"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="w-7 h-7" />
            </Button>
            <div className="flex flex-col">
              <CardTitle className="text-white uppercase italic tracking-tighter text-3xl font-black leading-none">Abertura de Caixa</CardTitle>
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Sessão de Vendas v2.0</span>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="space-y-3">
              <label className="text-white/40 text-xs uppercase font-black tracking-widest pl-1">Saldo Inicial em Dinheiro (R$)</label>
              <Input
                type="number"
                placeholder="0,00"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                className="bg-black border-white/10 text-white h-14 text-2xl font-black italic rounded-xl focus:border-primary/50 transition-all"
              />
            </div>
            <Button
              className="w-full bg-primary hover:bg-white text-black font-black uppercase italic h-14 text-lg rounded-xl transition-all shadow-xl"
              disabled={openMutation.isPending}
              onClick={() => openMutation.mutate(Number(openingAmount) * 100)}
            >
              {openMutation.isPending ? <Loader2 className="animate-spin" /> : "Iniciar Turno no Caixa"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col p-4 md:p-8 lg:p-12 gap-8 selection:bg-primary selection:text-black max-w-[2400px] mx-auto overflow-x-hidden">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 panel-translucent p-6">
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
            <h1 className="text-white text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">Terminal de <span className="text-primary">Vendas</span></h1>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.4em] mt-1">Controle Transacional em Tempo Real</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary px-4 py-2 font-black italic uppercase tracking-wider text-xs">
            Operador ID: {register.userId}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 w-full space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
            {menuItems?.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => addToCart(item)}
                className="cursor-pointer group h-full"
              >
                <Card className="h-full panel-translucent overflow-hidden group-hover:border-primary/50 transition-all flex flex-col">
                  <div className="h-28 md:h-40 overflow-hidden relative">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <CardContent className="p-4 flex flex-col flex-1 justify-between gap-2">
                    <h3 className="text-white font-black text-xs md:text-sm uppercase italic line-clamp-2 tracking-tighter group-hover:text-primary transition-colors">{item.name}</h3>
                    <p className="text-primary font-black text-lg md:text-xl italic tracking-tighter">R$ {(item.price / 100).toFixed(2)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-[450px] flex flex-col gap-8 sticky lg:top-8">
          <Card className="panel-translucent flex flex-col min-h-[600px] lg:h-[calc(100vh-200px)]">
            <CardHeader className="border-b border-white/5 space-y-6 p-6 md:p-8 bg-white/5">
              <CardTitle className="text-white flex items-center justify-between uppercase italic tracking-tighter text-2xl font-black">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-7 h-7 text-primary" /> Carrinho
                </div>
                <Badge className="bg-primary text-black font-black italic rounded-full h-6 w-6 flex items-center justify-center p-0">{cart.reduce((s,i) => s + i.quantity, 0)}</Badge>
              </CardTitle>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    placeholder="Número da Comanda" 
                    value={searchTicket} 
                    onChange={e => setSearchTicket(e.target.value)}
                    className="h-12 bg-black/60 border-white/10 text-sm font-black italic tracking-tighter text-white rounded-xl pl-4 pr-12 focus:border-primary/50 transition-all"
                  />
                  <Button 
                    variant="ghost" 
                    className="absolute right-2 top-2 h-8 w-8 p-0 text-primary hover:bg-primary/10 rounded-lg"
                    onClick={() => loadTicketMutation.mutate(searchTicket)}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin scrollbar-thumb-primary/20">
              <AnimatePresence mode="popLayout">
                {cart.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-white/20 gap-4 italic py-20"
                  >
                    <ShoppingCart className="w-16 h-16 opacity-20" strokeWidth={1} />
                    <p className="font-black uppercase tracking-[0.3em] text-xs">Carrinho Vazio</p>
                  </motion.div>
                ) : (
                  cart.map(({ item, quantity }) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center justify-between gap-6 group"
                    >
                      <div className="flex-1 space-y-1">
                        <h4 className="text-white text-base font-black italic uppercase tracking-tighter truncate group-hover:text-primary transition-colors">{item.name}</h4>
                        <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Unitário: R$ {(item.price / 100).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-4 bg-black/40 p-2 rounded-xl border border-white/5">
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10" onClick={() => removeFromCart(item.id)}>
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="text-white font-black text-lg italic tracking-tighter w-6 text-center">{quantity}</span>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10" onClick={() => addToCart(item)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </CardContent>
            <div className="p-8 border-t border-white/5 bg-black/40 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-white/40 font-black uppercase text-[10px] tracking-widest">Subtotal Geral</span>
                  <span className="text-white/60 text-sm font-bold">{cart.length} itens registrados</span>
                </div>
                <span className="text-primary text-4xl md:text-5xl font-black italic tracking-tighter drop-shadow-[0_0_15px_rgba(0,255,102,0.3)]">R$ {(total / 100).toFixed(2)}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className={`flex flex-col h-20 gap-2 border-white/10 text-white hover:bg-white hover:text-black hover:border-white transition-all rounded-xl ${showFiscalFields ? 'bg-primary/20 border-primary/50 text-primary' : ''}`}
                  onClick={handleFiscalToggle}
                >
                  <Landmark className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase italic tracking-widest">Identificar CPF</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col h-20 gap-2 border-white/10 text-white hover:bg-primary hover:text-black hover:border-primary transition-all rounded-xl"
                  onClick={() => handlePayment('cash')}
                >
                  <Banknote className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Dinheiro</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col h-20 gap-2 border-white/10 text-white hover:bg-primary hover:text-black hover:border-primary transition-all rounded-xl"
                  onClick={() => handlePayment('card')}
                >
                  <CreditCard className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Cartão de Crédito</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col h-20 gap-2 border-white/10 text-white hover:bg-primary hover:text-black hover:border-primary transition-all rounded-xl"
                  onClick={() => handlePayment('pix')}
                >
                  <QrCode className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase tracking-widest">PIX Instantâneo</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-xl p-0 overflow-hidden rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] border-t-4 border-t-primary">
          <div className="p-10 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-white uppercase italic tracking-tighter text-3xl font-black">
                Pagamento: <span className="text-primary">{paymentMethod === 'cash' ? 'DINHEIRO' : paymentMethod === 'card' ? 'CARTÃO' : 'PIX'}</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-8">
              <div className="flex justify-between items-center p-6 bg-black/60 rounded-2xl border border-white/5">
                <span className="text-zinc-500 uppercase font-black tracking-widest text-xs">VALOR DA TRANSAÇÃO</span>
                <span className="text-primary text-4xl font-black italic tracking-tighter">R$ {(total / 100).toFixed(2)}</span>
              </div>

              {paymentMethod === 'cash' && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-zinc-500 text-xs uppercase font-black tracking-widest pl-1">VALOR RECEBIDO PELO CLIENTE</label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={customerAmount}
                      onChange={(e) => setCustomerAmount(e.target.value)}
                      className="bg-black border-white/10 text-white text-3xl h-20 font-black italic tracking-tighter rounded-2xl px-6 focus:border-primary/50 transition-all text-center"
                      autoFocus
                    />
                  </div>

                  <AnimatePresence>
                    {customerAmount && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`p-6 rounded-2xl border-2 transition-all ${change < 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-primary/5 border-primary/20 shadow-[0_0_20px_rgba(0,255,102,0.1)]'}`}
                      >
                        {change < 0 ? (
                          <div className="flex justify-between items-center">
                            <span className="text-red-500 uppercase font-black tracking-widest text-xs">SALDO PENDENTE</span>
                            <span className="text-red-500 text-3xl font-black italic tracking-tighter">R$ {Math.abs(change / 100).toFixed(2)}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center">
                            <span className="text-primary uppercase font-black tracking-widest text-xs">TROCO DEVIDO</span>
                            <span className="text-primary text-3xl font-black italic tracking-tighter">R$ {(change / 100).toFixed(2)}</span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {paymentMethod !== 'cash' && (
                <div className="p-10 text-center space-y-4 border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
                  {paymentMethod === 'card' ? <CreditCard className="w-16 h-16 text-zinc-700 mx-auto" /> : <QrCode className="w-16 h-16 text-zinc-700 mx-auto" />}
                  <div className="space-y-1">
                    <p className="text-white font-black italic uppercase tracking-tighter text-lg">Processamento Externo</p>
                    <p className="text-sm text-zinc-500 font-medium">Siga as instruções no terminal {paymentMethod === 'card' ? 'POS' : 'PagBank'}.</p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="ghost"
                className="flex-1 border-white/5 text-zinc-500 hover:text-white uppercase font-black tracking-widest h-14"
                onClick={() => setPaymentModalOpen(false)}
              >
                CANCELAR
              </Button>
              <Button
                className="flex-[2] bg-primary hover:bg-white text-black font-black uppercase italic h-14 text-lg rounded-xl shadow-xl transition-all"
                disabled={saleMutation.isPending || (paymentMethod === 'cash' && (!customerAmount || change < 0))}
                onClick={() => setConfirmModalOpen(true)}
              >
                {saleMutation.isPending ? <Loader2 className="animate-spin" /> : "AVANÇAR PARA CONFIRMAÇÃO"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-xl p-0 overflow-hidden rounded-2xl shadow-2xl">
          <div className="p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-white uppercase italic tracking-tighter text-2xl font-black">
                Confirmar <span className="text-primary">Venda</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {showFiscalFields && (
                <div className="space-y-3 bg-black/40 p-4 rounded-xl border border-primary/20">
                  <label className="text-primary text-[10px] font-black uppercase italic tracking-widest">Identificação do Cliente (CPF)</label>
                  <Input 
                    placeholder="000.000.000-00" 
                    className="bg-black border-white/10 text-white h-10 text-sm font-bold"
                    value={customerInfo.taxId}
                    onChange={(e) => setCustomerInfo({...customerInfo, taxId: e.target.value})}
                    maxLength={14}
                  />
                </div>
              )}

              <div className="bg-black/40 rounded-xl p-4 max-h-40 overflow-y-auto space-y-2 border border-white/5">
                {cart.map(({ item, quantity }) => (
                  <div key={item.id} className="flex justify-between text-xs font-bold uppercase italic">
                    <span className="text-white truncate flex-1">{item.name}</span>
                    <span className="text-zinc-500 ml-2">x{quantity}</span>
                    <span className="text-primary ml-4">R$ {((item.price * quantity) / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black p-4 rounded-xl border border-white/5">
                  <span className="block text-zinc-500 text-[10px] uppercase font-black tracking-widest mb-1">Total Final</span>
                  <span className="text-primary text-2xl font-black italic tracking-tighter">R$ {(total / 100).toFixed(2)}</span>
                </div>
                <div className="bg-black p-4 rounded-xl border border-white/5">
                  <span className="block text-zinc-500 text-[10px] uppercase font-black tracking-widest mb-1">Pagamento</span>
                  <span className="text-white text-xl font-black italic uppercase tracking-tighter">
                    {paymentMethod}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-4">
              <Button variant="ghost" className="flex-1 uppercase font-black italic" onClick={() => setConfirmModalOpen(false)}>Revisar</Button>
              <Button className="flex-1 bg-primary text-black font-black uppercase italic h-12" onClick={finalizeSale} disabled={saleMutation.isPending}>
                {saleMutation.isPending ? <Loader2 className="animate-spin" /> : "Concluir Venda"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
