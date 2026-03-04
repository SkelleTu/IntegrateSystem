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
import { BackgroundIcons } from "@/components/BackgroundIcons";

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

  const addToCart = useCallback((item: MenuItem & { unitType?: string }) => {
    if (item.unitType === "kg") {
      const weightStr = prompt(`Informe o peso para ${item.name} (kg):`, "1.000");
      if (weightStr === null) return;
      const weight = parseFloat(weightStr.replace(",", "."));
      if (isNaN(weight) || weight <= 0) {
        toast({ title: "Peso Inválido", variant: "destructive" });
        return;
      }
      setCart((prev) => {
        const existingIdx = prev.findIndex((i) => i.item.id === item.id);
        if (existingIdx >= 0) {
          const newCart = [...prev];
          const newQuantity = Math.round((newCart[existingIdx].quantity + weight) * 1000) / 1000;
          newCart[existingIdx] = { ...newCart[existingIdx], quantity: newQuantity };
          return newCart;
        }
        return [...prev, { item, quantity: weight }];
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  }, [toast]);

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
    setCart((prev) => {
      const existing = prev.find(i => i.item.id === itemId);
      if (existing && (existing.item as any).unitType === "kg") {
        return prev.filter(i => i.item.id !== itemId);
      }
      return prev
        .map((i) => (i.item.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0);
    });
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

  const total = useMemo(() => {
    return cart.reduce((sum, i) => {
      const price = i.item.price;
      return sum + Math.round(price * i.quantity);
    }, 0);
  }, [cart]);

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
      items: cart.map(i => {
        const isKg = (i.item as any).unitType === "kg";
        return { 
          itemType: 'product', 
          itemId: i.item.id, 
          // Para produtos por quilo, a quantidade é enviada em gramas (inteiro)
          // Para unidade, permanece como inteiro
          quantity: isKg ? Math.round(i.quantity * 1000) : Math.round(i.quantity), 
          unitPrice: i.item.price, 
          totalPrice: Math.round(i.item.price * i.quantity) 
        };
      }),
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
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      <BackgroundIcons />
      {/* Header compactado e fixo no topo */}
      <div className="flex flex-row items-center gap-4 p-4 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md shrink-0 z-50">
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

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden relative">
        {/* Area Principal de Produtos */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4">
          <div className="w-full flex justify-end mb-4 shrink-0">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => finalizeSale(true)}
              className="bg-blue-500/10 border-blue-500/20 text-blue-400 font-black uppercase italic tracking-widest text-[10px] h-10 px-6 hover:bg-blue-500 hover:text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)]"
            >
              <Play className="w-4 h-4 mr-2" /> Venda Simulação (Teste)
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-3 pb-32 lg:pb-8">
              {filteredMenuItems?.map((item: any) => (
                <motion.div key={item.id} whileHover={{ y: -5 }} whileTap={{ scale: 0.95 }} onClick={() => addToCart(item as any)} className="cursor-pointer h-full">
                  <Card className="h-full panel-translucent overflow-hidden hover:border-primary/50 transition-all flex flex-col border-white/5 bg-zinc-900/40">
                    <div className="h-24 md:h-32 overflow-hidden rounded-t-lg bg-zinc-800/50 flex items-center justify-center border-b border-white/5 relative group">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          className="w-full h-full object-contain p-2 transition-all duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <Package className="h-10 w-10 text-white/5" />
                      )}
                    </div>
                    <CardContent className="p-3 flex flex-col flex-1 justify-between gap-2">
                      <div className="space-y-1">
                        <h3 className="text-white font-black text-[10px] md:text-xs uppercase italic line-clamp-2 leading-tight">{item.name}</h3>
                        <p className="text-white/40 text-[8px] font-bold uppercase tracking-wider">
                          {(item as any).unitType === "kg" ? "Preço por Kg" : "Preço Unitário"}
                        </p>
                      </div>
                      <p className="text-primary font-black text-sm md:text-lg italic">R$ {(item.price / 100).toFixed(2)}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Direita / Carrinho */}
        <div className="w-full lg:w-[400px] shrink-0 border-l border-white/10 bg-zinc-950/30 backdrop-blur-xl flex flex-col h-full min-h-0 relative z-40">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-white/5 space-y-3 bg-white/5">
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <Input 
                    placeholder="BIPAR CÓDIGO OU BUSCAR..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12 bg-black border-white/10 text-xs font-black italic rounded-xl focus:border-primary/50 text-white" 
                    autoFocus
                  />
                </div>
                <div className="relative">
                  <Input 
                    placeholder="COMANDA #" 
                    value={searchTicket}
                    onChange={(e) => setSearchTicket(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadTicketMutation.mutate(searchTicket)}
                    className="h-12 bg-black border-white/10 text-xs font-black italic rounded-xl focus:border-primary/50 pr-12 text-white" 
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 text-primary hover:bg-primary/10"
                    onClick={() => loadTicketMutation.mutate(searchTicket)}
                    disabled={loadTicketMutation.isPending}
                  >
                    {loadTicketMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="w-4 h-4 text-primary" />
                <h3 className="text-white font-black uppercase italic text-xs tracking-tighter">Itens no <span className="text-primary">Carrinho</span></h3>
              </div>

              {cart.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-white/10 gap-2">
                  <ShoppingCart className="w-12 h-12 opacity-5" />
                  <p className="font-black uppercase text-[10px] tracking-widest">Carrinho Vazio</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(({ item, quantity }: any) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white text-[10px] font-black uppercase truncate leading-tight">{item.name}</h4>
                        <div className="flex items-center gap-2">
                          <p className="text-primary text-[10px] font-bold">R$ {(item.price / 100).toFixed(2)}</p>
                          <span className="text-white/20 text-[8px] font-bold uppercase italic">
                            {(item as any).unitType === "kg" ? "kg" : "un"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-black/60 p-1 rounded-lg border border-white/10 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-white/60 hover:text-white" onClick={() => removeFromCart(item.id)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-white font-black text-xs italic w-14 text-center">
                          {(item as any).unitType === "kg" ? quantity.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : quantity}
                        </span>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary hover:bg-primary/10" onClick={() => addToCart(item as any)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-zinc-900/95 backdrop-blur-xl border-t border-white/10 space-y-2 shrink-0 pb-[50px] lg:pb-[45px]">
              {payments.length > 0 && (
                <div className="space-y-1 pb-1 border-b border-white/5">
                  <p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest leading-none">Pagamentos</p>
                  {payments.map((p: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center bg-white/5 px-2 py-0.5 rounded text-[8px] border border-white/5">
                      <span className="text-white/60 uppercase font-black italic">{p.method}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-black">R$ {(p.amount / 100).toFixed(2)}</span>
                        <Button variant="ghost" size="icon" className="h-3.5 w-3.5 text-red-500 hover:bg-red-500/10 p-0" onClick={() => removePayment(idx)}>
                          <Minus className="w-2 h-2" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {remainingTotal > 0 && (
                    <div className="flex justify-between items-center px-1">
                      <span className="text-red-500/60 uppercase font-black text-[8px] italic">Falta pagar</span>
                      <span className="text-red-500 font-black text-[10px]">R$ {(remainingTotal / 100).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              <AnimatePresence>
                {showFiscalFields && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }} 
                    animate={{ opacity: 1, height: "auto", marginBottom: 4 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="space-y-1 overflow-hidden"
                  >
                    <p className="text-[8px] font-black uppercase text-primary tracking-widest leading-none">Identificação NFC-e</p>
                    <Input 
                      placeholder="CPF/CNPJ" 
                      value={customerInfo.taxId} 
                      onChange={e => setCustomerInfo((prev: any) => ({ ...prev, taxId: e.target.value }))}
                      className="h-7 bg-black border-white/10 text-[9px] font-black italic rounded text-white"
                    />
                    <Input 
                      placeholder="NOME COMPLETO" 
                      value={customerInfo.name} 
                      onChange={e => setCustomerInfo((prev: any) => ({ ...prev, name: e.target.value }))}
                      className="h-7 bg-black border-white/10 text-[9px] font-black italic rounded text-white"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-end justify-between">
                <span className="text-white/40 font-black uppercase text-[8px] tracking-[0.2em] pb-0.5">Total Geral</span>
                <span className="text-primary text-2xl font-black italic tracking-tighter drop-shadow-[0_0_10px_rgba(0,229,255,0.3)] leading-none">
                  R$ {(total / 100).toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1">
                <Button variant="outline" className={`flex flex-col h-10 border-white/10 transition-colors ${showFiscalFields ? 'bg-primary/20 text-primary border-primary/50' : 'bg-black text-white'}`} onClick={handleFiscalToggle}>
                  <Landmark className="w-3.5 h-3.5 mb-0.5" />
                  <span className="text-[6px] font-black uppercase">CPF</span>
                </Button>
                <Button variant="outline" className="flex flex-col h-10 border-white/10 bg-black text-white" disabled={remainingTotal <= 0} onClick={() => handlePayment('cash')}>
                  <Banknote className="w-3.5 h-3.5 mb-0.5 text-green-500" />
                  <span className="text-[6px] font-black uppercase">DIN</span>
                </Button>
                <Button variant="outline" className="flex flex-col h-10 border-white/10 bg-black text-white" disabled={remainingTotal <= 0} onClick={() => handlePayment('card')}>
                  <CreditCard className="w-3.5 h-3.5 mb-0.5 text-blue-500" />
                  <span className="text-[6px] font-black uppercase">CART</span>
                </Button>
                <Button variant="outline" className="flex flex-col h-10 border-white/10 bg-black text-white" disabled={remainingTotal <= 0} onClick={() => handlePayment('pix')}>
                  <QrCode className="w-3.5 h-3.5 mb-0.5 text-primary" />
                  <span className="text-[6px] font-black uppercase">PIX</span>
                </Button>
              </div>

              <Button 
                className="w-full h-12 bg-primary text-black font-black uppercase italic text-sm rounded-lg shadow-[0_0_20px_rgba(0,229,255,0.2)] hover:scale-[1.01] active:scale-95 transition-all" 
                onClick={() => finalizeSale(false)} 
                disabled={saleMutation.isPending || cart.length === 0}
              >
                {saleMutation.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : "FINALIZAR VENDA"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-md p-10 rounded-3xl shadow-2xl z-[999]">
          <DialogHeader>
            <DialogTitle className="text-white uppercase italic tracking-tighter text-3xl font-black">
              PAGAMENTO: <span className="text-primary">{currentMethod?.toUpperCase()}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-8 pt-6">
            <div className="flex justify-between items-center bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
              <span className="text-zinc-500 uppercase font-black text-xs tracking-widest">Total Restante</span>
              <span className="text-4xl font-black italic text-red-500">R$ {(remainingTotal / 100).toFixed(2)}</span>
            </div>
            <div className="space-y-4">
              <label className="text-zinc-500 text-[10px] uppercase font-black tracking-widest pl-2">Valor a Pagar</label>
              <Input 
                type="text" 
                value={customerAmount} 
                onChange={(e) => setCustomerAmount(e.target.value)} 
                className="bg-black border-white/10 text-white text-5xl h-24 font-black italic rounded-3xl text-center focus:border-primary/50 shadow-inner" 
                autoFocus 
              />
            </div>
            <Button className="w-full h-20 bg-primary text-black font-black uppercase italic text-2xl rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg" onClick={addPayment}>
              CONFIRMAR VALOR
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
