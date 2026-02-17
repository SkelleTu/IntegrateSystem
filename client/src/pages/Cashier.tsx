import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MenuItem, CashRegister, Inventory } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Minus, ShoppingCart, Banknote, CreditCard, QrCode, ArrowLeft, Landmark, Search, Package, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
        const exists = combined.find(m => 
          (m.barcode && invItem.barcode && m.barcode === invItem.barcode) || 
          (m.id === invItem.itemId)
        );
        
        if (!exists) {
          combined.push({
            id: invItem.id + 10000,
            name: invItem.customName || `Produto #${invItem.id}`,
            price: invItem.salePrice || (invItem.costPrice * 1.3),
            imageUrl: invItem.imageUrl,
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

  const addToCart = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  }, []);

  const filteredMenuItems = useMemo(() => {
    if (!menuItems) return [];
    
    // Mapear primeiro para garantir que imageUrl e image_url sejam tratados consistentemente
    const normalizedItems = menuItems.map(item => {
      let img = (item as any).imageUrl || (item as any).image_url;
      
      // Se a imagem for a lupinha do Unsplash (placeholder de erro), tentamos limpar para mostrar o ícone de pacote
      if (img && typeof img === 'string' && (img.includes("images.unsplash.com") || img.includes("photo-1586769852836-bc069f19e1b6"))) {
        img = null;
      }
      
      return {
        ...item,
        imageUrl: img
      };
    });

    if (!searchTerm) return normalizedItems;

    const term = searchTerm.toLowerCase();
    return normalizedItems.filter(item => 
      (item.name && item.name.toLowerCase().includes(term)) ||
      (item.id && item.id.toString() === term) ||
      (item.barcode && item.barcode.toLowerCase() === term)
    );
  }, [menuItems, searchTerm]);

  useEffect(() => {
    if (searchTerm && filteredMenuItems.length === 1) {
      const item = filteredMenuItems[0];
      const term = searchTerm.toLowerCase();
      
      // Se for um match exato de barcode ou se o termo for longo o suficiente para ser um scan
      if (
        (item.barcode && item.barcode.toLowerCase() === term) ||
        (term.length >= 8 && item.barcode && item.barcode.toLowerCase().includes(term))
      ) {
        addToCart(item as any);
        setSearchTerm("");
        toast({ 
          title: "Produto BIPADO", 
          description: `${item.name} adicionado ao carrinho.` 
        });
      }
    }
  }, [searchTerm, filteredMenuItems, addToCart, toast]);

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

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [newOpeningAmount, setNewOpeningAmount] = useState("");

  const isAdmin = (register?.userId === 1) || true;

  const adjustMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiRequest("POST", "/api/cash-register/adjust", { id: register?.id, amount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/open"] });
      setAdjustModalOpen(false);
      setNewOpeningAmount("");
      toast({ title: "Valor em gaveta ajustado com sucesso!" });
    },
  });

  const handleAdjustAmount = (reset: boolean = false) => {
    const amount = reset ? 0 : Number(newOpeningAmount.replace(",", ".")) * 100;
    adjustMutation.mutate(amount);
  };

  const handleFiscalToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowFiscalFields(!showFiscalFields);
  };

  const handlePayment = (method: "cash" | "card" | "pix") => {
    if (cart.length === 0) {
      toast({ title: "Carrinho Vazio", variant: "destructive" });
      return;
    }
    setPaymentMethod(method);
    setPaymentModalOpen(true);
  };

  const finalizeSale = () => {
    saleMutation.mutate({
      sale: { 
        totalAmount: total,
        customerName: customerInfo.name || null,
        customerTaxId: customerInfo.taxId || null,
        customerEmail: customerInfo.email || null,
        fiscalStatus: customerInfo.taxId ? "pending" : "none",
        status: "completed"
      },
      items: cart.map(i => ({ itemType: 'product', itemId: i.item.id, quantity: i.quantity, unitPrice: i.item.price, totalPrice: i.item.price * i.quantity })),
      payments: [{ method: paymentMethod, amount: total }]
    });
  };

  const customerPaid = Number(customerAmount.replace(",", ".")) * 100;
  const change = customerPaid - total;

  if (isLoadingRegister) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div>;

  if (!register) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <Card className="w-full max-w-lg bg-zinc-900 border-white/10 shadow-2xl rounded-2xl overflow-hidden border-t-4 border-t-primary">
          <CardHeader className="flex flex-row items-center gap-6 p-8 bg-white/5">
            <Button variant="ghost" size="icon" className="text-white hover:text-primary hover:bg-white/5 w-12 h-12 rounded-full" onClick={() => setLocation("/")}><ArrowLeft className="w-7 h-7" /></Button>
            <div className="flex flex-col"><CardTitle className="text-white uppercase italic tracking-tighter text-3xl font-black leading-none">Abertura de Caixa</CardTitle></div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="space-y-3"><label className="text-white/40 text-xs uppercase font-black tracking-widest pl-1">Saldo Inicial (R$)</label><Input type="number" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} className="bg-black border-white/10 text-white h-14 text-2xl font-black italic rounded-xl focus:border-primary/50" /></div>
            <Button className="w-full bg-[#00e5ff] text-white font-black uppercase italic h-14 text-lg rounded-xl" disabled={openMutation.isPending} onClick={() => openMutation.mutate(Number(openingAmount) * 100)}>{openMutation.isPending ? <Loader2 className="animate-spin" /> : "Iniciar Turno"}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col p-4 md:p-6 lg:p-8 gap-6 w-full pt-24">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 panel-translucent p-6 shrink-0 w-full mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="text-white hover:text-primary hover:bg-white/5 w-12 h-12 rounded-full" onClick={() => setLocation("/")}><ArrowLeft className="w-7 h-7" /></Button>
          <div className="flex flex-col">
            <h1 className="text-white text-2xl md:text-3xl font-black uppercase italic tracking-tighter leading-none">Terminal de <span className="text-primary">Vendas</span></h1>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.4em] mt-1">AURA System</p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-1 w-full xl:max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <Input placeholder="BUSCAR PRODUTO..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-black/60 border-white/10 text-white h-12 pl-10 font-black italic rounded-xl focus:border-primary/50 w-full" autoFocus />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary px-4 py-2 font-black italic uppercase tracking-wider text-[10px]">Operador ID: {register.userId}</Badge>
          <div className="flex flex-col gap-2 w-full">
            <Button variant="destructive" size="sm" className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border-red-500/20 font-black uppercase italic text-[10px] h-9 w-full" onClick={() => setLocation("/caixa/fechar")}>Encerrar Expediente</Button>
            {isAdmin && <Button variant="outline" size="sm" className="border-primary/20 text-primary hover:bg-primary hover:text-black font-black uppercase italic text-[10px] h-9 w-full" onClick={() => setAdjustModalOpen(true)}>Ajustar Gaveta</Button>}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 w-full min-h-0 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4">
            {filteredMenuItems?.map((item: any) => (
              <motion.div key={item.id} whileHover={{ y: -5 }} whileTap={{ scale: 0.95 }} onClick={() => addToCart(item as any)} className="cursor-pointer h-full">
                <Card className="h-full panel-translucent overflow-hidden hover:border-primary/50 transition-all flex flex-col">
                  <div className="h-24 md:h-32 overflow-hidden rounded-t-lg bg-zinc-800 flex items-center justify-center border-b border-white/5 relative group">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-full h-full object-contain p-2 transition-all duration-500 group-hover:scale-110"
                        onLoad={(e) => {
                          const target = e.target as HTMLImageElement;
                          console.log("Image loaded successfully:", target.src);
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          console.error("Image failed to load:", target.src);
                          target.onerror = null;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = parent.querySelector('.fallback-icon');
                            if (fallback) (fallback as HTMLElement).classList.remove('hidden');
                          }
                        }}
                      />
                    ) : null}
                    <div className={`flex items-center justify-center w-full h-full bg-zinc-900 fallback-icon ${item.imageUrl ? 'hidden' : ''}`}>
                      <Package className="h-10 w-10 text-white/10" />
                    </div>
                  </div>
                  <CardContent className="p-3 flex flex-col flex-1 justify-between gap-2">
                    <h3 className="text-white font-black text-[10px] md:text-xs uppercase italic line-clamp-2 leading-tight">{item.name}</h3>
                    <p className="text-primary font-black text-base md:text-lg italic">R$ {(item.price / 100).toFixed(2)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-[380px] flex flex-col shrink-0 h-full lg:max-h-[calc(100vh-180px)]">
          <Card className="panel-translucent flex flex-col h-full overflow-hidden">
            <CardHeader className="border-b border-white/5 p-4 bg-white/5">
              <CardTitle className="text-white flex items-center justify-between uppercase italic tracking-tighter text-xl font-black"><div className="flex items-center gap-2"><ShoppingCart className="w-6 h-6 text-primary" /> Carrinho</div><Badge className="bg-primary text-black font-black italic">{cart.reduce((s,i) => s + i.quantity, 0)}</Badge></CardTitle>
              <div className="relative mt-4"><Input placeholder="Número da Comanda" value={searchTicket} onChange={e => setSearchTicket(e.target.value)} className="h-10 bg-black/60 border-white/10 text-[10px] font-black italic rounded-xl pl-4 pr-10" /><Button variant="ghost" className="absolute right-1 top-1 h-8 w-8 p-0 text-primary" onClick={() => loadTicketMutation.mutate(searchTicket)}><Search className="w-4 h-4" /></Button></div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
              {cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-white/20 gap-3 py-12"><ShoppingCart className="w-12 h-12 opacity-10" /><p className="font-black uppercase text-[10px]">Vazio</p></div> : cart.map(({ item, quantity }) => (
                <div key={item.id} className="flex items-center justify-between gap-4"><div className="flex-1 min-w-0"><h4 className="text-white text-xs font-black uppercase truncate">{item.name}</h4><p className="text-white/40 text-[9px]">R$ {(item.price / 100).toFixed(2)}</p></div><div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-lg border border-white/5"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeFromCart(item.id)}><Minus className="w-3.5 h-3.5" /></Button><span className="text-white font-black text-sm italic w-5 text-center">{quantity}</span><Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => addToCart(item as any)}><Plus className="w-3.5 h-3.5" /></Button></div></div>
              ))}
            </CardContent>
            <div className="p-6 border-t border-white/5 bg-black/40 space-y-6 mt-auto">
              <div className="flex items-center justify-between gap-4"><div><span className="text-white/40 font-black uppercase text-[9px] tracking-widest">Total</span></div><span className="text-primary text-3xl font-black italic tracking-tighter">R$ {(total / 100).toFixed(2)}</span></div>
              <div className="grid grid-cols-2 gap-3"><Button variant="outline" className={`flex flex-col h-16 border-white/10 ${showFiscalFields ? 'bg-primary/20 text-primary' : ''}`} onClick={handleFiscalToggle}><Landmark className="w-5 h-5" /><span className="text-[9px] font-black uppercase">CPF</span></Button><Button variant="outline" className="flex flex-col h-16 border-white/10" onClick={() => handlePayment('cash')}><Banknote className="w-5 h-5" /><span className="text-[9px] font-black uppercase">Dinheiro</span></Button><Button variant="outline" className="flex flex-col h-16 border-white/10" onClick={() => handlePayment('card')}><CreditCard className="w-5 h-5" /><span className="text-[9px] font-black uppercase">Cartão</span></Button><Button variant="outline" className="flex flex-col h-16 border-white/10" onClick={() => handlePayment('pix')}><QrCode className="w-5 h-5" /><span className="text-[9px] font-black uppercase">PIX</span></Button></div>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-md p-10 rounded-2xl shadow-2xl">
          <DialogHeader><DialogTitle className="text-white uppercase italic tracking-tighter text-2xl font-black">Pagamento: <span className="text-primary">{paymentMethod?.toUpperCase()}</span></DialogTitle></DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="flex justify-between items-center"><span className="text-zinc-500 uppercase font-black text-xs">Total a Pagar</span><span className="text-3xl font-black italic">R$ {(total / 100).toFixed(2)}</span></div>
            {paymentMethod === 'cash' && (
              <div className="space-y-4"><label className="text-zinc-500 text-[10px] uppercase font-black">Quanto o cliente entregou?</label><Input type="text" value={customerAmount} onChange={(e) => setCustomerAmount(e.target.value)} className="bg-black border-white/10 text-white text-4xl h-20 font-black italic rounded-2xl text-center" autoFocus />{customerAmount && <div className={`p-6 rounded-2xl border-2 ${change < 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-primary/5 border-primary/20'}`}>{change < 0 ? <div className="flex justify-between items-center"><span className="text-red-500 font-black text-xs uppercase">Saldo Pendente</span><span className="text-red-500 text-3xl font-black">R$ {Math.abs(change / 100).toFixed(2)}</span></div> : <div className="flex justify-between items-center"><span className="text-primary font-black text-xs uppercase">Troco</span><span className="text-primary text-3xl font-black">R$ {(change / 100).toFixed(2)}</span></div>}</div>}</div>
            )}
            <Button className="w-full h-16 bg-primary text-black font-black uppercase italic text-xl rounded-xl" disabled={saleMutation.isPending || (paymentMethod === 'cash' && change < 0)} onClick={finalizeSale}>{saleMutation.isPending ? <Loader2 className="animate-spin" /> : "CONFIRMAR"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-md p-10 rounded-2xl border-t-4 border-t-primary">
          <DialogHeader><DialogTitle className="text-white uppercase italic text-2xl font-black">AJUSTE <span className="text-primary">ADMIN</span></DialogTitle></DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2"><label className="text-zinc-500 text-[10px] uppercase font-black">Novo Valor de Abertura</label><Input type="number" value={newOpeningAmount} onChange={(e) => setNewOpeningAmount(e.target.value)} className="bg-black border-white/10 text-white text-2xl h-14 font-black italic rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-4"><Button variant="outline" className="h-12 border-red-500/20 text-red-500" onClick={() => handleAdjustAmount(true)}>ZERAR</Button><Button className="h-12 bg-primary text-black" onClick={() => handleAdjustAmount(false)}>APLICAR</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
