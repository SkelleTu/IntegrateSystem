import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MenuItem, CashRegister, Inventory, Nfce, FiscalSettings } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { printNFCe } from "@/lib/escpos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Minus, ShoppingCart, Banknote, CreditCard, QrCode, ArrowLeft, Landmark, Search, Package, Printer, Image as ImageIcon } from "lucide-react";
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
  const [payments, setPayments] = useState<{ method: "cash" | "card" | "pix"; amount: number }[]>([]);
  const [currentMethod, setCurrentMethod] = useState<"cash" | "card" | "pix" | null>(null);
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
      const sale = await res.json();
      
      // Sempre tenta emitir NFC-e para todas as vendas finalizadas no PDV
      try {
        const fiscalRes = await apiRequest("POST", `/api/fiscal/emitir/${sale.id}`);
        const fiscalData = await fiscalRes.json();
        
        // Se for simulação, mostramos um aviso visual
        if (fiscalSettingsData?.simulacaoReal) {
          toast({ 
            title: "MODO SIMULAÇÃO ATIVO", 
            description: "A nota foi gerada perfeitamente, mas NÃO foi enviada à SEFAZ (Ambiente de Teste Local).",
            className: "bg-primary text-black font-black"
          });
        }
        
        return { sale, fiscal: fiscalData };
      } catch (e) {
        console.error("Erro na emissão automática:", e);
      }
      return { sale };
    },
    onSuccess: async (data) => {
      setCart([]);
      setPaymentModalOpen(false);
      setConfirmModalOpen(false);
      setCustomerAmount("");
      setPayments([]);
      setCurrentMethod(null);
      setCustomerInfo({ name: "", taxId: "", email: "" });
      setShowFiscalFields(false);
      
      toast({ 
        title: "Venda realizada com sucesso!",
        description: data.fiscal ? "NFC-e emitida e pronta para impressão." : undefined
      });

      // Se a NFC-e foi emitida, oferece impressão imediata via WebUSB
      if (data.fiscal && data.fiscal.success) {
        try {
          const settingsRes = await fetch("/api/fiscal/settings");
          const settings = await settingsRes.json();
          await printNFCe(data.fiscal.nfce, settings);
          toast({ title: "Impressão enviada!" });
        } catch (e) {
          toast({ 
            title: "Impressão Manual", 
            description: "Não foi possível conectar à impressora USB automaticamente.",
            variant: "destructive"
          });
        }
      }
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
    
    const remaining = total - payments.reduce((sum, p) => sum + p.amount, 0);
    if (remaining <= 0) return;

    setCurrentMethod(method);
    setCustomerAmount((remaining / 100).toFixed(2));
    setPaymentModalOpen(true);
  };

  const addPayment = () => {
    const amount = Math.round(Number(customerAmount.replace(",", ".")) * 100);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Valor Inválido", variant: "destructive" });
      return;
    }

    const remaining = total - payments.reduce((sum, p) => sum + p.amount, 0);
    const finalAmount = Math.min(amount, remaining);

    if (currentMethod) {
      setPayments(prev => [...prev, { method: currentMethod, amount: finalAmount }]);
      setCustomerAmount("");
      setCurrentMethod(null);
      setPaymentModalOpen(false);
    }
  };

  const removePayment = (index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  };

  const finalizeSale = () => {
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid < total) {
      toast({ title: "Pagamento Incompleto", description: `Faltam R$ ${((total - totalPaid) / 100).toFixed(2)}`, variant: "destructive" });
      return;
    }

    saleMutation.mutate({
      sale: { 
        totalAmount: total,
        customerName: customerInfo.name || null,
        customerTaxId: customerInfo.taxId || null,
        customerEmail: customerInfo.email || null,
        fiscalStatus: "pending",
        status: "completed"
      },
      items: cart.map(i => ({ itemType: 'product', itemId: i.item.id, quantity: i.quantity, unitPrice: i.item.price, totalPrice: i.item.price * i.quantity })),
      payments: payments
    });
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingTotal = total - totalPaid;

  if (isLoadingRegister) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div>;

  if (!register) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-6">
        <Card className="w-full max-w-lg bg-zinc-900/80 backdrop-blur-xl border-white/10 shadow-2xl rounded-2xl overflow-hidden border-t-4 border-t-primary">
          <CardHeader className="flex flex-row items-center gap-6 p-8 bg-white/5">
            <Button variant="ghost" size="icon" className="text-white hover:text-primary hover:bg-white/5 w-12 h-12 rounded-full" onClick={() => setLocation("/")}><ArrowLeft className="w-7 h-7" /></Button>
            <div className="flex flex-col"><CardTitle className="text-white uppercase italic tracking-tighter text-3xl font-black leading-none">Abertura de Caixa</CardTitle></div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="space-y-3">
              <label className="text-white/40 text-xs uppercase font-black tracking-widest pl-1">Saldo Inicial (R$)</label>
              <Input 
                type="text" 
                inputMode="decimal"
                value={openingAmount} 
                onChange={(e) => setOpeningAmount(e.target.value)} 
                className="bg-black border-white/10 text-white h-14 text-2xl font-black italic rounded-xl focus:border-primary/50" 
              />
            </div>
            <Button 
              className="w-full bg-[#00e5ff] text-white font-black uppercase italic h-14 text-lg rounded-xl active:scale-95 transition-transform" 
              disabled={openMutation.isPending} 
              onClick={(e) => {
                e.preventDefault();
                const amount = Number(openingAmount.replace(",", "."));
                openMutation.mutate(amount || 0);
              }}
            >
              {openMutation.isPending ? <Loader2 className="animate-spin" /> : "Iniciar Turno"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <CashierContent 
      register={register}
      menuItems={menuItems}
      cart={cart}
      setCart={setCart}
      addToCart={addToCart}
      removeFromCart={removeFromCart}
      total={total}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      filteredMenuItems={filteredMenuItems}
      searchTicket={searchTicket}
      setSearchTicket={setSearchTicket}
      loadTicketMutation={loadTicketMutation}
      payments={payments}
      setPayments={setPayments}
      currentMethod={currentMethod}
      setCurrentMethod={setCurrentMethod}
      customerAmount={customerAmount}
      setCustomerAmount={setCustomerAmount}
      paymentModalOpen={paymentModalOpen}
      setPaymentModalOpen={setPaymentModalOpen}
      customerInfo={customerInfo}
      setCustomerInfo={setCustomerInfo}
      showFiscalFields={showFiscalFields}
      setShowFiscalFields={setShowFiscalFields}
      finalizeSale={finalizeSale}
      saleMutation={saleMutation}
      remainingTotal={remainingTotal}
    />
  );
}

