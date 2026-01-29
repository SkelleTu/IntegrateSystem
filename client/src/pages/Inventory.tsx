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
import { useState, useMemo, useEffect, useCallback } from "react";
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

  const [customUnit, setCustomUnit] = useState("");

  const { data: inventory = [], isLoading: isLoadingInv } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory"],
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const upsertMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/inventory", data);
      return res.json();
    },
    onSuccess: (data) => {
      // First, remove the item from local cache to show it "disappearing"
      queryClient.setQueryData(["/api/inventory"], (oldData: Inventory[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter(item => item.id !== editingId);
      });

      // Wait a brief moment to show the "empty" state, then refetch
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
        queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
        
        toast({ title: "Sucesso", description: "Item reinserido com sucesso para limpeza de dados" });
      }, 800);

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
    onError: (error: any) => {
      toast({ 
        title: "Erro", 
        description: error.message || "Erro ao salvar no banco de dados. Verifique os campos.",
        variant: "destructive"
      });
    }
  });

  const isExpiringSoon = (date: any) => {
    if (!date) return false;
    const expiry = new Date(date);
    const warningDate = addDays(new Date(), 7);
    return isBefore(expiry, warningDate);
  };

  const handleUpsert = () => {
    if (!customName) return;
    if (!quantity) return;

    upsertMutation.mutate({
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
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
    });
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
                    <Select value={unit} onValueChange={setUnit}>
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
                    <Label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Qtd Embalagens</Label>
                    <Input 
                      type="number" 
                      value={quantity} 
                      onChange={e => setQuantity(e.target.value)} 
                      className="bg-black/40 border-white/10 h-9 text-xs text-white font-bold focus:border-primary/50 transition-all rounded-lg"
                      placeholder="0"
                    />
                  </div>

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
                      filteredInventory.map((inv) => (
                        <TableRow key={inv.id} className="border-white/5 hover:bg-primary/5 transition-all group border-b last:border-0">
                          <TableCell className="font-black italic text-white py-3 pl-4 group-hover:text-primary transition-colors tracking-tighter uppercase">
                            <div className="flex flex-col min-w-0">
                              <span className="truncate text-sm leading-tight">{inv.name}</span>
                              <span className="text-[9px] text-white/40 font-bold truncate">
                                {inv.unit} • {inv.barcode || "S/ CÓD"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className={`${inv.quantity < (inv.minStock || 0) ? "text-red-500" : "text-primary"} font-black text-sm italic tracking-tighter`}>
                            {inv.quantity}
                          </TableCell>
                          <TableCell className="text-white/60 text-[10px] font-bold">
                            <div className="flex flex-col leading-tight">
                              <span className="text-red-400/80">C: R$ {(inv.costPrice / 100).toFixed(2)}</span>
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
                          <TableCell className="text-right pr-4 py-3">
                            <div className="flex justify-end items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 px-2 text-[10px] font-black uppercase italic text-primary hover:bg-primary/10"
                                onClick={() => {
                                  handleEdit(inv);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                              >
                                Editar
                              </Button>
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
