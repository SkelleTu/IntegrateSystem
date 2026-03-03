import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MenuItem, CashRegister, Inventory, Nfce, FiscalSettings } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { printNFCe } from "@/lib/escpos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Plus, Minus, ShoppingCart, Banknote, CreditCard, QrCode, ArrowLeft, Landmark, Search, Package, Printer, Image as ImageIcon, Play } from "lucide-react";
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

  const { user, isLoading: isLoadingAuth } = useAuth();
  
  const { data: register, isLoading: isLoadingRegister, error: registerError } = useQuery<CashRegister | null>({
    queryKey: ["/api/cash-register/open"],
    queryFn: async () => {
      const res = await fetch("/api/cash-register/open");
      if (res.status === 401) return null;
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user,
    retry: false,
    staleTime: 30000,
  });

  const { data: fiscalSettingsData, isLoading: isLoadingFiscal, error: fiscalError } = useQuery<FiscalSettings | null>({
    queryKey: ["/api/fiscal/settings"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/fiscal/settings");
        if (res.status === 401) return null;
        if (!res.ok) return null;
        return res.json();
      } catch (err) {
        console.error("Error fetching fiscal settings:", err);
        return null;
      }
    },
    enabled: !!user,
    staleTime: 3000000,
    retry: 1,
  });

  const { data: menuItems, isLoading: isLoadingMenu, error: menuError } = useQuery<(MenuItem | (Inventory & { name: string; price: number; imageUrl: string }))[]>({
    queryKey: ["/api/menu-items-combined"],
    queryFn: async () => {
      try {
        const [menuRes, inventoryRes] = await Promise.all([
          fetch("/api/menu-items"),
          fetch("/api/inventory")
        ]);
        
        if (menuRes.status === 401 || inventoryRes.status === 401) return [];
        
        const menuData = menuRes.ok ? await menuRes.json() : [];
        const inventoryData = inventoryRes.ok ? await inventoryRes.json() : [];
        
        const combined = Array.isArray(menuData) ? [...menuData] : [];
        if (Array.isArray(inventoryData)) {
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
        }
        return combined;
      } catch (err) {
        console.error("Error fetching menu items:", err);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 300000,
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
    
    const normalizedItems = menuItems.map(item => {
      let img = (item as any).imageUrl || (item as any).image_url;
      if (img && typeof img === 'string' && (img.includes("images.unsplash.com") || img.includes("photo-1586769852836-bc069f19e1b6"))) {
        img = null;
      }
      return { ...item, imageUrl: img };
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
      
      try {
        const fiscalRes = await apiRequest("POST", `/api/fiscal/emitir/${sale.id}`);
        const fiscalData = await fiscalRes.json();
        
        if (data.sale.status === "simulation") {
          toast({ 
            title: "VENDA EM MODO SIMULAÇÃO", 
            description: "A venda foi processada sem falhas de autenticação para fins de teste.",
            className: "bg-blue-600 text-white font-black border-2 border-white"
          });
        } else if (fiscalSettingsData?.simulacaoReal) {
          toast({ 
            title: "SIMULAÇÃO REAL SEFAZ (CONFIGURAÇÃO) ATIVA", 
            description: "A venda foi processada com DADOS REAIS E LEGÍTIMOS, mas em estado de SIMULAÇÃO para fins de configuração. A nota NÃO foi enviada ao SEFAZ.",
            className: "bg-primary text-black font-black border-2 border-black"
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

      if (data.fiscal && data.fiscal.success) {
        if (window.print) {
          setTimeout(() => {
            window.print();
          }, 500);
        }

        toast({ 
          title: "Venda Finalizada", 
          description: "Clique em IMPRIMIR para selecionar a impressora.",
          action: (
            <Button 
              size="sm" 
              className="bg-primary text-black font-bold"
              onClick={async () => {
                try {
                  window.print();
                  const settingsRes = await fetch("/api/fiscal/settings");
                  const settings = await settingsRes.json();
                  if (settings.printerWidth) {
                    await printNFCe(data.fiscal.nfce, settings);
                  }
                  toast({ title: "Comando de impressão enviado!" });
                } catch (e) {
                  console.error("Erro na impressão:", e);
                  toast({ 
                    title: "Aviso de Impressão", 
                    description: "Use o diálogo do sistema (Ctrl+P) se a impressora USB não responder.",
                    variant: "default"
                  });
                }
              }}
            >
              <Printer className="w-4 h-4 mr-2" /> IMPRIMIR
            </Button>
          )
        });
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

  const finalizeSale = (isSimulation: boolean = false) => {
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid < total && !isSimulation) {
      toast({ title: "Pagamento Incompleto", description: `Faltam R$ ${((total - totalPaid) / 100).toFixed(2)}`, variant: "destructive" });
      return;
    }

    saleMutation.mutate({
      sale: { 
        totalAmount: total,
        customerName: customerInfo.name || null,
        customerTaxId: customerInfo.taxId || null,
        customerEmail: customerInfo.email || null,
        fiscalStatus: isSimulation ? "simulated" : "pending",
        status: isSimulation ? "simulation" : "completed"
      },
      items: cart.map(i => ({ itemType: 'product', itemId: i.item.id, quantity: i.quantity, unitPrice: i.item.price, totalPrice: i.item.price * i.quantity })),
      payments: isSimulation ? [{ method: "cash", amount: total }] : payments
    });
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingTotal = total - totalPaid;

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-white/40 text-xs font-black uppercase tracking-widest animate-pulse">Verificando Acesso...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-white/40 text-xs font-black uppercase tracking-widest animate-pulse">Redirecionando...</p>
      </div>
    );
  }

  if (isLoadingRegister || isLoadingFiscal || isLoadingMenu) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-white/40 text-xs font-black uppercase tracking-widest animate-pulse">Iniciando Terminal...</p>
      </div>
    );
  }

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
              type="button"
              className="w-full bg-[#00e5ff] text-white font-black uppercase italic h-14 text-lg rounded-xl active:scale-95 transition-transform" 
              disabled={openMutation.isPending} 
              onPointerDown={(e) => {
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

  const { data: fiscalSettingsData, isLoading: isLoadingFiscal } = useQuery<FiscalSettings>({
    queryKey: ["/api/fiscal/settings"],
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const [simulacaoReal, setSimulacaoReal] = useState(false);

  useEffect(() => {
    if (fiscalSettingsData) {
      setSimulacaoReal(!!fiscalSettingsData.simulacaoReal);
    }
  }, [fiscalSettingsData?.simulacaoReal]);

  const toggleSimulacaoMutation = useMutation({
    mutationFn: async (val: boolean) => {
      // Busca as configurações atuais para garantir que não estamos sobrescrevendo com dados incompletos
      const currentRes = await fetch("/api/fiscal/settings");
      const currentSettings = await currentRes.json();
      
      const updatedSettings = { 
        ...currentSettings, 
        simulacaoReal: val,
        enterpriseId: fiscalSettingsData?.enterpriseId || currentSettings.enterpriseId 
      };
      
      const res = await apiRequest("POST", "/api/fiscal/settings", updatedSettings);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/fiscal/settings"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/fiscal/settings"] });
      toast({ title: `Simulação Real ${data.simulacaoReal ? 'ATIVADA' : 'DESATIVADA'}` });
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

  const addPayment = () => {
    const amount = Math.round(Number(customerAmount.replace(",", ".")) * 100);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Valor Inválido", variant: "destructive" });
      return;
    }

    const remaining = total - payments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const finalAmount = Math.min(amount, remaining);

    if (currentMethod) {
      setPayments((prev: any[]) => [...prev, { method: currentMethod, amount: finalAmount }]);
      setCustomerAmount("");
      setCurrentMethod(null);
      setPaymentModalOpen(false);
    }
  };

  return (
    <div className="h-screen bg-transparent flex flex-col w-full overflow-hidden">
      {/* Header compactado e fixo no topo */}
      <div className="flex flex-row items-center gap-4 p-4 border-b border-white/10 panel-translucent shrink-0 rounded-none mb-0">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:text-primary hover:bg-white/5 w-10 h-10 rounded-full shrink-0" 
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex flex-col min-w-0">
          <h1 className="text-white text-xl md:text-2xl font-black uppercase italic tracking-tighter leading-none truncate">
            Terminal de <span className="text-primary">Vendas</span>
          </h1>
          <p className="text-[8px] font-bold text-white/40 uppercase tracking-[0.2em] mt-1 truncate">
            AURA System
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4 items-start flex-1 min-h-0 overflow-hidden">
        <div className="w-full flex justify-end px-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => finalizeSale(true)}
            className="bg-blue-500/10 border-blue-500/20 text-blue-400 font-black uppercase italic tracking-widest text-[10px] h-10 px-6 hover:bg-blue-500 hover:text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)]"
          >
            <Play className="w-4 h-4 mr-2" /> Venda Simulação (Teste)
          </Button>
        </div>
        <div className="flex-1 w-full h-full min-h-0 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-3 pb-4">
            {filteredMenuItems?.map((item: any) => (
              <motion.div key={item.id} whileHover={{ y: -5 }} whileTap={{ scale: 0.95 }} onClick={() => addToCart(item as any)} className="cursor-pointer h-full">
                <Card className="h-full panel-translucent overflow-hidden hover:border-primary/50 transition-all flex flex-col">
                  <div className="h-20 md:h-24 overflow-hidden rounded-t-lg bg-zinc-800 flex items-center justify-center border-b border-white/5 relative group">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-full h-full object-contain p-2 transition-all duration-500 group-hover:scale-110"
                      />
                    ) : null}
                    <div className={`flex items-center justify-center w-full h-full bg-zinc-900 fallback-icon ${item.imageUrl ? 'hidden' : ''}`}>
                      <Package className="h-8 w-8 text-white/10" />
                    </div>
                  </div>
                  <CardContent className="p-2 flex flex-col flex-1 justify-between gap-1">
                    <h3 className="text-white font-black text-[9px] md:text-[10px] uppercase italic line-clamp-2 leading-tight">{item.name}</h3>
                    <p className="text-primary font-black text-sm md:text-md italic">R$ {(item.price / 100).toFixed(2)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Sidebar Direita / Carrinho */}
        <div className="w-full lg:w-96 shrink-0 flex flex-col gap-4 h-full min-h-0">
          <Card className="flex-1 panel-translucent flex flex-col min-h-0 overflow-hidden border-white/10 shadow-2xl relative">
            <CardHeader className="border-b border-white/5 p-2 bg-white/5 space-y-2">
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <Input 
                    placeholder="BIPAR CÓDIGO OU BUSCAR..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 bg-black/60 border-white/10 text-xs font-black italic rounded-xl focus:border-primary/50" 
                    autoFocus
                  />
                </div>
                <div className="relative">
                  <Input 
                    placeholder="COMANDA #" 
                    value={searchTicket}
                    onChange={(e) => setSearchTicket(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadTicketMutation.mutate(searchTicket)}
                    className="h-10 bg-black/60 border-white/10 text-xs font-black italic rounded-xl focus:border-primary/50 pr-10" 
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-primary hover:bg-primary/10"
                    onClick={() => loadTicketMutation.mutate(searchTicket)}
                    disabled={loadTicketMutation.isPending}
                  >
                    {loadTicketMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                  <h3 className="text-white font-black uppercase italic text-xs tracking-tighter leading-none">Checkout <span className="text-primary">Ativo</span></h3>
                </div>
              </div>

              {cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-white/20 gap-2 py-6"><ShoppingCart className="w-8 h-8 opacity-10" /><p className="font-black uppercase text-[8px]">Vazio</p></div> : cart.map(({ item, quantity }: any) => (
                <div key={item.id} className="flex items-center justify-between gap-2"><div className="flex-1 min-w-0"><h4 className="text-white text-[10px] font-black uppercase truncate">{item.name}</h4><p className="text-white/40 text-[8px]">R$ {(item.price / 100).toFixed(2)}</p></div><div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5"><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeFromCart(item.id)}><Minus className="w-3 h-3" /></Button><span className="text-white font-black text-xs italic w-4 text-center">{quantity}</span><Button size="icon" variant="ghost" className="h-6 w-6 text-primary" onClick={() => addToCart(item as any)}><Plus className="w-3 h-3" /></Button></div></div>
              ))}
            </CardContent>
            <div className="p-3 border-t border-white/5 bg-black/40 space-y-3 mt-auto shrink-0">
              {payments.length > 0 && (
                <div className="space-y-1 py-1 border-b border-white/5">
                  <p className="text-[8px] font-black uppercase text-zinc-500">Pagamentos</p>
                  {payments.map((p: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center bg-white/5 px-2 py-1 rounded text-[9px]">
                      <span className="text-white/60 uppercase font-bold italic">{p.method}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-black">R$ {(p.amount / 100).toFixed(2)}</span>
                        <Button variant="ghost" size="icon" className="h-4 w-4 text-red-500 p-0" onClick={() => removePayment(idx)}>
                          <Minus className="w-2 h-2" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {remainingTotal > 0 && (
                    <div className="flex justify-between items-center px-2 py-1">
                      <span className="text-red-500/60 uppercase font-black text-[9px] italic">Restante</span>
                      <span className="text-red-500 font-black text-[9px]">R$ {(remainingTotal / 100).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
              {showFiscalFields && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: "auto" }} 
                  className="space-y-2 pb-2 border-b border-white/5"
                >
                  <p className="text-[8px] font-black uppercase text-primary">Dados do Cliente (NFC-e)</p>
                  <Input 
                    placeholder="CPF/CNPJ (Apenas números)" 
                    value={customerInfo.taxId} 
                    onChange={e => setCustomerInfo((prev: any) => ({ ...prev, taxId: e.target.value }))}
                    className="h-8 bg-black/60 border-white/10 text-[10px] font-black italic rounded-xl"
                  />
                  <Input 
                    placeholder="Nome do Cliente" 
                    value={customerInfo.name} 
                    onChange={e => setCustomerInfo((prev: any) => ({ ...prev, name: e.target.value }))}
                    className="h-8 bg-black/60 border-white/10 text-[10px] font-black italic rounded-xl"
                  />
                </motion.div>
              )}
              <div className="flex items-center justify-between gap-2"><div><span className="text-white/40 font-black uppercase text-[8px] tracking-widest">Total</span></div><span className="text-primary text-xl font-black italic tracking-tighter">R$ {(total / 100).toFixed(2)}</span></div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className={`flex flex-col h-12 border-white/10 ${showFiscalFields ? 'bg-primary/20 text-primary' : ''}`} onClick={handleFiscalToggle}><Landmark className="w-4 h-4" /><span className="text-[8px] font-black uppercase">CPF</span></Button>
                <Button variant="outline" className="flex flex-col h-12 border-white/10" disabled={remainingTotal <= 0} onClick={() => handlePayment('cash')}><Banknote className="w-4 h-4" /><span className="text-[8px] font-black uppercase">Dinheiro</span></Button>
                <Button variant="outline" className="flex flex-col h-12 border-white/10" disabled={remainingTotal <= 0} onClick={() => handlePayment('card')}><CreditCard className="w-4 h-4" /><span className="text-[8px] font-black uppercase">Cartão</span></Button>
                <Button variant="outline" className="flex flex-col h-12 border-white/10" disabled={remainingTotal <= 0} onClick={() => handlePayment('pix')}><QrCode className="w-4 h-4" /><span className="text-[8px] font-black uppercase">PIX</span></Button>
              </div>
              <Button className="w-full h-12 bg-primary text-black font-black uppercase italic text-sm rounded-xl" onClick={() => finalizeSale(false)} disabled={saleMutation.isPending}>
                {saleMutation.isPending ? <Loader2 className="animate-spin" /> : "FINALIZAR VENDA"}
              </Button>
            </div>
          </Card>
        </div>
      </div>

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
    </div>
  );
}
