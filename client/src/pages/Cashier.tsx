import { useState, useMemo, useEffect } from "react";
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

  const { data: menuItems } = useQuery<(MenuItem | (Inventory & { name: string; price: number; imageUrl: string }))[]>({
    queryKey: ["/api/menu-items-combined"],
    queryFn: async () => {
      const [menuRes, inventoryRes] = await Promise.all([
        fetch("/api/menu-items"),
        fetch("/api/inventory")
      ]);
      const menuData = await menuRes.json();
      const inventoryData = await inventoryRes.json();
      
      const combined = [...menuData];
      inventoryData.forEach((invItem: any) => {
        // Verifica se o item de inventário já existe no menu pelo ID ou código de barras
        const exists = combined.find(m => 
          (m.barcode && invItem.barcode && m.barcode === invItem.barcode) || 
          (m.id === invItem.itemId)
        );
        
        if (!exists) {
          combined.push({
            id: invItem.id + 10000, // Offset para evitar colisão de ID com menu_items
            name: invItem.customName || `Produto #${invItem.id}`,
            price: invItem.salePrice || (invItem.costPrice * 1.3),
            imageUrl: "https://images.unsplash.com/photo-1586769852836-bc069f19e1b6?w=200",
            barcode: invItem.barcode,
            isAvailable: invItem.quantity > 0,
            inventoryId: invItem.id
          });
        }
      });
      return combined;
    }
  });

  const [searchTerm, setSearchTerm] = useState("");

  const filteredMenuItems = useMemo(() => {
    if (!menuItems) return [];
    if (!searchTerm) return menuItems;

    const term = searchTerm.toLowerCase();
    return menuItems.filter(item => 
      (item.name && item.name.toLowerCase().includes(term)) ||
      (item.id && item.id.toString() === term) ||
      (item.barcode && item.barcode.toLowerCase() === term)
    );
  }, [menuItems, searchTerm]);

  useEffect(() => {
    if (searchTerm && filteredMenuItems.length === 1) {
      const item = filteredMenuItems[0];
      if (item.barcode && item.barcode.toLowerCase() === searchTerm.toLowerCase()) {
        addToCart(item);
        setSearchTerm("");
        toast({ title: "Item BIPADO", description: `${item.name} adicionado ao carrinho.` });
      }
    }
  }, [searchTerm, filteredMenuItems]);

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
    if (cart.length === 0) {
      toast({ 
        title: "Carrinho Vazio", 
        description: "Adicione pelo menos um item para realizar uma venda.",
        variant: "destructive"
      });
      return;
    }
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
              className="w-full bg-[#00e5ff] hover:bg-white text-white hover:text-black font-black uppercase italic h-14 text-lg rounded-xl transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)] border-none hover:shadow-[0_0_30px_rgba(0,229,255,0.6)]"
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
    <div className="min-h-screen bg-transparent flex flex-col p-4 md:p-6 lg:p-8 gap-6 selection:bg-primary selection:text-black max-w-full mx-auto overflow-x-hidden pt-24">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 panel-translucent p-6 shrink-0">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:text-primary hover:bg-white/5 w-12 h-12 rounded-full shrink-0"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="w-7 h-7" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-white text-2xl md:text-3xl font-black uppercase italic tracking-tighter leading-none">Terminal de <span className="text-primary">Vendas</span></h1>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.4em] mt-1">Controle Transacional</p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-1 w-full xl:max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <Input 
              placeholder="BUSCAR PRODUTO (NOME, ID OU BARCODE)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-black/60 border-white/10 text-white h-12 pl-10 font-black italic rounded-xl focus:border-primary/50 transition-all w-full"
              autoFocus
            />
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary px-4 py-2 font-black italic uppercase tracking-wider text-[10px]">
            Operador ID: {register.userId}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 w-full min-h-0 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4">
            {filteredMenuItems?.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => addToCart(item)}
                className="cursor-pointer group h-full"
              >
                <Card className="h-full panel-translucent overflow-hidden group-hover:border-primary/50 transition-all flex flex-col">
                  <div className="h-24 md:h-32 overflow-hidden relative">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <CardContent className="p-3 flex flex-col flex-1 justify-between gap-2">
                    <h3 className="text-white font-black text-[10px] md:text-xs uppercase italic line-clamp-2 tracking-tighter group-hover:text-primary transition-colors leading-tight">{item.name}</h3>
                    <p className="text-primary font-black text-base md:text-lg italic tracking-tighter">R$ {(item.price / 100).toFixed(2)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col shrink-0 h-full lg:max-h-[calc(100vh-180px)]">
          <Card className="panel-translucent flex flex-col h-full overflow-hidden">
            <CardHeader className="border-b border-white/5 space-y-4 p-4 md:p-6 bg-white/5 shrink-0">
              <CardTitle className="text-white flex items-center justify-between uppercase italic tracking-tighter text-xl font-black">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6 text-primary" /> Carrinho
                </div>
                <Badge className="bg-primary text-black font-black italic rounded-full h-5 w-5 flex items-center justify-center p-0 text-[10px]">{cart.reduce((s,i) => s + i.quantity, 0)}</Badge>
              </CardTitle>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    placeholder="Número da Comanda" 
                    value={searchTicket} 
                    onChange={e => setSearchTicket(e.target.value)}
                    className="h-10 bg-black/60 border-white/10 text-[10px] font-black italic tracking-tighter text-white rounded-xl pl-4 pr-10 focus:border-primary/50 transition-all"
                  />
                  <Button 
                    variant="ghost" 
                    className="absolute right-1 top-1 h-8 w-8 p-0 text-primary hover:bg-primary/10 rounded-lg"
                    onClick={() => loadTicketMutation.mutate(searchTicket)}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {cart.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-white/20 gap-3 italic py-12"
                  >
                    <ShoppingCart className="w-12 h-12 opacity-10" strokeWidth={1} />
                    <p className="font-black uppercase tracking-[0.2em] text-[10px]">Carrinho Vazio</p>
                  </motion.div>
                ) : (
                  cart.map(({ item, quantity }) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center justify-between gap-4 group"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white text-xs font-black italic uppercase tracking-tighter truncate group-hover:text-primary transition-colors">{item.name}</h4>
                        <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Unitário: R$ {(item.price / 100).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-lg border border-white/5 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-md text-white/40 hover:text-white hover:bg-white/10" onClick={() => removeFromCart(item.id)}>
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <span className="text-white font-black text-sm italic tracking-tighter w-5 text-center">{quantity}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-md text-primary hover:bg-primary/10" onClick={() => addToCart(item)}>
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </CardContent>
            <div className="p-6 border-t border-white/5 bg-black/40 space-y-6 shrink-0 mt-auto">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-white/40 font-black uppercase text-[9px] tracking-widest">Subtotal Geral</span>
                  <span className="text-white/60 text-[10px] font-bold">{cart.length} itens</span>
                </div>
                <span className="text-primary text-3xl font-black italic tracking-tighter drop-shadow-[0_0_15px_rgba(0,255,102,0.3)] shrink-0">R$ {(total / 100).toFixed(2)}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className={`flex flex-col h-16 gap-1 border-white/10 text-white hover:bg-white hover:text-black hover:border-white transition-all rounded-xl ${showFiscalFields ? 'bg-primary/20 border-primary/50 text-primary' : ''}`}
                  onClick={handleFiscalToggle}
                >
                  <Landmark className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase italic tracking-widest">Identificar CPF</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col h-16 gap-1 border-white/10 text-white hover:bg-primary hover:text-black hover:border-primary transition-all rounded-xl"
                  onClick={() => handlePayment('cash')}
                >
                  <Banknote className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Dinheiro</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col h-16 gap-1 border-white/10 text-white hover:bg-primary hover:text-black hover:border-primary transition-all rounded-xl"
                  onClick={() => handlePayment('card')}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Cartão</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col h-16 gap-1 border-white/10 text-white hover:bg-primary hover:text-black hover:border-primary transition-all rounded-xl"
                  onClick={() => handlePayment('pix')}
                >
                  <QrCode className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">PIX</span>
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
                disabled={saleMutation.isPending || (paymentMethod === 'cash' && change < 0)}
                onClick={finalizeSale}
              >
                {saleMutation.isPending ? <Loader2 className="animate-spin" /> : "CONFIRMAR TRANSAÇÃO"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
