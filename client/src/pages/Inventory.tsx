import { useQuery, useMutation } from "@tanstack/react-query";
import { Inventory, MenuItem, Category, InventoryRestock } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, Plus, Loader2, Search, RefreshCw, ChevronDown, ChevronUp, Clock, Upload, ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { format, addDays, isBefore, differenceInDays } from "date-fns";
import Fuse from "fuse.js";

export default function InventoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: number, type: "product" | "service" } | null>(null);
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [unit, setUnit] = useState("Unidade");
  const [itemsPerUnit, setItemsPerUnit] = useState("1");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [customUnit, setCustomUnit] = useState("");

  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [imageUrl, setImageUrl] = useState(""); // Novo estado para imagem
  const [viewMode, setViewMode] = useState<"package" | "unit">("package");
  const [sortBy, setSortBy] = useState<"name" | "price" | "quantity">("name");

  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [restockItem, setRestockItem] = useState<any>(null);
  const [restockQuantity, setRestockQuantity] = useState("");
  const [restockUnit, setRestockUnit] = useState("");
  const [restockItemsPerUnit, setRestockItemsPerUnit] = useState("");
  const [restockCostPrice, setRestockCostPrice] = useState("");
  const [restockExpiryDate, setRestockExpiryDate] = useState("");

  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const { data: allRestocks = [] } = useQuery<InventoryRestock[]>({
    queryKey: ["/api/inventory-restocks"],
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  const restocksByInventoryId = useMemo(() => {
    const map: Record<number, InventoryRestock[]> = {};
    allRestocks.forEach(r => {
      if (!map[r.inventoryId]) map[r.inventoryId] = [];
      map[r.inventoryId].push(r);
    });
    return map;
  }, [allRestocks]);

  const getExpiryUrgency = (date: any): "safe" | "blue" | "yellow" | "red" => {
    if (!date) return "safe";
    const expiry = new Date(date);
    const today = new Date();
    const daysUntilExpiry = differenceInDays(expiry, today);
    
    if (daysUntilExpiry <= 3) return "red";
    if (daysUntilExpiry <= 7) return "yellow";
    if (daysUntilExpiry <= 14) return "blue";
    return "safe";
  };

  const getItemRestockUrgency = (inventoryId: number): "safe" | "blue" | "yellow" | "red" => {
    const restocks = restocksByInventoryId[inventoryId] || [];
    let worstUrgency: "safe" | "blue" | "yellow" | "red" = "safe";
    const urgencyPriority = { safe: 0, blue: 1, yellow: 2, red: 3 };
    
    restocks.forEach(r => {
      const urgency = getExpiryUrgency(r.expiryDate);
      if (urgencyPriority[urgency] > urgencyPriority[worstUrgency]) {
        worstUrgency = urgency;
      }
    });
    
    return worstUrgency;
  };

  const toggleExpanded = (id: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const unitPrice = useMemo(() => {
    const cost = Number(costPrice.replace(',', '.'));
    const perUnit = parseInt(itemsPerUnit) || 1;
    if (isNaN(cost) || perUnit <= 0) return 0;
    return cost / perUnit;
  }, [costPrice, itemsPerUnit]);

  const { data: inventory = [], isLoading: isLoadingInv } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory"],
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const inventoryWithNames = useMemo(() => {
    return inventory.map(item => {
      if (item.itemType === "product") {
        const menuItem = menuItems.find(m => m.id === item.itemId);
        return { ...item, name: menuItem?.name || item.customName || "Item desconhecido" };
      }
      return { ...item, name: item.customName || "Item customizado" };
    });
  }, [inventory, menuItems]);

  const filteredInventory = useMemo(() => {
    let items = [...inventoryWithNames];

    if (viewMode === "unit") {
      // De-normalize: show each unit as a separate entry
      const units: any[] = [];
      items.forEach(item => {
        const totalUnits = item.quantity * item.itemsPerUnit;
        for (let i = 0; i < totalUnits; i++) {
          units.push({
            ...item,
            id: `${item.id}-unit-${i}`,
            originalId: item.id,
            quantity: 1,
            unit: "Unidade",
            itemsPerUnit: 1,
            costPrice: Math.round(item.costPrice / item.itemsPerUnit),
            salePrice: item.salePrice ? Math.round(item.salePrice / item.itemsPerUnit) : null,
            isUnitView: true
          });
        }
      });
      items = units;
    }

    if (searchTerm) {
      const fuse = new Fuse(items, {
        keys: ["name", "barcode"],
        threshold: 0.3,
      });
      items = fuse.search(searchTerm).map(result => result.item);
    }

    // Sorting
    items.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "price") return (a.salePrice || 0) - (b.salePrice || 0);
      if (sortBy === "quantity") return a.quantity - b.quantity;
      return 0;
    });

    return items;
  }, [inventoryWithNames, searchTerm, viewMode, sortBy]);

  const handleEdit = (inv: any) => {
    if (!inv) return;
    setEditingId(inv.id);
    setCustomName(inv.name || inv.customName || "");
    setBarcode(inv.barcode || "");
    setQuantity(inv.quantity.toString());
    setUnit(inv.unit || "Unidade");
    setItemsPerUnit(inv.itemsPerUnit?.toString() || "1");
    setCostPrice((inv.costPrice / 100).toString().replace('.', ','));
    setSalePrice(inv.salePrice ? (inv.salePrice / 100).toString().replace('.', ',') : "");
    setImageUrl(inv.imageUrl || ""); // Carregar imagem ao editar
    setExpiryDate(inv.expiryDate ? format(new Date(inv.expiryDate), "yyyy-MM-dd") : "");
  };

  const handleDuplicate = (inv: any) => {
    if (!inv) return;
    setEditingId(null);
    setCustomName(`${inv.name} (Cópia)`);
    setBarcode("");
    setQuantity(inv.quantity.toString());
    setUnit(inv.unit || "Unidade");
    setItemsPerUnit(inv.itemsPerUnit?.toString() || "1");
    setCostPrice((inv.costPrice / 100).toString().replace('.', ','));
    setSalePrice(inv.salePrice ? (inv.salePrice / 100).toString().replace('.', ',') : "");
    setImageUrl(inv.imageUrl || ""); // Carregar imagem ao duplicar
    setExpiryDate(inv.expiryDate ? format(new Date(inv.expiryDate), "yyyy-MM-dd") : "");
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast({ title: "Copiado", description: "As informações foram copiadas para o formulário. Clique em 'Adicionar' para salvar." });
  };

  const handleBarcodeSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && barcode) {
      e.preventDefault();
      // Em scanners reais, o enter é enviado após o código
      toast({ title: "Código Detectado", description: `Código: ${barcode}` });
    }
  };

  const upsertMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/inventory", data);
      return res.json();
    },
    onSuccess: (data) => {
      console.log("Upsert success, received data:", data);
      
      // Invalidar as queries para garantir que o cache do TanStack Query seja atualizado
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items-combined"] });
        
      toast({ title: "Sucesso", description: "Item salvo com sucesso" });

      setSelectedItem(null);
      setCustomName("");
      setBarcode("");
      setEditingId(null);
      setIsCustomMode(false);
      setQuantity("");
      setExpiryDate("");
      setCostPrice("");
      setSalePrice("");
      setImageUrl("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro", 
        description: error.message || "Erro ao salvar no banco de dados. Verifique os campos.",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Sucesso", description: "Item removido do estoque" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro", 
        description: error.message || "Erro ao deletar item.",
        variant: "destructive"
      });
    }
  });

  const restockMutation = useMutation({
    mutationFn: async (data: { id: number; quantity: number; unit?: string; itemsPerUnit?: number; costPrice?: number; expiryDate?: string }) => {
      const res = await apiRequest("POST", `/api/inventory/${data.id}/restock`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Sucesso", description: "Reposição de estoque realizada com sucesso!" });
      setRestockModalOpen(false);
      setRestockItem(null);
      setRestockQuantity("");
      setRestockUnit("");
      setRestockItemsPerUnit("");
      setRestockCostPrice("");
      setRestockExpiryDate("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro", 
        description: error.message || "Erro ao fazer reposição de estoque.",
        variant: "destructive"
      });
    }
  });

  const openRestockModal = (inv: any) => {
    setRestockItem(inv);
    setRestockUnit(inv.unit || "Unidade");
    setRestockItemsPerUnit(inv.itemsPerUnit?.toString() || "1");
    setRestockQuantity("");
    setRestockCostPrice("");
    setRestockExpiryDate("");
    setRestockModalOpen(true);
  };

  const handleRestock = () => {
    if (!restockItem || !restockQuantity) return;
    
    restockMutation.mutate({
      id: restockItem.id,
      quantity: parseInt(restockQuantity),
      unit: restockUnit || undefined,
      itemsPerUnit: restockItemsPerUnit ? parseInt(restockItemsPerUnit) : undefined,
      costPrice: restockCostPrice ? Number(restockCostPrice.replace(',', '.')) : undefined,
      expiryDate: restockExpiryDate || undefined
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Falha no upload");

      const data = await res.json();
      setImageUrl(data.url);
      toast({ title: "Sucesso", description: "Foto enviada com sucesso!" });
    } catch (err) {
      toast({ 
        title: "Erro", 
        description: "Não foi possível enviar a imagem.", 
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isExpiringSoon = (date: any) => {
    if (!date) return false;
    const expiry = new Date(date);
    const warningDate = addDays(new Date(), 7);
    return isBefore(expiry, warningDate);
  };

  const handleUpsert = () => {
    if (!customName) return;
    if (!quantity) return;

    // Verificar se o barcode já existe na lista local antes de enviar
    if (barcode) {
      const existing = inventoryWithNames.find(item => 
        item.barcode === barcode && item.id !== editingId
      );
      if (existing) {
        toast({
          title: "ID em uso",
          description: `O código "${barcode}" já pertence ao item: ${existing.name}. Use um código diferente.`,
          variant: "destructive"
        });
        return;
      }
    }

    const itemData = {
      id: editingId,
      itemId: null,
      itemType: "custom",
      customName: customName,
      barcode: barcode || null,
      quantity: parseInt(quantity),
      unit: unit === "Outros" ? customUnit : unit,
      itemsPerUnit: parseInt(itemsPerUnit),
      costPrice: Math.round(Number(costPrice.replace(',', '.')) * 100),
      salePrice: salePrice ? Math.round(Number(salePrice.replace(',', '.')) * 100) : null,
      imageUrl: imageUrl || null,
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
    };

    console.log("Saving inventory item:", itemData);
    upsertMutation.mutate(itemData);
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[80vh] p-4">
        <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-destructive font-black italic uppercase tracking-tighter text-xl">Acesso Restrito</CardTitle>
          </CardHeader>
          <CardContent className="text-white/60 font-medium">
            Somente o proprietário tem acesso ao controle de estoque.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-10 space-y-6 md:space-y-8 min-h-screen bg-transparent relative z-10 max-w-[2400px] mx-auto overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-black/40 backdrop-blur-md p-5 rounded-2xl border border-white/10 gap-4 shadow-2xl">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black italic tracking-tighter text-white uppercase leading-none">
            Gestão de <span className="text-primary">Estoque</span>
          </h1>
          <p className="text-[10px] md:text-xs font-bold text-white/40 uppercase tracking-[0.3em]">Logística & Controle de Insumos</p>
        </div>
        <Badge variant="outline" className="text-xs md:text-sm bg-primary/5 border-primary/20 text-primary px-4 py-1.5 font-black italic uppercase tracking-wider">
          Operador: {user.username}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 md:gap-8">
        <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden rounded-2xl">
          <CardHeader className="border-b border-white/5 p-6 bg-white/5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-4">
                <CardTitle className="flex items-center gap-3 text-white font-black italic uppercase tracking-tighter text-xl lg:text-2xl">
                  <Package className="h-6 w-6 lg:h-8 lg:w-8 text-primary" /> Inventário Geral
                </CardTitle>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                        <SelectTrigger className="h-10 bg-black/40 border-white/10 text-white font-bold text-[10px] uppercase tracking-wider w-full sm:w-auto sm:min-w-[220px] px-4 rounded-xl shrink-0">
                          <SelectValue placeholder="MODO VISTA" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0a0f0f] border-white/10">
                          <SelectItem value="package">Por Embalagem</SelectItem>
                          <SelectItem value="unit">Por Produto (Un.)</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                        <SelectTrigger className="h-10 bg-black/40 border-white/10 text-white font-bold text-[10px] uppercase tracking-wider w-full sm:w-auto sm:min-w-[160px] px-4 rounded-xl shrink-0">
                          <SelectValue placeholder="ORDENAR" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0a0f0f] border-white/10">
                          <SelectItem value="name">Por Nome</SelectItem>
                          <SelectItem value="price">Por Preço</SelectItem>
                          <SelectItem value="quantity">Por Qtd</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      placeholder="BUSCAR PRODUTO..."
                      className="bg-black/40 border-white/10 h-10 pl-10 text-white font-bold text-xs uppercase tracking-widest focus:border-primary/50 transition-all rounded-xl"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] lg:text-xs font-black text-primary uppercase tracking-[0.2em]">
                      Status em Tempo Real
                    </span>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest hidden sm:inline-block">
                      {filteredInventory.length} SKUs Encontrados
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 bg-black/20 p-4 rounded-xl border border-white/5 max-w-2xl w-full">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black uppercase italic text-primary tracking-widest">Adicionar / Atualizar Item</h3>
                  <div className="flex items-center gap-2">
                    <Select onValueChange={(v) => handleEdit(inventory.find(i => i.id === parseInt(v)))}>
                      <SelectTrigger className="text-[9px] font-black uppercase italic border-primary/20 text-primary h-7 bg-transparent w-40">
                        <SelectValue placeholder="EDITAR EXISTENTE" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0f0f] border-white/10 backdrop-blur-2xl">
                        {inventoryWithNames.map(inv => (
                          <SelectItem key={inv.id} value={inv.id.toString()} className="py-2 font-bold uppercase italic text-[10px] text-white">
                            {inv.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                      Nome do Produto
                    </Label>
                    <Input
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                      className="bg-black/40 border-white/10 h-9 text-xs text-white font-bold transition-all focus:border-primary/50 rounded-lg"
                      placeholder="NOME..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Embalagem</Label>
                    <Select value={unit} onValueChange={(v) => {
                      setUnit(v);
                      if (v === "Unidade") {
                        setItemsPerUnit("1");
                      }
                    }}>
                      <SelectTrigger className="bg-black/40 border-white/10 h-9 text-xs text-white font-bold rounded-lg">
                        <SelectValue placeholder="TIPO..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0f0f] border-white/10 backdrop-blur-2xl">
                        <SelectItem value="Unidade" className="py-2 font-bold uppercase italic text-[10px] text-white">Unidade</SelectItem>
                        <SelectItem value="Bag" className="py-2 font-bold uppercase italic text-[10px] text-white">Bag</SelectItem>
                        <SelectItem value="Caixa" className="py-2 font-bold uppercase italic text-[10px] text-white">Caixa</SelectItem>
                        <SelectItem value="Pacote" className="py-2 font-bold uppercase italic text-[10px] text-white">Pacote</SelectItem>
                        <SelectItem value="Outros" className="py-2 font-bold uppercase italic text-[10px] text-white">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {unit === "Outros" && (
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Especificar Embalagem</Label>
                      <Input 
                        value={customUnit} 
                        onChange={e => setCustomUnit(e.target.value)} 
                        className="bg-black/40 border-white/10 h-9 text-xs text-white font-bold focus:border-primary/50 transition-all rounded-lg"
                        placeholder="NOME DA EMBALAGEM..."
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                      {unit === "Unidade" ? "Quantidade" : "Qtd Embalagens"}
                    </Label>
                    <Input 
                      type="number" 
                      value={quantity} 
                      onChange={e => setQuantity(e.target.value)} 
                      className="bg-black/40 border-white/10 h-9 text-xs text-white font-bold focus:border-primary/50 transition-all rounded-lg"
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">URL da Foto</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={imageUrl} 
                        onChange={e => setImageUrl(e.target.value)} 
                        className="bg-black/40 border-white/10 h-9 text-xs text-white font-bold focus:border-primary/50 transition-all rounded-lg"
                        placeholder="https://..."
                      />
                      <input
                        type="file"
                        className="hidden"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 border-white/10 bg-black/40 hover:bg-white/5 rounded-lg shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        type="button"
                      >
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Upload className="h-4 w-4 text-primary" />}
                      </Button>
                    </div>
                  </div>

                  {unit !== "Unidade" && (
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Unidades por Embalagem</Label>
                      <Input 
                        type="number" 
                        value={itemsPerUnit} 
                        onChange={e => setItemsPerUnit(e.target.value)} 
                        className="bg-black/40 border-white/10 h-9 text-xs text-white font-bold focus:border-primary/50 transition-all rounded-lg"
                        placeholder="1"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Código de Barras</Label>
                    <Input 
                      value={barcode} 
                      onChange={e => setBarcode(e.target.value)} 
                      onKeyDown={handleBarcodeSubmit}
                      className="bg-black/40 border-white/10 h-9 text-xs text-white font-bold focus:border-primary/50 transition-all rounded-lg"
                      placeholder="BIPA O CÓDIGO..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Custo (R$)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={costPrice} 
                      onChange={e => setCostPrice(e.target.value)} 
                      className="bg-black/40 border-white/10 h-9 text-xs text-white font-bold focus:border-primary/50 transition-all rounded-lg"
                      placeholder="0.00"
                    />
                    {itemsPerUnit && parseInt(itemsPerUnit) > 1 && (
                      <p className="text-[9px] text-primary font-bold uppercase tracking-tighter pl-1">
                        Custo Unitário: R$ {unitPrice.toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Venda (R$)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={salePrice} 
                      onChange={e => setSalePrice(e.target.value)} 
                      className="bg-black/40 border-white/10 h-9 text-xs text-white font-bold focus:border-primary/50 transition-all rounded-lg"
                      placeholder="PREÇO..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Código / ID</Label>
                    <Input 
                      value={barcode} 
                      onChange={e => setBarcode(e.target.value)} 
                      className="bg-black/40 border-white/10 h-9 text-xs text-white font-bold focus:border-primary/50 transition-all rounded-lg"
                      placeholder="CÓDIGO..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Validade</Label>
                    <Input 
                      type="date" 
                      value={expiryDate} 
                      onChange={e => setExpiryDate(e.target.value)} 
                      className="bg-black/40 border-white/10 h-9 text-xs text-white font-bold focus:border-primary/50 transition-all [color-scheme:dark] rounded-lg"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <Button 
                      className="flex-1 bg-primary hover:bg-white text-white hover:text-black font-black italic uppercase h-9 transition-all active:scale-[0.98] rounded-lg text-[10px] tracking-tighter shadow-[0_0_15px_rgba(0,229,255,0.3)]" 
                      onClick={handleUpsert}
                      disabled={upsertMutation.isPending}
                    >
                      {upsertMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : (editingId ? "Salvar" : "Adicionar")}
                    </Button>
                    {editingId && (
                      <Button 
                        variant="ghost"
                        className="text-white/40 hover:text-white font-bold uppercase text-[9px] h-9"
                        onClick={() => {
                          setEditingId(null);
                          setCustomName("");
                          setBarcode("");
                          setQuantity("");
                          setCostPrice("");
                          setSalePrice("");
                          setExpiryDate("");
                        }}
                      >
                        X
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingInv ? (
              <div className="flex justify-center p-20"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>
            ) : (
              <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                <Table className="min-w-[800px] w-full table-fixed">
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent bg-black/40">
                      <TableHead className="text-white/40 font-black italic uppercase text-[10px] tracking-widest w-[30%] py-4 pl-4">Item</TableHead>
                      <TableHead className="text-white/40 font-black italic uppercase text-[10px] tracking-widest w-[10%] py-4">Qtd</TableHead>
                      <TableHead className="text-white/40 font-black italic uppercase text-[10px] tracking-widest w-[20%] py-4">Preços</TableHead>
                      <TableHead className="text-white/40 font-black italic uppercase text-[10px] tracking-widest w-[20%] py-4">Validade / Mín</TableHead>
                      <TableHead className="text-white/40 font-black italic uppercase text-[10px] tracking-widest text-right pr-4 w-[20%] py-4">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-20 text-white/40 italic uppercase text-xs font-black tracking-[0.4em]">
                          {searchTerm ? "Nenhum item aproximado" : "Base de dados vazia"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInventory.map((inv) => {
                        const restocks = restocksByInventoryId[inv.id] || [];
                        const hasRestocks = restocks.length > 0;
                        const isExpanded = expandedItems.has(inv.id);
                        const itemUrgency = getItemRestockUrgency(inv.id);
                        
                        const urgencyColors = {
                          safe: "",
                          blue: "border-l-4 border-l-blue-400",
                          yellow: "border-l-4 border-l-yellow-400",
                          red: "border-l-4 border-l-red-500"
                        };

                        return (
                          <>
                            <TableRow 
                              key={inv.id} 
                              className={`border-white/5 hover:bg-primary/5 transition-all group border-b last:border-0 ${urgencyColors[itemUrgency]} ${hasRestocks ? 'cursor-pointer' : ''}`}
                              onClick={() => hasRestocks && toggleExpanded(inv.id)}
                            >
                              <TableCell className="font-black italic text-white py-3 pl-4 group-hover:text-primary transition-colors tracking-tighter uppercase">
                                <div className="flex items-center gap-2 min-w-0">
                                  {hasRestocks && (
                                    <div className="flex-shrink-0">
                                      {isExpanded ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
                                    </div>
                                  )}
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="truncate text-sm leading-tight">{inv.name}</span>
                                      {itemUrgency !== "safe" && (
                                        <Badge className={`text-[8px] px-1.5 py-0 ${
                                          itemUrgency === "red" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                                          itemUrgency === "yellow" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                                          "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                        }`}>
                                          <Clock className="h-2 w-2 mr-1" />
                                          {itemUrgency === "red" ? "URGENTE" : itemUrgency === "yellow" ? "ATENÇÃO" : "EM BREVE"}
                                        </Badge>
                                      )}
                                      {hasRestocks && (
                                        <Badge className="text-[8px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                                          {restocks.length} reposi{restocks.length > 1 ? "ções" : "ção"}
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="text-[9px] text-white/40 font-bold truncate">
                                      {inv.unit} • {inv.barcode || "S/ CÓD"}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className={`${inv.quantity < (inv.minStock || 0) ? "text-red-500" : "text-primary"} font-black text-sm italic tracking-tighter`}>
                                {inv.quantity}
                              </TableCell>
                              <TableCell className="text-white/60 text-[10px] font-bold">
                                <div className="flex flex-col leading-tight">
                                  <span className="text-red-400/80">C: R$ {(inv.costPrice / 100).toFixed(2)}</span>
                                  {inv.itemsPerUnit > 1 && (
                                    <span className="text-[9px] text-white/40">Un: R$ {(inv.costPrice / 100 / inv.itemsPerUnit).toFixed(2)}</span>
                                  )}
                                  {inv.salePrice && <span className="text-green-400/80">V: R$ {(inv.salePrice / 100).toFixed(2)}</span>}
                                </div>
                              </TableCell>
                              <TableCell className="text-white/60 text-[10px] font-bold">
                                <div className="flex flex-col leading-tight">
                                  <span className={isExpiringSoon(inv.expiryDate) ? "text-red-500 animate-pulse" : ""}>
                                    VAL: {inv.expiryDate ? format(new Date(inv.expiryDate), "dd/MM/yy") : "N/A"}
                                  </span>
                                  <span className="text-white/40">MÍN: {inv.minStock || 5}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right pr-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-end items-center gap-2 flex-wrap">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 px-2 text-[10px] font-black uppercase italic text-green-400 hover:bg-green-400/10"
                                    onClick={() => openRestockModal(inv)}
                                    data-testid={`button-restock-${inv.id}`}
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Repor
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 px-2 text-[10px] font-black uppercase italic text-primary hover:bg-primary/10"
                                    onClick={() => {
                                      handleEdit(inv);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    data-testid={`button-edit-${inv.id}`}
                                  >
                                    Editar
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 px-2 text-[10px] font-black uppercase italic text-cyan-400 hover:bg-cyan-400/10"
                                    onClick={() => handleDuplicate(inv)}
                                    data-testid={`button-duplicate-${inv.id}`}
                                  >
                                    Duplicar
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 px-2 text-[10px] font-black uppercase italic text-red-500 hover:bg-red-500/10"
                                    onClick={() => {
                                      if (window.confirm(`Você tem certeza que quer Deletar "${inv.name}" do estoque?`)) {
                                        deleteMutation.mutate(inv.id);
                                      }
                                    }}
                                    disabled={deleteMutation.isPending}
                                    data-testid={`button-delete-${inv.id}`}
                                  >
                                    {deleteMutation.isPending ? <Loader2 className="animate-spin h-3 w-3" /> : "Deletar"}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            
                            {isExpanded && restocks.map((restock, idx) => {
                              const restockUrgency = getExpiryUrgency(restock.expiryDate);
                              const restockUrgencyBg = {
                                safe: "bg-black/20",
                                blue: "bg-blue-500/10",
                                yellow: "bg-yellow-500/10",
                                red: "bg-red-500/10"
                              };
                              
                              return (
                                <TableRow 
                                  key={`restock-${restock.id}`} 
                                  className={`border-white/5 ${restockUrgencyBg[restockUrgency]} border-b last:border-0`}
                                >
                                  <TableCell className="py-2 pl-12" colSpan={5}>
                                    <div className="flex items-center justify-between gap-4 text-[10px]">
                                      <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3 text-white/40" />
                                          <span className="text-white/60 font-bold">
                                            {format(new Date(restock.createdAt), "dd/MM/yy HH:mm")}
                                          </span>
                                        </div>
                                        <div className="text-white/60">
                                          <span className="font-bold">{restock.quantity}</span> {restock.unit}(s)
                                          {restock.itemsPerUnit > 1 && (
                                            <span className="text-white/40"> ({restock.itemsPerUnit} un/emb)</span>
                                          )}
                                        </div>
                                        <div className="text-red-400/80 font-bold">
                                          C: R$ {(restock.costPrice / 100).toFixed(2)}
                                          {restock.itemsPerUnit > 1 && (
                                            <span className="text-white/40 ml-1">(R$ {(restock.costPrice / 100 / restock.itemsPerUnit).toFixed(2)}/un)</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {restock.expiryDate && (
                                          <Badge className={`text-[8px] px-2 py-0.5 ${
                                            restockUrgency === "red" ? "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse" :
                                            restockUrgency === "yellow" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                                            restockUrgency === "blue" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                                            "bg-green-500/20 text-green-400 border-green-500/30"
                                          }`}>
                                            VAL: {format(new Date(restock.expiryDate), "dd/MM/yy")}
                                            {restockUrgency !== "safe" && (
                                              <span className="ml-1">
                                                ({differenceInDays(new Date(restock.expiryDate), new Date())}d)
                                              </span>
                                            )}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={restockModalOpen} onOpenChange={setRestockModalOpen}>
        <DialogContent className="bg-[#0a0f0f] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase tracking-tighter text-primary">
              <RefreshCw className="inline-block h-5 w-5 mr-2" />
              Reposição de Estoque
            </DialogTitle>
            <DialogDescription className="text-white/60 text-sm">
              {restockItem?.name && (
                <span className="font-bold text-white">{restockItem.name}</span>
              )}
              {restockItem?.barcode && (
                <span className="block text-xs text-white/40 mt-1">ID: {restockItem.barcode}</span>
              )}
              <span className="block text-xs text-primary mt-2">
                Estoque atual: {restockItem?.quantity} {restockItem?.unit}(s)
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Quantidade de Embalagens a Adicionar *
              </Label>
              <Input
                type="number"
                value={restockQuantity}
                onChange={(e) => setRestockQuantity(e.target.value)}
                className="bg-black/40 border-white/10 h-10 text-white font-bold focus:border-primary/50"
                placeholder="Ex: 10"
                data-testid="input-restock-quantity"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Tipo de Embalagem
                </Label>
                <Select value={restockUnit} onValueChange={setRestockUnit}>
                  <SelectTrigger className="bg-black/40 border-white/10 h-10 text-white font-bold" data-testid="select-restock-unit">
                    <SelectValue placeholder="Tipo..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0f0f] border-white/10">
                    <SelectItem value="Unidade">Unidade</SelectItem>
                    <SelectItem value="Bag">Bag</SelectItem>
                    <SelectItem value="Caixa">Caixa</SelectItem>
                    <SelectItem value="Pacote">Pacote</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Unidades por Embalagem
                </Label>
                <Input
                  type="number"
                  value={restockItemsPerUnit}
                  onChange={(e) => setRestockItemsPerUnit(e.target.value)}
                  className="bg-black/40 border-white/10 h-10 text-white font-bold focus:border-primary/50"
                  placeholder="Ex: 12"
                  data-testid="input-restock-items-per-unit"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Custo por Embalagem (R$)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={restockCostPrice}
                  onChange={(e) => setRestockCostPrice(e.target.value)}
                  className="bg-black/40 border-white/10 h-10 text-white font-bold focus:border-primary/50"
                  placeholder="Ex: 25.00"
                  data-testid="input-restock-cost"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Nova Validade
                </Label>
                <Input
                  type="date"
                  value={restockExpiryDate}
                  onChange={(e) => setRestockExpiryDate(e.target.value)}
                  className="bg-black/40 border-white/10 h-10 text-white font-bold focus:border-primary/50 [color-scheme:dark]"
                  data-testid="input-restock-expiry"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="ghost"
                className="flex-1 text-white/60 hover:text-white font-bold uppercase"
                onClick={() => setRestockModalOpen(false)}
                data-testid="button-restock-cancel"
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-black italic uppercase shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                onClick={handleRestock}
                disabled={!restockQuantity || restockMutation.isPending}
                data-testid="button-restock-confirm"
              >
                {restockMutation.isPending ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Confirmar Reposição
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
