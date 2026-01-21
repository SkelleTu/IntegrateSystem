import { useQuery, useMutation } from "@tanstack/react-query";
import { Inventory, MenuItem, Category } from "@shared/schema";
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
import { Package, AlertTriangle, Plus, Loader2, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { format, addDays, isBefore } from "date-fns";
import Fuse from "fuse.js";

export default function InventoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
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

  const { data: inventory = [], isLoading: isLoadingInv } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory"],
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const inventoryWithNames = useMemo(() => {
    return inventory
      .map(inv => ({
        ...inv,
        name: inv.itemType === "custom" ? (inv.customName || "Item Custom") : (menuItems.find(m => m.id === inv.itemId)?.name || "Item desconhecido")
      }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: 'base' }));
  }, [inventory, menuItems]);

  const filteredInventory = useMemo(() => {
    if (!searchTerm) return inventoryWithNames;

    const fuse = new Fuse(inventoryWithNames, {
      keys: ["name", "barcode", "customName"],
      threshold: 0.3,
      distance: 100,
    });

    return fuse.search(searchTerm).map(result => result.item);
  }, [inventoryWithNames, searchTerm]);

  const upsertMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/inventory", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Sucesso", description: "Estoque atualizado" });
      setSelectedItem(null);
      setCustomName("");
      setBarcode("");
      setEditingId(null);
      setIsCustomMode(false);
      setQuantity("");
      setExpiryDate("");
      setCostPrice("");
      setSalePrice("");
    },
  });

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

  const isExpiringSoon = (date: any) => {
    if (!date) return false;
    const expiry = new Date(date);
    const warningDate = addDays(new Date(), 7);
    return isBefore(expiry, warningDate);
  };

  const getItemName = (inv: Inventory) => {
    const item = menuItems.find(m => m.id === inv.itemId);
    return item?.name || "Item desconhecido";
  };

  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");

  const handleUpsert = () => {
    if (!isCustomMode && !selectedItem && !editingId) return;
    if (isCustomMode && !customName) return;
    if (!quantity) return;

    upsertMutation.mutate({
      id: editingId,
      itemId: isCustomMode ? null : selectedItem?.id,
      itemType: isCustomMode ? "custom" : selectedItem?.type,
      customName: isCustomMode ? customName : null,
      barcode: barcode || null,
      quantity: parseInt(quantity),
      unit,
      itemsPerUnit: parseInt(itemsPerUnit),
      costPrice: parseFloat(costPrice),
      salePrice: salePrice ? parseFloat(salePrice) : null,
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
    });
  };

  const handleEdit = (inv: any) => {
    setEditingId(inv.id);
    setIsCustomMode(inv.itemType === "custom");
    setCustomName(inv.customName || "");
    setBarcode(inv.barcode || "");
    setQuantity(inv.quantity.toString());
    setUnit(inv.unit);
    setItemsPerUnit(inv.itemsPerUnit.toString());
    setCostPrice((inv.costPrice / 100).toString());
    setSalePrice(inv.salePrice ? (inv.salePrice / 100).toString() : "");
    if (inv.expiryDate) {
      setExpiryDate(new Date(inv.expiryDate).toISOString().split('T')[0]);
    } else {
      setExpiryDate("");
    }
    if (inv.itemType !== "custom") {
      setSelectedItem({ id: inv.itemId, type: "product" });
    }
  };

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
                
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full sm:w-auto">
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsCustomMode(!isCustomMode)}
                    className="text-[9px] font-black uppercase italic border-primary/20 text-primary h-7"
                  >
                    {isCustomMode ? "Vincular Produto" : "Novo do Zero"}
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                      {isCustomMode ? "Nome Manual" : "Produto Vinculado"}
                    </Label>
                    {isCustomMode ? (
                      <Input
                        value={customName}
                        onChange={e => setCustomName(e.target.value)}
                        className="bg-black/40 border-white/10 h-9 text-xs text-white font-bold transition-all focus:border-primary/50 rounded-lg"
                        placeholder="NOME..."
                      />
                    ) : (
                      <Select value={selectedItem?.id.toString()} onValueChange={(v) => setSelectedItem({ id: parseInt(v), type: "product" })}>
                        <SelectTrigger className="bg-black/40 border-white/10 h-9 text-xs text-white font-bold transition-all focus:border-primary/50 rounded-lg">
                          <SelectValue placeholder="SELECIONE..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0a0f0f] border-white/10 backdrop-blur-2xl">
                          {menuItems.map(item => (
                            <SelectItem key={item.id} value={item.id.toString()} className="hover:bg-primary/20 transition-colors cursor-pointer py-2 font-bold uppercase italic text-[10px]">
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Qtd</Label>
                    <Input 
                      type="number" 
                      value={quantity} 
                      onChange={e => setQuantity(e.target.value)} 
                      className="bg-black/40 border-white/10 h-9 text-xs text-white font-bold focus:border-primary/50 transition-all rounded-lg"
                      placeholder="0"
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
                      className="flex-1 bg-primary hover:bg-white text-black font-black italic uppercase h-9 transition-all active:scale-[0.98] rounded-lg text-[10px] tracking-tighter" 
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
                      <TableHead className="text-white/40 font-black italic uppercase text-[10px] lg:text-xs tracking-widest w-[25%] py-6 pl-8">Item / Cód</TableHead>
                      <TableHead className="text-white/40 font-black italic uppercase text-[10px] lg:text-xs tracking-widest w-[10%] py-6">Qtd</TableHead>
                      <TableHead className="text-white/40 font-black italic uppercase text-[10px] lg:text-xs tracking-widest w-[15%] py-6">Preços (C/V)</TableHead>
                      <TableHead className="text-white/40 font-black italic uppercase text-[10px] lg:text-xs tracking-widest w-[15%] py-6">Tipo/Embalagem</TableHead>
                      <TableHead className="text-white/40 font-black italic uppercase text-[10px] lg:text-xs tracking-widest w-[15%] py-6">Vencimento</TableHead>
                      <TableHead className="text-white/40 font-black italic uppercase text-[10px] lg:text-xs tracking-widest text-right pr-8 w-[20%] py-6">Análise</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-32 text-white/40 italic uppercase text-sm font-black tracking-[0.4em]">
                          {searchTerm ? "Nenhum item aproximado" : "Base de dados vazia"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInventory.map((inv) => (
                        <TableRow key={inv.id} className="border-white/5 hover:bg-primary/5 transition-all group border-b last:border-0">
                          <TableCell className="font-black italic text-white py-6 lg:py-8 pl-8 truncate text-base lg:text-xl group-hover:text-primary transition-colors tracking-tighter uppercase">
                            <div className="flex flex-col">
                              <span>{inv.name}</span>
                              <div className="flex items-center gap-2 mt-1">
                                {inv.barcode && (
                                  <span className="text-[10px] text-primary/60 font-black uppercase tracking-[0.1em]">ID: {inv.barcode}</span>
                                )}
                                {inv.quantity < 0 && (
                                  <span className="text-[10px] text-red-500 font-black uppercase tracking-[0.2em]">Estoque Negativo</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className={`${inv.quantity < 0 ? "text-red-500 animate-pulse" : "text-primary"} font-black text-base lg:text-2xl italic tracking-tighter`}>
                            {inv.quantity}
                          </TableCell>
                          <TableCell className="text-white/60 text-xs lg:text-sm font-bold">
                            <div className="flex flex-col">
                              <span className="text-red-400">C: R$ {(inv.costPrice / 100).toFixed(2)}</span>
                              {inv.salePrice ? (
                                <span className="text-green-400">V: R$ {(inv.salePrice / 100).toFixed(2)}</span>
                              ) : (
                                <span className="text-zinc-500 italic">Insumo</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-white/60 truncate text-xs lg:text-sm font-bold uppercase">
                            {inv.unit} <span className="text-white/40">/</span> {inv.itemsPerUnit} un
                          </TableCell>
                          <TableCell className="text-white/40 text-xs lg:text-sm font-bold">
                            {inv.expiryDate ? format(new Date(inv.expiryDate), "dd/MM/yyyy") : "PERMANENTE"}
                          </TableCell>
                          <TableCell className="text-right pr-8 py-6 lg:py-8">
                            <div className="flex justify-end items-center gap-3">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-white/40 hover:text-primary"
                                onClick={() => handleEdit(inv)}
                              >
                                Editar
                              </Button>
                              {isExpiringSoon(inv.expiryDate) ? (
                                <Badge variant="destructive" className="bg-red-500 text-black border-none gap-1.5 animate-pulse font-black italic uppercase text-[9px] lg:text-[11px] px-3 py-1 rounded-sm shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                                  <AlertTriangle className="h-3.5 w-3.5" /> Atenção: Validade
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 font-black italic uppercase text-[9px] lg:text-[11px] px-3 py-1 rounded-sm">Estoque OK</Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
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
