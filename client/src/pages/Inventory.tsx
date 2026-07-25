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
import { Package, AlertTriangle, Plus, Loader2, Search, RefreshCw, ChevronDown, ChevronUp, Clock, Upload, ImageIcon, Landmark, Building2, FileDown, Sun, Moon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { format, addDays, isBefore, differenceInDays } from "date-fns";
import Fuse from "fuse.js";

// Helper function to extract PLU code from scale barcode
// Supports both 13-digit (EAN-13) and 20-digit Urano formats
function extractPLUFromBarcode(barcode: string): string | null {
  const normalized = barcode.trim();
  // Accept both 13-digit and 20-digit formats starting with 20/21
  if ((normalized.startsWith("20") || normalized.startsWith("21")) && 
      (normalized.length === 13 || normalized.length === 20)) {
    try {
      // PLU code is always at positions 2-6
      const pluCode = normalized.substring(2, 6);
      return pluCode;
    } catch {
      return null;
    }
  }
  return null;
}

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
  const [codigoBalanca, setCodigoBalanca] = useState("");
  const [ncm, setNcm] = useState("");
  const [cfop, setCfop] = useState("");

  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [imageUrl, setImageUrl] = useState(""); // Novo estado para imagem
  const [rotation, setRotation] = useState(0);
  const [imageScale, setImageScale] = useState(100);
  const [viewMode, setViewMode] = useState<"package" | "unit">("package");
  const [sortBy, setSortBy] = useState<"name" | "price" | "quantity">("name");

  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportOrientation, setReportOrientation] = useState<"portrait" | "landscape">("landscape");
  const [reportColumns, setReportColumns] = useState<Record<string, boolean>>({
    nome: true, barcode: true, quantidade: true, embalagem: false,
    custo: true, venda: true, validade: true, statusVal: true,
    minStock: false, reposicoes: false, ncm: false, cfop: false,
  });
  const [restockItem, setRestockItem] = useState<any>(null);
  const [restockQuantity, setRestockQuantity] = useState("");
  const [restockUnit, setRestockUnit] = useState("");
  const [restockItemsPerUnit, setRestockItemsPerUnit] = useState("");
  const [restockCostPrice, setRestockCostPrice] = useState("");
  const [restockExpiryDate, setRestockExpiryDate] = useState("");

  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [isLight, setIsLight] = useState(false);

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

  const getExpiryBadge = (date: any): { label: string; dot: string; text: string } | null => {
    if (!date) return null;
    const days = differenceInDays(new Date(date), new Date());
    if (days < 0)  return { label: "VENCIDO",   dot: "bg-red-500",    text: "text-red-400" };
    if (days <= 7) return { label: "VENCE EM BREVE", dot: "bg-yellow-400", text: "text-yellow-400" };
    return          { label: "VÁLIDO",    dot: "bg-green-400",  text: "text-green-400" };
  };

  const REPORT_COLS = [
    { key: "nome",       label: "Nome do Produto" },
    { key: "barcode",    label: "Código de Barras" },
    { key: "quantidade", label: "Quantidade" },
    { key: "embalagem",  label: "Embalagem (Un/Emb)" },
    { key: "custo",      label: "Preço de Custo" },
    { key: "venda",      label: "Preço de Venda" },
    { key: "validade",   label: "Data de Validade" },
    { key: "statusVal",  label: "Status de Validade" },
    { key: "minStock",   label: "Estoque Mínimo" },
    { key: "reposicoes", label: "Reposições" },
    { key: "ncm",        label: "NCM (Fiscal)" },
    { key: "cfop",       label: "CFOP (Fiscal)" },
  ];

  const generateReport = () => {
    const cols = REPORT_COLS.filter(c => reportColumns[c.key]);
    const now = format(new Date(), "dd/MM/yyyy HH:mm");

    const headerCells = cols.map(c => `<th>${c.label}</th>`).join("");

    const rows = inventoryWithNames.map(inv => {
      const days = inv.expiryDate ? differenceInDays(new Date(inv.expiryDate), new Date()) : null;
      const expiryStatus = days === null ? "—" : days < 0 ? "VENCIDO" : days <= 7 ? "VENCE EM BREVE" : "VÁLIDO";
      const expiryColor = days === null ? "#888" : days < 0 ? "#f87171" : days <= 7 ? "#b45309" : "#16a34a";
      const restocks = restocksByInventoryId[inv.id] || [];
      const totalRestockQty = restocks.reduce((s: number, r: any) => s + (r.quantity || 0), 0);

      const cellMap: Record<string, string> = {
        nome:       inv.name,
        barcode:    inv.barcode || "—",
        quantidade: `${inv.quantity} ${inv.unit}`,
        embalagem:  inv.itemsPerUnit > 1 ? `${inv.itemsPerUnit} un/emb` : "—",
        custo:      `R$ ${(inv.costPrice / 100).toFixed(2)}`,
        venda:      inv.salePrice ? `R$ ${(inv.salePrice / 100).toFixed(2)}` : "—",
        validade:   inv.expiryDate ? format(new Date(inv.expiryDate), "dd/MM/yyyy") : "—",
        statusVal:  `<span style="color:${expiryColor};font-weight:bold">${expiryStatus}</span>`,
        minStock:   String(inv.minStock || 5),
        reposicoes: restocks.length > 0 ? `${restocks.length} lote(s) / ${totalRestockQty} un` : "—",
        ncm:        inv.ncm || "—",
        cfop:       inv.cfop || "—",
      };

      const cells = cols.map(c => `<td>${cellMap[c.key]}</td>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("");

    const orientCSS = reportOrientation === "landscape"
      ? "@page { size: A4 landscape; } @media print { body { padding: 12px; } }"
      : "@page { size: A4 portrait; }  @media print { body { padding: 12px; } }";

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
      <title>Relatório de Estoque — ${now}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 24px; }
        h1 { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; }
        .subtitle { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        thead tr { background: #111; color: #fff; }
        thead th { padding: 7px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; white-space: nowrap; }
        tbody tr { border-bottom: 1px solid #e5e7eb; }
        tbody tr:nth-child(even) { background: #f9fafb; }
        td { padding: 6px 8px; vertical-align: middle; }
        .footer { margin-top: 24px; font-size: 9px; color: #aaa; text-align: right; }
        ${orientCSS}
      </style>
    </head><body>
      <h1>Relatório de Estoque</h1>
      <div class="subtitle">Gerado em ${now} &nbsp;|&nbsp; ${inventoryWithNames.length} produto(s) &nbsp;|&nbsp; ${reportOrientation === "landscape" ? "Paisagem" : "Retrato"}</div>
      <table>
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">Aura System &mdash; Relatório de Estoque</div>
      <script>window.onload = () => window.print();</script>
    </body></html>`;

    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
    setReportModalOpen(false);
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
    setCodigoBalanca(inv.codigoBalanca || "");
    setQuantity(inv.quantity.toString());
    setUnit(inv.unit || "Unidade");
    setItemsPerUnit(inv.itemsPerUnit?.toString() || "1");
    setCostPrice((inv.costPrice / 100).toString().replace('.', ','));
    setSalePrice(inv.salePrice ? (inv.salePrice / 100).toString().replace('.', ',') : "");
    setImageUrl(inv.imageUrl || ""); // Carregar imagem ao editar
    setRotation(inv.rotation || 0);
    setImageScale(inv.imageScale || 100);
    setNcm(inv.ncm || "");
    setCfop(inv.cfop || "");
    setExpiryDate(inv.expiryDate ? format(new Date(inv.expiryDate), "yyyy-MM-dd") : "");
  };

  const handleDuplicate = (inv: any) => {
    if (!inv) return;
    setEditingId(null);
    setCustomName(`${inv.name} (Cópia)`);
    setBarcode("");
    setCodigoBalanca("");
    setQuantity(inv.quantity.toString());
    setUnit(inv.unit || "Unidade");
    setItemsPerUnit(inv.itemsPerUnit?.toString() || "1");
    setCostPrice((inv.costPrice / 100).toString().replace('.', ','));
    setSalePrice(inv.salePrice ? (inv.salePrice / 100).toString().replace('.', ',') : "");
    setImageUrl(inv.imageUrl || ""); // Carregar imagem ao duplicar
    setRotation(inv.rotation || 0);
    setImageScale(inv.imageScale || 100);
    setNcm(inv.ncm || "");
    setCfop(inv.cfop || "");
    setExpiryDate(inv.expiryDate ? format(new Date(inv.expiryDate), "yyyy-MM-dd") : "");
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast({ title: "Copiado", description: "As informações foram copiadas para o formulário. Clique em 'Adicionar' para salvar." });
  };

  const handleBarcodeChange = (value: string) => {
    setBarcode(value);
    // Auto-extract PLU code from scale barcode
    const plu = extractPLUFromBarcode(value);
    if (plu) {
      setCodigoBalanca(plu);
    }
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
      setCodigoBalanca("");
      setEditingId(null);
      setIsCustomMode(false);
      setQuantity("");
      setExpiryDate("");
      setCostPrice("");
      setSalePrice("");
      setImageUrl("");
      setRotation(0);
      setImageScale(100);
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
    if (!customName) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }

    // Permitir quantidade 0 ou vazia (será tratada como 0 no objeto)
    
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
      codigoBalanca: codigoBalanca || null,
      quantity: quantity ? parseFloat(quantity.toString().replace(',', '.')) : 0,
      unit: unit === "Outros" ? customUnit : unit,
      itemsPerUnit: itemsPerUnit ? parseInt(itemsPerUnit.toString()) : 1,
      costPrice: costPrice ? Math.round(Number(costPrice.toString().replace(',', '.')) * 100) : 0,
      salePrice: salePrice ? Math.round(Number(salePrice.toString().replace(',', '.')) * 100) : null,
      imageUrl: imageUrl || null,
      rotation: rotation || 0,
      imageScale: imageScale || 100,
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
      ncm: ncm || null,
      cfop: cfop || null,
    };

    console.log("Saving inventory item:", itemData);
    upsertMutation.mutate(itemData);
  };

  // ─── Theme tokens ──────────────────────────────────────────────────────────
  const T = isLight ? {
    page:          "bg-slate-100",
    surface:       "bg-white border-slate-200 shadow-md",
    card:          "bg-white border-slate-200 shadow-md",
    cardHd:        "bg-slate-50 border-slate-100",
    formSection:   "bg-slate-50 border-slate-200",
    input:         "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500",
    inputDate:     "bg-white border-slate-300 text-slate-900 [color-scheme:light]",
    selectTrigger: "bg-white border-slate-300 text-slate-800",
    dropdown:      "bg-white border-slate-200",
    dropdownItem:  "text-slate-900 focus:bg-slate-100",
    h1:            "text-slate-900",
    subtitle:      "text-slate-400",
    body:          "text-slate-700",
    bodyMd:        "text-slate-600",
    muted:         "text-slate-400",
    label:         "text-slate-500",
    badge:         "bg-cyan-50 border-cyan-300 text-cyan-800",
    tableHd:       "bg-slate-100 hover:bg-transparent",
    tableHdText:   "text-slate-500",
    tableRow:      "border-slate-100 hover:bg-cyan-50/60",
    cellPrimary:   "text-slate-900",
    cellSub:       "text-slate-400",
    fiscal:        "bg-cyan-50 border-cyan-100",
    fiscalLabel:   "text-cyan-700",
    dialog:        "bg-white border-slate-200 text-slate-900",
    dialogDesc:    "text-slate-500",
    dialogLabel:   "text-slate-500",
    dialogInput:   "bg-white border-slate-300 text-slate-900 focus:border-cyan-500",
    dialogInputDate:"bg-white border-slate-300 text-slate-900 [color-scheme:light]",
    dialogDropdown:"bg-white border-slate-200",
    toggleBtn:     "bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200",
    searchIcon:    "text-slate-400",
    cardTitleText: "text-slate-900",
    restockUrgencyBg: { safe: "bg-slate-50", blue: "bg-blue-50", yellow: "bg-amber-50", red: "bg-red-50" },
  } : {
    page:          "bg-transparent",
    surface:       "bg-black/40 backdrop-blur-md border-white/10 shadow-2xl",
    card:          "bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl",
    cardHd:        "bg-white/5 border-white/5",
    formSection:   "bg-black/20 border-white/5",
    input:         "bg-black/40 border-white/10 text-white placeholder:text-white/20 focus:border-primary/50",
    inputDate:     "bg-black/40 border-white/10 text-white [color-scheme:dark]",
    selectTrigger: "bg-black/40 border-white/10 text-white",
    dropdown:      "bg-[#0a0f0f] border-white/10",
    dropdownItem:  "text-white focus:bg-white/5",
    h1:            "text-white",
    subtitle:      "text-white/40",
    body:          "text-white/60",
    bodyMd:        "text-white/60",
    muted:         "text-white/40",
    label:         "text-zinc-500",
    badge:         "bg-primary/5 border-primary/20 text-primary",
    tableHd:       "bg-black/40 hover:bg-transparent",
    tableHdText:   "text-white/40",
    tableRow:      "border-white/5 hover:bg-primary/5",
    cellPrimary:   "text-white",
    cellSub:       "text-white/40",
    fiscal:        "bg-primary/5 border-primary/10",
    fiscalLabel:   "text-primary",
    dialog:        "bg-[#0a0f0f] border-white/10 text-white",
    dialogDesc:    "text-white/60",
    dialogLabel:   "text-zinc-500",
    dialogInput:   "bg-black/40 border-white/10 text-white focus:border-primary/50",
    dialogInputDate:"bg-black/40 border-white/10 text-white [color-scheme:dark]",
    dialogDropdown:"bg-[#0a0f0f] border-white/10",
    toggleBtn:     "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20",
    searchIcon:    "text-white/40",
    cardTitleText: "text-white",
    restockUrgencyBg: { safe: "bg-black/20", blue: "bg-blue-500/10", yellow: "bg-yellow-500/10", red: "bg-red-500/10" },
  } as const;

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
    <div className={`p-4 md:p-6 lg:p-10 space-y-6 md:space-y-8 min-h-screen relative z-10 max-w-[2400px] mx-auto overflow-x-hidden transition-colors duration-300 ${T.page}`}>
      {/* ── Header ── */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-2xl border gap-4 transition-colors duration-300 ${T.surface}`}>
        <div className="space-y-1">
          <h1 className={`text-3xl md:text-4xl lg:text-5xl font-black italic tracking-tighter uppercase leading-none transition-colors duration-300 ${T.h1}`}>
            Gestão de <span className="text-primary">Estoque</span>
          </h1>
          <p className={`text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] transition-colors duration-300 ${T.subtitle}`}>Logística & Controle de Insumos</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={() => setIsLight(l => !l)}
            className={`flex items-center gap-2 h-9 px-3 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${T.toggleBtn}`}
            title={isLight ? "Mudar para tema escuro" : "Mudar para tema claro"}
          >
            {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span className="hidden sm:inline">{isLight ? "Escuro" : "Claro"}</span>
          </button>
          <Badge variant="outline" className={`text-xs md:text-sm px-4 py-1.5 font-black italic uppercase tracking-wider border transition-colors duration-300 ${T.badge}`}>
            Operador: {user.username}
          </Badge>
        </div>
      </div>

      {/* ── Main inventory card ── */}
      <div className="grid grid-cols-1 gap-6 md:gap-8">
        <Card className={`overflow-hidden rounded-2xl border transition-colors duration-300 ${T.card}`}>
          <CardHeader className={`border-b p-6 transition-colors duration-300 ${T.cardHd}`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className={`flex items-center gap-3 font-black italic uppercase tracking-tighter text-xl lg:text-2xl transition-colors duration-300 ${T.cardTitleText}`}>
                    <Package className="h-6 w-6 lg:h-8 lg:w-8 text-primary" /> Inventário Geral
                  </CardTitle>
                  <Button
                    variant="ghost"
                    onClick={() => setReportModalOpen(true)}
                    className="flex items-center gap-2 h-9 px-4 text-[10px] font-black uppercase tracking-widest border border-primary/20 bg-primary/5 text-primary hover:bg-primary/15 hover:border-primary/40 rounded-xl transition-all"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    Relatório
                  </Button>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                      <SelectTrigger className={`h-10 font-bold text-[10px] uppercase tracking-wider w-full sm:w-auto sm:min-w-[220px] px-4 rounded-xl shrink-0 border transition-colors duration-300 ${T.selectTrigger}`}>
                        <SelectValue placeholder="MODO VISTA" />
                      </SelectTrigger>
                      <SelectContent className={`border transition-colors duration-300 ${T.dropdown}`}>
                        <SelectItem value="package" className={T.dropdownItem}>Por Embalagem</SelectItem>
                        <SelectItem value="unit" className={T.dropdownItem}>Por Produto (Un.)</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                      <SelectTrigger className={`h-10 font-bold text-[10px] uppercase tracking-wider w-full sm:w-auto sm:min-w-[160px] px-4 rounded-xl shrink-0 border transition-colors duration-300 ${T.selectTrigger}`}>
                        <SelectValue placeholder="ORDENAR" />
                      </SelectTrigger>
                      <SelectContent className={`border transition-colors duration-300 ${T.dropdown}`}>
                        <SelectItem value="name" className={T.dropdownItem}>Por Nome</SelectItem>
                        <SelectItem value="price" className={T.dropdownItem}>Por Preço</SelectItem>
                        <SelectItem value="quantity" className={T.dropdownItem}>Por Qtd</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="relative w-full sm:w-80">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${T.searchIcon}`} />
                    <Input
                      placeholder="BUSCAR PRODUTO..."
                      className={`h-10 pl-10 font-bold text-xs uppercase tracking-widest transition-all rounded-xl border ${T.input}`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] lg:text-xs font-black text-primary uppercase tracking-[0.2em]">
                      Status em Tempo Real
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest hidden sm:inline-block transition-colors duration-300 ${T.muted}`}>
                      {filteredInventory.length} SKUs Encontrados
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Add/Edit form ── */}
              <div className={`flex flex-col gap-4 p-4 rounded-xl border max-w-2xl w-full transition-colors duration-300 ${T.formSection}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black uppercase italic text-primary tracking-widest">Adicionar / Atualizar Item</h3>
                  <div className="flex items-center gap-2">
                    <Select onValueChange={(v) => handleEdit(inventory.find(i => i.id === parseInt(v)))}>
                      <SelectTrigger className="text-[9px] font-black uppercase italic border-primary/20 text-primary h-7 bg-transparent w-40">
                        <SelectValue placeholder="EDITAR EXISTENTE" />
                      </SelectTrigger>
                      <SelectContent className={`backdrop-blur-2xl border transition-colors duration-300 ${T.dropdown}`}>
                        {inventoryWithNames.map(inv => (
                          <SelectItem key={inv.id} value={inv.id.toString()} className={`py-2 font-bold uppercase italic text-[10px] ${T.dropdownItem}`}>
                            {inv.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className={`text-[9px] font-bold uppercase tracking-widest pl-1 transition-colors duration-300 ${T.label}`}>
                      Nome do Produto
                    </Label>
                    <Input
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                      className={`h-9 text-xs font-bold transition-all rounded-lg border ${T.input}`}
                      placeholder="NOME..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className={`text-[9px] font-bold uppercase tracking-widest pl-1 transition-colors duration-300 ${T.label}`}>Embalagem</Label>
                    <Select value={unit} onValueChange={(v) => {
                      setUnit(v);
                      if (v === "Unidade") setItemsPerUnit("1");
                    }}>
                      <SelectTrigger className={`h-9 text-xs font-bold rounded-lg border transition-colors duration-300 ${T.selectTrigger}`}>
                        <SelectValue placeholder="TIPO..." />
                      </SelectTrigger>
                      <SelectContent className={`backdrop-blur-2xl border transition-colors duration-300 ${T.dropdown}`}>
                        {["Unidade","kg","Bag","Caixa","Pacote","Outros"].map(opt => (
                          <SelectItem key={opt} value={opt} className={`py-2 font-bold uppercase italic text-[10px] ${T.dropdownItem}`}>
                            {opt === "kg" ? "Quilo (kg)" : opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {unit === "Outros" && (
                    <div className="space-y-1.5">
                      <Label className={`text-[9px] font-bold uppercase tracking-widest pl-1 transition-colors duration-300 ${T.label}`}>Especificar Embalagem</Label>
                      <Input 
                        value={customUnit} 
                        onChange={e => setCustomUnit(e.target.value)} 
                        className={`h-9 text-xs font-bold transition-all rounded-lg border ${T.input}`}
                        placeholder="NOME DA EMBALAGEM..."
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className={`text-[9px] font-bold uppercase tracking-widest pl-1 transition-colors duration-300 ${T.label}`}>
                      {unit === "Unidade" ? "Quantidade" : "Qtd Embalagens"}
                    </Label>
                    <Input 
                      type="number" 
                      value={quantity} 
                      onChange={e => setQuantity(e.target.value)} 
                      className={`h-9 text-xs font-bold transition-all rounded-lg border ${T.input}`}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className={`text-[9px] font-bold uppercase tracking-widest pl-1 transition-colors duration-300 ${T.label}`}>URL da Foto</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={imageUrl} 
                        onChange={e => setImageUrl(e.target.value)} 
                        className={`h-9 text-xs font-bold transition-all rounded-lg border ${T.input}`}
                        placeholder="https://..."
                      />
                      <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={handleFileUpload} />
                      <Button
                        size="icon"
                        variant="outline"
                        className={`h-9 w-9 rounded-lg shrink-0 border transition-colors duration-300 ${isLight ? "bg-slate-100 border-slate-300 hover:bg-slate-200" : "border-white/10 bg-black/40 hover:bg-white/5"}`}
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
                      <Label className={`text-[9px] font-bold uppercase tracking-widest pl-1 transition-colors duration-300 ${T.label}`}>Unidades por Embalagem</Label>
                      <Input 
                        type="number" 
                        value={itemsPerUnit} 
                        onChange={e => setItemsPerUnit(e.target.value)} 
                        className={`h-9 text-xs font-bold transition-all rounded-lg border ${T.input}`}
                        placeholder="1"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className={`text-[9px] font-bold uppercase tracking-widest pl-1 transition-colors duration-300 ${T.label}`}>Código de Barras</Label>
                    <Input 
                      value={barcode} 
                      onChange={e => handleBarcodeChange(e.target.value)} 
                      onKeyDown={handleBarcodeSubmit}
                      className={`h-9 text-xs font-bold transition-all rounded-lg border ${T.input}`}
                      placeholder="BIPA O CÓDIGO..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className={`text-[9px] font-bold uppercase tracking-widest pl-1 transition-colors duration-300 ${T.label}`}>Cód. Balança (PLU)</Label>
                    <Input 
                      value={codigoBalanca} 
                      onChange={e => setCodigoBalanca(e.target.value)} 
                      className={`h-9 text-xs font-bold transition-all rounded-lg border ${T.input}`}
                      placeholder="EX: 0123"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className={`text-[9px] font-bold uppercase tracking-widest pl-1 transition-colors duration-300 ${T.label}`}>Custo (R$)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={costPrice} 
                      onChange={e => setCostPrice(e.target.value)} 
                      className={`h-9 text-xs font-bold transition-all rounded-lg border ${T.input}`}
                      placeholder="0.00"
                    />
                    {itemsPerUnit && parseInt(itemsPerUnit) > 1 && (
                      <p className="text-[9px] text-primary font-bold uppercase tracking-tighter pl-1">
                        Custo Unitário: R$ {unitPrice.toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className={`text-[9px] font-bold uppercase tracking-widest pl-1 transition-colors duration-300 ${T.label}`}>Venda (R$)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={salePrice} 
                      onChange={e => setSalePrice(e.target.value)} 
                      className={`h-9 text-xs font-bold transition-all rounded-lg border ${T.input}`}
                      placeholder="PREÇO..."
                    />
                  </div>

                  {/* ── Fiscal ── */}
                  <div className={`grid grid-cols-2 gap-2 p-3 rounded-xl border mt-2 transition-colors duration-300 ${T.fiscal}`}>
                    <div className="col-span-2 flex items-center gap-2 mb-1">
                      <Landmark className={`w-3 h-3 transition-colors duration-300 ${T.fiscalLabel}`} />
                      <span className={`font-black uppercase text-[8px] tracking-widest transition-colors duration-300 ${T.fiscalLabel}`}>Fiscal</span>
                    </div>
                    <div className="space-y-1">
                      <Label className={`text-[8px] font-bold uppercase tracking-widest pl-1 transition-colors duration-300 ${T.label}`}>NCM</Label>
                      <Input 
                        value={ncm} 
                        onChange={e => setNcm(e.target.value)}
                        className={`h-8 text-[10px] font-bold rounded-lg border transition-colors duration-300 ${T.input}`}
                        placeholder="22021000"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className={`text-[8px] font-bold uppercase tracking-widest pl-1 transition-colors duration-300 ${T.label}`}>CFOP</Label>
                      <Input 
                        value={cfop} 
                        onChange={e => setCfop(e.target.value)}
                        className={`h-8 text-[10px] font-bold rounded-lg border transition-colors duration-300 ${T.input}`}
                        placeholder="5102"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className={`text-[8px] font-bold uppercase tracking-widest pl-1 transition-colors duration-300 ${T.label}`}>Escala (%)</Label>
                      <Input 
                        type="number"
                        value={imageScale} 
                        onChange={e => setImageScale(parseInt(e.target.value) || 100)}
                        className={`h-8 text-[10px] font-bold rounded-lg border transition-colors duration-300 ${T.input}`}
                        placeholder="100"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className={`text-[8px] font-bold uppercase tracking-widest pl-1 transition-colors duration-300 ${T.label}`}>Rotação</Label>
                      <Select value={rotation.toString()} onValueChange={(v) => setRotation(parseInt(v))}>
                        <SelectTrigger className={`h-8 text-[10px] font-bold rounded-lg border transition-colors duration-300 ${T.selectTrigger}`}>
                          <SelectValue placeholder="0°" />
                        </SelectTrigger>
                        <SelectContent className={`border transition-colors duration-300 ${T.dropdown}`}>
                          {["0","90","180","270"].map(v => (
                            <SelectItem key={v} value={v} className={T.dropdownItem}>{v}°</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className={`text-[9px] font-bold uppercase tracking-widest pl-1 transition-colors duration-300 ${T.label}`}>Código / ID</Label>
                    <Input 
                      value={barcode} 
                      onChange={e => handleBarcodeChange(e.target.value)} 
                      className={`h-9 text-xs font-bold transition-all rounded-lg border ${T.input}`}
                      placeholder="CÓDIGO..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className={`text-[9px] font-bold uppercase tracking-widest pl-1 transition-colors duration-300 ${T.label}`}>Validade</Label>
                    <Input 
                      type="date" 
                      value={expiryDate} 
                      onChange={e => setExpiryDate(e.target.value)} 
                      className={`h-9 text-xs font-bold transition-all rounded-lg border ${T.inputDate}`}
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <Button 
                      className="flex-1 bg-primary hover:bg-primary/80 text-black font-black italic uppercase h-9 transition-all active:scale-[0.98] rounded-lg text-[10px] tracking-tighter shadow-[0_0_15px_rgba(0,229,255,0.3)]" 
                      onClick={handleUpsert}
                      disabled={upsertMutation.isPending || !customName}
                    >
                      {upsertMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : (editingId ? "Salvar" : "Adicionar")}
                    </Button>
                    {editingId && (
                      <Button 
                        variant="ghost"
                        className={`font-bold uppercase text-[9px] h-9 transition-colors duration-300 ${isLight ? "text-slate-400 hover:text-slate-700" : "text-white/40 hover:text-white"}`}
                        onClick={() => {
                          setEditingId(null); setCustomName(""); setBarcode(""); setQuantity("");
                          setCostPrice(""); setSalePrice(""); setExpiryDate(""); setImageUrl("");
                          setRotation(0); setImageScale(100);
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

          {/* ── Table ── */}
          <CardContent className="p-0">
            {isLoadingInv ? (
              <div className="flex justify-center p-20"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>
            ) : (
              <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                <Table className="min-w-[800px] w-full table-fixed">
                  <TableHeader>
                    <TableRow className={`border-b transition-colors duration-300 ${T.tableHd}`}>
                      <TableHead className={`font-black italic uppercase text-[10px] tracking-widest w-[30%] py-4 pl-4 transition-colors duration-300 ${T.tableHdText}`}>Item</TableHead>
                      <TableHead className={`font-black italic uppercase text-[10px] tracking-widest w-[10%] py-4 transition-colors duration-300 ${T.tableHdText}`}>Qtd</TableHead>
                      <TableHead className={`font-black italic uppercase text-[10px] tracking-widest w-[20%] py-4 transition-colors duration-300 ${T.tableHdText}`}>Preços</TableHead>
                      <TableHead className={`font-black italic uppercase text-[10px] tracking-widest w-[20%] py-4 transition-colors duration-300 ${T.tableHdText}`}>Validade / Mín</TableHead>
                      <TableHead className={`font-black italic uppercase text-[10px] tracking-widest text-right pr-4 w-[20%] py-4 transition-colors duration-300 ${T.tableHdText}`}>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className={`text-center py-20 italic uppercase text-xs font-black tracking-[0.4em] transition-colors duration-300 ${T.muted}`}>
                          {searchTerm ? "Nenhum item aproximado" : "Base de dados vazia"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInventory.map((inv) => {
                        const restocks = restocksByInventoryId[inv.id] || [];
                        const hasRestocks = restocks.length > 0;
                        const isExpanded = expandedItems.has(inv.id);
                        const itemUrgency = getItemRestockUrgency(inv.id);
                        
                        const urgencyBorder = {
                          safe: "",
                          blue: "border-l-4 border-l-blue-400",
                          yellow: "border-l-4 border-l-yellow-400",
                          red: "border-l-4 border-l-red-500"
                        };

                        return (
                          <>
                            <TableRow 
                              key={inv.id} 
                              className={`transition-all group border-b last:border-0 ${T.tableRow} ${urgencyBorder[itemUrgency]} ${hasRestocks ? 'cursor-pointer' : ''}`}
                              onClick={() => hasRestocks && toggleExpanded(inv.id)}
                            >
                              <TableCell className={`font-black italic py-3 pl-4 group-hover:text-primary transition-colors tracking-tighter uppercase ${T.cellPrimary}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  {hasRestocks && (
                                    <div className="flex-shrink-0">
                                      {isExpanded
                                        ? <ChevronUp className="h-4 w-4 text-primary" />
                                        : <ChevronDown className={`h-4 w-4 ${T.muted}`} />}
                                    </div>
                                  )}
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="truncate text-sm leading-tight">{inv.name}</span>
                                      {itemUrgency !== "safe" && (
                                        <Badge className={`text-[8px] px-1.5 py-0 ${
                                          itemUrgency === "red"    ? "bg-red-500/20 text-red-500 border-red-500/40" :
                                          itemUrgency === "yellow" ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/40" :
                                                                     "bg-blue-500/20 text-blue-500 border-blue-500/40"
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
                                    <span className={`text-[9px] font-bold truncate transition-colors duration-300 ${T.cellSub}`}>
                                      {inv.unit} • {inv.barcode || "S/ CÓD"}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className={`${inv.quantity < (inv.minStock || 0) ? "text-red-500" : "text-primary"} font-black text-sm italic tracking-tighter`}>
                                {inv.quantity}
                              </TableCell>
                              <TableCell className={`text-[10px] font-bold transition-colors duration-300 ${T.bodyMd}`}>
                                <div className="flex flex-col leading-tight">
                                  <span className="text-red-500 font-bold">C: R$ {(inv.costPrice / 100).toFixed(2)}</span>
                                  {inv.itemsPerUnit > 1 && (
                                    <span className={`text-[9px] transition-colors duration-300 ${T.muted}`}>Un: R$ {(inv.costPrice / 100 / inv.itemsPerUnit).toFixed(2)}</span>
                                  )}
                                  {inv.salePrice && <span className="text-green-600 font-bold">V: R$ {(inv.salePrice / 100).toFixed(2)}</span>}
                                </div>
                              </TableCell>
                              <TableCell className={`text-[10px] font-bold transition-colors duration-300 ${T.bodyMd}`}>
                                <div className="flex flex-col leading-tight gap-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>VAL: {inv.expiryDate ? format(new Date(inv.expiryDate), "dd/MM/yy") : "N/A"}</span>
                                    {inv.expiryDate && (() => {
                                      const badge = getExpiryBadge(inv.expiryDate);
                                      if (!badge) return null;
                                      return (
                                        <span className="flex items-center gap-1">
                                          <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${badge.dot}`} />
                                          <span className={`text-[8px] font-black uppercase tracking-wide ${badge.text}`}>{badge.label}</span>
                                        </span>
                                      );
                                    })()}
                                  </div>
                                  <span className={`transition-colors duration-300 ${T.muted}`}>MÍN: {inv.minStock || 5}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right pr-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-end items-center gap-2 flex-wrap">
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-black uppercase italic text-green-600 hover:bg-green-500/10"
                                    onClick={() => openRestockModal(inv)} data-testid={`button-restock-${inv.id}`}>
                                    <RefreshCw className="h-3 w-3 mr-1" /> Repor
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-black uppercase italic text-primary hover:bg-primary/10"
                                    onClick={() => { handleEdit(inv); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    data-testid={`button-edit-${inv.id}`}>
                                    Editar
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-black uppercase italic text-cyan-600 hover:bg-cyan-400/10"
                                    onClick={() => handleDuplicate(inv)} data-testid={`button-duplicate-${inv.id}`}>
                                    Duplicar
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-black uppercase italic text-red-500 hover:bg-red-500/10"
                                    onClick={() => { if (window.confirm(`Você tem certeza que quer Deletar "${inv.name}" do estoque?`)) deleteMutation.mutate(inv.id); }}
                                    disabled={deleteMutation.isPending} data-testid={`button-delete-${inv.id}`}>
                                    {deleteMutation.isPending ? <Loader2 className="animate-spin h-3 w-3" /> : "Deletar"}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            
                            {isExpanded && restocks.map((restock) => {
                              const restockUrgency = getExpiryUrgency(restock.expiryDate);
                              return (
                                <TableRow 
                                  key={`restock-${restock.id}`} 
                                  className={`border-b last:border-0 transition-colors duration-300 ${T.restockUrgencyBg[restockUrgency]} ${isLight ? "border-slate-100" : "border-white/5"}`}
                                >
                                  <TableCell className="py-2 pl-12" colSpan={5}>
                                    <div className="flex items-center justify-between gap-4 text-[10px]">
                                      <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1">
                                          <Clock className={`h-3 w-3 transition-colors duration-300 ${T.muted}`} />
                                          <span className={`font-bold transition-colors duration-300 ${T.bodyMd}`}>
                                            {format(new Date(restock.createdAt), "dd/MM/yy HH:mm")}
                                          </span>
                                        </div>
                                        <div className={`transition-colors duration-300 ${T.bodyMd}`}>
                                          <span className="font-bold">{restock.quantity}</span> {restock.unit}(s)
                                          {restock.itemsPerUnit > 1 && (
                                            <span className={`transition-colors duration-300 ${T.muted}`}> ({restock.itemsPerUnit} un/emb)</span>
                                          )}
                                        </div>
                                        <div className="text-red-500 font-bold">
                                          C: R$ {(restock.costPrice / 100).toFixed(2)}
                                          {restock.itemsPerUnit > 1 && (
                                            <span className={`ml-1 transition-colors duration-300 ${T.muted}`}>(R$ {(restock.costPrice / 100 / restock.itemsPerUnit).toFixed(2)}/un)</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {restock.expiryDate && (
                                          <Badge className={`text-[8px] px-2 py-0.5 ${
                                            restockUrgency === "red"    ? "bg-red-500/20 text-red-500 border-red-500/30 animate-pulse" :
                                            restockUrgency === "yellow" ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" :
                                            restockUrgency === "blue"   ? "bg-blue-500/20 text-blue-500 border-blue-500/30" :
                                                                          "bg-green-500/20 text-green-600 border-green-500/30"
                                          }`}>
                                            VAL: {format(new Date(restock.expiryDate), "dd/MM/yy")}
                                            {restockUrgency !== "safe" && (
                                              <span className="ml-1">({differenceInDays(new Date(restock.expiryDate), new Date())}d)</span>
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

      {/* ── Restock Modal ── */}
      <Dialog open={restockModalOpen} onOpenChange={setRestockModalOpen}>
        <DialogContent className={`max-w-md border transition-colors duration-300 ${T.dialog}`}>
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase tracking-tighter text-primary">
              <RefreshCw className="inline-block h-5 w-5 mr-2" />
              Reposição de Estoque
            </DialogTitle>
            <DialogDescription className={`text-sm transition-colors duration-300 ${T.dialogDesc}`}>
              {restockItem?.name && (
                <span className={`font-bold transition-colors duration-300 ${T.h1}`}>{restockItem.name}</span>
              )}
              {restockItem?.barcode && (
                <span className={`block text-xs mt-1 transition-colors duration-300 ${T.muted}`}>ID: {restockItem.barcode}</span>
              )}
              <span className="block text-xs text-primary mt-2">
                Estoque atual: {restockItem?.quantity} {restockItem?.unit}(s)
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${T.dialogLabel}`}>
                Quantidade de Embalagens a Adicionar *
              </Label>
              <Input
                type="number"
                value={restockQuantity}
                onChange={(e) => setRestockQuantity(e.target.value)}
                className={`h-10 font-bold border transition-colors duration-300 ${T.dialogInput}`}
                placeholder="Ex: 10"
                data-testid="input-restock-quantity"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${T.dialogLabel}`}>
                  Tipo de Embalagem
                </Label>
                <Select value={restockUnit} onValueChange={setRestockUnit}>
                  <SelectTrigger className={`h-10 font-bold border transition-colors duration-300 ${T.selectTrigger}`} data-testid="select-restock-unit">
                    <SelectValue placeholder="Tipo..." />
                  </SelectTrigger>
                  <SelectContent className={`border transition-colors duration-300 ${T.dialogDropdown}`}>
                    {["Unidade","Bag","Caixa","Pacote"].map(v => (
                      <SelectItem key={v} value={v} className={T.dropdownItem}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${T.dialogLabel}`}>
                  Unidades por Embalagem
                </Label>
                <Input
                  type="number"
                  value={restockItemsPerUnit}
                  onChange={(e) => setRestockItemsPerUnit(e.target.value)}
                  className={`h-10 font-bold border transition-colors duration-300 ${T.dialogInput}`}
                  placeholder="Ex: 12"
                  data-testid="input-restock-items-per-unit"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${T.dialogLabel}`}>
                  Custo por Embalagem (R$)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={restockCostPrice}
                  onChange={(e) => setRestockCostPrice(e.target.value)}
                  className={`h-10 font-bold border transition-colors duration-300 ${T.dialogInput}`}
                  placeholder="Ex: 25.00"
                  data-testid="input-restock-cost"
                />
              </div>

              <div className="space-y-1.5">
                <Label className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${T.dialogLabel}`}>
                  Nova Validade
                </Label>
                <Input
                  type="date"
                  value={restockExpiryDate}
                  onChange={(e) => setRestockExpiryDate(e.target.value)}
                  className={`h-10 font-bold border transition-colors duration-300 ${T.dialogInputDate}`}
                  data-testid="input-restock-expiry"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="ghost"
                className={`flex-1 font-bold uppercase transition-colors duration-300 ${isLight ? "text-slate-500 hover:text-slate-900 border border-slate-200" : "text-white/60 hover:text-white"}`}
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
                {restockMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : <><RefreshCw className="h-4 w-4 mr-2" />Confirmar Reposição</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Report Config Modal ── */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className={`max-w-lg border transition-colors duration-300 ${T.dialog}`}>
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase tracking-tighter text-primary flex items-center gap-2">
              <FileDown className="h-5 w-5" /> Configurar Relatório
            </DialogTitle>
            <DialogDescription className={`text-xs uppercase tracking-widest font-bold transition-colors duration-300 ${T.dialogDesc}`}>
              Escolha as colunas e a orientação do relatório
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary border-b border-primary/20 pb-2">
                Orientação da Página
              </p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: "portrait",  label: "Retrato",  desc: "Vertical (A4)" },
                  { value: "landscape", label: "Paisagem", desc: "Horizontal (A4)" },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setReportOrientation(opt.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                      reportOrientation === opt.value
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : isLight
                          ? "border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300"
                          : "border-white/10 bg-white/5 text-white/50 hover:border-white/20"
                    }`}
                  >
                    <div className={`border-2 rounded-sm flex items-center justify-center ${
                      opt.value === "portrait" ? "w-8 h-11" : "w-11 h-8"
                    } ${reportOrientation === opt.value ? "border-primary/60" : isLight ? "border-slate-300" : "border-white/20"}`}>
                      <div className={`rounded-[1px] ${
                        opt.value === "portrait" ? "w-5 h-[3px]" : "w-[3px] h-5"
                      } ${reportOrientation === opt.value ? "bg-primary/60" : isLight ? "bg-slate-300" : "bg-white/20"}`} />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest">{opt.label}</p>
                      <p className="text-[8px] opacity-60">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
                  Colunas do Relatório
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setReportColumns(prev => Object.fromEntries(Object.keys(prev).map(k => [k, true])))}
                    className="text-[8px] font-black uppercase tracking-widest text-primary/70 hover:text-primary transition-colors">
                    Todas
                  </button>
                  <span className={`text-[8px] transition-colors duration-300 ${T.muted}`}>|</span>
                  <button onClick={() => setReportColumns(prev => Object.fromEntries(Object.keys(prev).map(k => [k, false])))}
                    className={`text-[8px] font-black uppercase tracking-widest transition-colors ${isLight ? "text-slate-400 hover:text-slate-700" : "text-white/40 hover:text-white/70"}`}>
                    Nenhuma
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-y-1 gap-x-4">
                {REPORT_COLS.map(col => (
                  <label key={col.key}
                    className={`flex items-center gap-2.5 py-2 px-3 rounded-lg cursor-pointer transition-colors group ${isLight ? "hover:bg-slate-100" : "hover:bg-white/5"}`}>
                    <div
                      onClick={() => setReportColumns(prev => ({ ...prev, [col.key]: !prev[col.key] }))}
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                        reportColumns[col.key]
                          ? "bg-primary border-primary"
                          : isLight ? "border-slate-300 bg-transparent group-hover:border-slate-400" : "border-white/20 bg-transparent group-hover:border-white/40"
                      }`}
                    >
                      {reportColumns[col.key] && (
                        <svg className="w-2.5 h-2.5 text-black" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      reportColumns[col.key] ? (isLight ? "text-slate-900" : "text-white") : T.muted
                    }`}>
                      {col.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className={`flex items-center gap-3 pt-2 border-t transition-colors duration-300 ${isLight ? "border-slate-100" : "border-white/5"}`}>
              <Button
                variant="ghost"
                onClick={() => setReportModalOpen(false)}
                className={`flex-1 h-10 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-colors duration-300 ${
                  isLight ? "text-slate-500 hover:text-slate-900 border-slate-200 hover:border-slate-300" : "text-white/40 hover:text-white border-white/10 hover:border-white/20"
                }`}
              >
                Cancelar
              </Button>
              <Button
                onClick={generateReport}
                disabled={!Object.values(reportColumns).some(Boolean)}
                className="flex-1 h-10 bg-primary hover:bg-primary/90 text-black font-black text-[10px] uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(0,229,255,0.2)] disabled:opacity-40"
              >
                <FileDown className="h-3.5 w-3.5 mr-1.5" />
                Gerar Relatório
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