function CashierContent({ 
  register, menuItems, cart, setCart, addToCart, removeFromCart, total, 
  searchTerm, setSearchTerm, filteredMenuItems, searchTicket, setSearchTicket, 
  loadTicketMutation, payments, setPayments, currentMethod, setCurrentMethod, 
  customerAmount, setCustomerAmount, paymentModalOpen, setPaymentModalOpen, 
  customerInfo, setCustomerInfo, showFiscalFields, setShowFiscalFields, 
  finalizeSale, saleMutation, remainingTotal 
}: any) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: fiscalSettingsData } = useQuery<FiscalSettings>({
    queryKey: ["/api/fiscal/settings"],
  });

  const toggleSimulacaoMutation = useMutation({
    mutationFn: async (val: boolean) => {
      await apiRequest("POST", "/api/fiscal/settings", { ...fiscalSettingsData, simulacaoReal: val });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiscal/settings"] });
      toast({ title: `Simulação Real ${!fiscalSettingsData?.simulacaoReal ? 'ATIVADA' : 'DESATIVADA'}` });
    }
  });

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
    
    const remaining = total - payments.reduce((sum: number, p: any) => sum + p.amount, 0);
    if (remaining <= 0) return;

    setCurrentMethod(method);
    setCustomerAmount((remaining / 100).toFixed(2));
    setPaymentModalOpen(true);
  };

  const removePayment = (index: number) => {
    setPayments((prev: any[]) => prev.filter((_, i) => i !== index));
  };

      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-md p-10 rounded-2xl shadow-2xl">
          <DialogHeader><DialogTitle className="text-white uppercase italic tracking-tighter text-2xl font-black">Pagamento: <span className="text-primary">{currentMethod?.toUpperCase()}</span></DialogTitle></DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="flex justify-between items-center"><span className="text-zinc-500 uppercase font-black text-xs">Total Restante</span><span className="text-3xl font-black italic text-red-500">R$ {(remainingTotal / 100).toFixed(2)}</span></div>
            <div className="space-y-4">
              <label className="text-zinc-500 text-[10px] uppercase font-black">Valor a Pagar</label>
              <Input 
                type="text" 
                value={customerAmount} 
                onChange={(e) => setCustomerAmount(e.target.value)} 
                className="bg-black border-white/10 text-white text-4xl h-20 font-black italic rounded-2xl text-center" 
                autoFocus 
              />
            </div>
            <Button className="w-full h-16 bg-primary text-black font-black uppercase italic text-xl rounded-xl" onClick={addPayment}>
              ADICIONAR PAGAMENTO
            </Button>
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
