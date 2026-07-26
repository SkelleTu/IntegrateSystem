import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays, format } from "date-fns";
import Fuse from "fuse.js";
import {
  Package, Search, Plus, Loader2, ChevronDown, ChevronUp,
  Sun, Moon, AlertTriangle, Trash2, Edit2, X, Tag,
  Calendar, Layers, TrendingDown, ShoppingCart, Clock, BarChart3,
  ScanBarcode, CheckCircle2, XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: number;
  name: string;
  brand?: string | null;
  category?: string | null;
  flavor?: string | null;
  unit: string;
  weight?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  minStock: number;
  salePrice?: number | null;
  ncm?: string | null;
  cfop?: string | null;
  codigoBalanca?: string | null;
  totalQuantity: number;
  nearestExpiry?: string | Date | null;
  createdAt: string;
}

interface Batch {
  id: number;
  productId: number;
  barcode?: string | null;
  supplierCode?: string | null;
  batchNumber?: string | null;
  manufactureDate?: string | null;
  expiryDate?: string | null;
  quantity: number;
  costPrice: number;
  supplier?: string | null;
  entryDate: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Datas são salvas como timestamp Unix (meia-noite UTC).
 * Em fusos negativos (ex: Brasil UTC-3), meia-noite UTC vira 21h do dia anterior,
 * fazendo o JS mostrar o dia errado ao usar horário local.
 * Esta função constrói um Date local usando os componentes UTC, evitando o deslocamento.
 */
function utcDateOnly(d: string | Date): Date {
  const dt = new Date(d);
  return new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
}

function getExpiryUrgency(date: string | Date | null | undefined): "safe" | "blue" | "yellow" | "red" {
  if (!date) return "safe";
  const days = differenceInDays(utcDateOnly(date), new Date());
  if (days <= 0) return "red";
  if (days <= 3) return "red";
  if (days <= 7) return "yellow";
  if (days <= 14) return "blue";
  return "safe";
}

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  try { return format(utcDateOnly(d), "dd/MM/yyyy"); } catch { return "—"; }
}

function fmtCurrency(cents: number | null | undefined) {
  if (!cents) return "—";
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

// ─── Product Form defaults ────────────────────────────────────────────────────

const emptyProduct = () => ({
  name: "", brand: "", category: "", flavor: "", unit: "Unidade",
  weight: "", description: "", minStock: "5", salePrice: "",
  ncm: "", cfop: "", codigoBalanca: "",
});

const emptyBatch = () => ({
  barcode: "", supplierCode: "", batchNumber: "", supplier: "",
  quantity: "", costPrice: "", manufactureDate: "", expiryDate: "",
  entryDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()),
});

// ─── Filter types ─────────────────────────────────────────────────────────────

type FilterStatus = "todos" | "baixo" | "vencendo" | "vencidos" | "sem_lotes";

// ─── Product Form fields (must be outside InventoryPage to avoid remount on re-render) ──

const ProductFields = ({ form, setForm, T, highlightFlavor = false }: any) => (
  <div className="grid grid-cols-2 gap-3">
    <div className="col-span-2">
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Nome *</Label>
      <Input className={`mt-1 ${T.dialogInput}`} value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="Ex: Salgadinho Bacon 45g" />
    </div>
    <div>
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Marca</Label>
      <Input className={`mt-1 ${T.dialogInput}`} value={form.brand} onChange={e => setForm((f: any) => ({ ...f, brand: e.target.value }))} placeholder="Ex: Amavita" />
    </div>
    <div>
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Categoria</Label>
      <Input className={`mt-1 ${T.dialogInput}`} value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))} placeholder="Ex: Salgadinhos" />
    </div>
    <div>
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Peso/Volume</Label>
      <Input className={`mt-1 ${T.dialogInput}`} value={form.weight} onChange={e => setForm((f: any) => ({ ...f, weight: e.target.value }))} placeholder="Ex: 45g" />
    </div>
    <div>
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Unidade</Label>
      <Input className={`mt-1 ${T.dialogInput}`} value={form.unit} onChange={e => setForm((f: any) => ({ ...f, unit: e.target.value }))} placeholder="Unidade, kg, L..." />
    </div>
    <div>
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Estoque Mínimo</Label>
      <Input type="number" className={`mt-1 ${T.dialogInput}`} value={form.minStock} onChange={e => setForm((f: any) => ({ ...f, minStock: e.target.value }))} />
    </div>
    <div>
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Preço de Venda (R$)</Label>
      <Input className={`mt-1 ${T.dialogInput}`} value={form.salePrice} onChange={e => setForm((f: any) => ({ ...f, salePrice: e.target.value }))} placeholder="0,00" />
    </div>
    <div className="col-span-2">
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Descrição</Label>
      <Input className={`mt-1 ${T.dialogInput}`} value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Opcional" />
    </div>
  </div>
);

const BatchFields = ({ form, setForm, T }: any) => (
  <div className="grid grid-cols-2 gap-3">
    <div>
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Quantidade *</Label>
      <Input type="number" className={`mt-1 ${T.dialogInput}`} value={form.quantity} onChange={e => setForm((f: any) => ({ ...f, quantity: e.target.value }))} placeholder="0" />
    </div>
    <div>
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Custo de Compra (R$)</Label>
      <Input className={`mt-1 ${T.dialogInput}`} value={form.costPrice} onChange={e => setForm((f: any) => ({ ...f, costPrice: e.target.value }))} placeholder="0,00" />
    </div>
    <div>
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Código de Barras</Label>
      <Input className={`mt-1 ${T.dialogInput}`} value={form.barcode} onChange={e => setForm((f: any) => ({ ...f, barcode: e.target.value }))} placeholder="EAN-13..." />
    </div>
    <div>
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Variante</Label>
      <Input className={`mt-1 ${T.dialogInput}`} value={form.batchNumber} onChange={e => setForm((f: any) => ({ ...f, batchNumber: e.target.value }))} placeholder="Ex: Chocolate, Diet, 500ml..." />
    </div>
    <div>
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Validade</Label>
      <Input type="date" className={`mt-1 ${T.dialogInput} [color-scheme:dark]`} value={form.expiryDate} onChange={e => setForm((f: any) => ({ ...f, expiryDate: e.target.value }))} />
    </div>
    <div className="col-span-2">
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Data de Entrada</Label>
      <Input type="date" className={`mt-1 ${T.dialogInput} [color-scheme:dark]`} value={form.entryDate} onChange={e => setForm((f: any) => ({ ...f, entryDate: e.target.value }))} />
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── UI State ──
  const [isLight, setIsLight] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("todos");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<"name" | "qty" | "expiry">("name");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // ── Modal state ──
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [addBatchFor, setAddBatchFor] = useState<Product | null>(null);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [deductFor, setDeductFor] = useState<Product | null>(null);
  const [dupProduct, setDupProduct] = useState<Product | null>(null); // duplicate found

  // ── Barcode scanner state (global modal) ──
  const [scanOpen, setScanOpen] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{ found: boolean; product?: Product } | null>(null);
  const [scanCategory, setScanCategory] = useState("");
  const scanInputRef = useRef<HTMLInputElement>(null);

  // ── Inline barcode scan (inside "Novo Lote" modal) ──
  const [inlineScanValue, setInlineScanValue] = useState("");
  const [inlineScanLoading, setInlineScanLoading] = useState(false);
  const [inlineScanResult, setInlineScanResult] = useState<{
    status: "match" | "other" | "new";
    otherProduct?: Product;
  } | null>(null);
  const inlineScanRef = useRef<HTMLInputElement>(null);

  // ── Inline variant creation (within "Novo Lote" modal) ──
  const [showInlineVariant, setShowInlineVariant] = useState(false);
  const [inlineVariantFlavor, setInlineVariantFlavor] = useState("");
  const [inlineVariantName, setInlineVariantName] = useState("");

  // ── "Novo Produto" extra: highlight flavor field when coming from variant flow ──
  const [highlightFlavor, setHighlightFlavor] = useState(false);

  // ── Form state ──
  const [productForm, setProductForm] = useState(emptyProduct());
  const [batchForm, setBatchForm] = useState(emptyBatch());
  const [deductQty, setDeductQty] = useState("");
  const [deductReason, setDeductReason] = useState("");

  // ── Also carry first-batch fields when creating new product ──
  const [firstBatchForm, setFirstBatchForm] = useState(emptyBatch());

  // ─── Theme ────────────────────────────────────────────────────────────────

  const T = isLight ? {
    page: "bg-slate-100 text-slate-900",
    surface: "bg-white border-slate-300 shadow-sm",
    card: "bg-white border-slate-300",
    cardHd: "border-slate-200",
    h1: "text-slate-900",
    subtitle: "text-slate-700 !text-xs",
    muted: "text-slate-600",
    badge: "border-slate-300 text-slate-700",
    selectTrigger: "bg-white border-slate-300 text-slate-800",
    dropdown: "bg-white border-slate-300",
    dropdownItem: "text-slate-800 focus:bg-slate-100",
    input: "bg-white border-slate-300 text-slate-900 focus:border-primary/60",
    tableHd: "bg-slate-200",
    tableHdText: "text-slate-800 !text-[11px]",
    tableRow: "border-slate-200 hover:bg-slate-50",
    cellPrimary: "text-slate-900",
    cellSub: "text-slate-700",
    toggleBtn: "bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300",
    dialog: "bg-white border-slate-300 text-slate-900",
    dialogLabel: "text-slate-800 !text-[11px]",
    dialogInput: "bg-white border-slate-300 text-slate-900 focus:border-primary/60",
    searchIcon: "text-slate-500",
    expandedBg: "bg-slate-50",
    rowUrgency: { safe: "", blue: "bg-blue-50", yellow: "bg-amber-50", red: "bg-red-50" },
  } as const : {
    page: "bg-[#090c0c] text-white",
    surface: "bg-white/[0.03] border-white/10 shadow-none",
    card: "bg-white/[0.03] border-white/10",
    cardHd: "border-white/5",
    h1: "text-white",
    subtitle: "text-white/30",
    muted: "text-white/40",
    badge: "border-white/10 text-white/60",
    selectTrigger: "bg-white/5 border-white/10 text-white/70",
    dropdown: "bg-[#0d1212] border-white/10",
    dropdownItem: "text-white/70 focus:bg-white/10",
    input: "bg-white/5 border-white/10 text-white focus:border-primary/50",
    tableHd: "bg-black/30",
    tableHdText: "text-white/40",
    tableRow: "border-white/5 hover:bg-white/[0.03]",
    cellPrimary: "text-white",
    cellSub: "text-white/40",
    toggleBtn: "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20",
    dialog: "bg-[#0a0f0f] border-white/10 text-white",
    dialogLabel: "text-zinc-400",
    dialogInput: "bg-black/40 border-white/10 text-white focus:border-primary/50",
    searchIcon: "text-white/40",
    expandedBg: "bg-black/20",
    rowUrgency: { safe: "", blue: "bg-blue-500/5", yellow: "bg-yellow-500/5", red: "bg-red-500/5" },
  } as const;

  // ─── Data Queries ──────────────────────────────────────────────────────────

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const batchesCache = new Map<number, Batch[]>();

  const fetchBatches = async (productId: number): Promise<Batch[]> => {
    const res = await fetch(`/api/products/${productId}/batches`, { credentials: "include" });
    return res.json();
  };

  const { data: expandedBatches = {} } = useQuery<Record<number, Batch[]>>({
    queryKey: ["/api/products/all-batches", Array.from(expandedIds).join(",")],
    queryFn: async () => {
      const result: Record<number, Batch[]> = {};
      await Promise.all(
        Array.from(expandedIds).map(async id => {
          result[id] = await fetchBatches(id);
        })
      );
      return result;
    },
    enabled: expandedIds.size > 0,
    staleTime: 0,
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/products"] });
    qc.invalidateQueries({ queryKey: ["/api/products/all-batches"] });
  };

  const createProductMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/products", data),
    onSuccess: () => { invalidate(); setAddProductOpen(false); setProductForm(emptyProduct()); setFirstBatchForm(emptyBatch()); toast({ title: "Produto criado com sucesso" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateProductMut = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PUT", `/api/products/${id}`, data),
    onSuccess: () => { invalidate(); setEditingProduct(null); toast({ title: "Produto atualizado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteProductMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Produto excluído" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const createBatchMut = useMutation({
    mutationFn: ({ productId, data }: any) => apiRequest("POST", `/api/products/${productId}/batches`, data),
    onSuccess: () => { invalidate(); setAddBatchFor(null); setBatchForm(emptyBatch()); toast({ title: "Lote adicionado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateBatchMut = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PUT", `/api/batches/${id}`, data),
    onSuccess: () => { invalidate(); setEditingBatch(null); setBatchForm(emptyBatch()); toast({ title: "Lote atualizado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteBatchMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/batches/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Lote excluído" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deductMut = useMutation({
    mutationFn: ({ id, qty, reason }: any) => apiRequest("POST", `/api/products/${id}/deduct`, { quantity: qty, reason }),
    onSuccess: () => { invalidate(); setDeductFor(null); setDeductQty(""); setDeductReason(""); toast({ title: "Baixa realizada (FEFO)" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // ─── Duplicate check ───────────────────────────────────────────────────────

  const checkDuplicate = async (form: typeof productForm): Promise<Product | null> => {
    const res = await fetch("/api/products/check-duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: form.name, brand: form.brand, flavor: form.flavor,
        weight: form.weight, category: form.category,
      }),
    });
    if (!res.ok) return null;
    return res.json();
  };

  // ─── Filtered / sorted products ────────────────────────────────────────────

  const filteredProducts = useMemo(() => {
    let items = [...products];

    // Text search
    if (searchTerm.trim()) {
      const fuse = new Fuse(items, {
        keys: ["name", "brand", "category", "flavor", "codigoBalanca", "weight"],
        threshold: 0.4,
        ignoreLocation: true,
        minMatchCharLength: 1,
      });
      items = fuse.search(searchTerm).map(r => r.item);
    }

    // Status filter
    if (filterStatus !== "todos") {
      items = items.filter(p => {
        if (filterStatus === "baixo")     return p.totalQuantity < p.minStock;
        if (filterStatus === "sem_lotes") return p.totalQuantity <= 0;
        if (filterStatus === "vencidos")  return p.nearestExpiry && differenceInDays(utcDateOnly(p.nearestExpiry), new Date()) <= 0;
        if (filterStatus === "vencendo")  return p.nearestExpiry && differenceInDays(utcDateOnly(p.nearestExpiry), new Date()) > 0 && differenceInDays(utcDateOnly(p.nearestExpiry), new Date()) <= 7;
        return true;
      });
    }

    // Sort
    items.sort((a, b) => {
      if (sortBy === "name")   return a.name.localeCompare(b.name);
      if (sortBy === "qty")    return a.totalQuantity - b.totalQuantity;
      if (sortBy === "expiry") {
        if (!a.nearestExpiry && !b.nearestExpiry) return 0;
        if (!a.nearestExpiry) return 1;
        if (!b.nearestExpiry) return -1;
        return new Date(a.nearestExpiry).getTime() - new Date(b.nearestExpiry).getTime();
      }
      return 0;
    });

    return items;
  }, [products, searchTerm, filterStatus, sortBy]);

  // ─── Expiry badge ──────────────────────────────────────────────────────────

  function ExpiryBadge({ date }: { date: string | Date | null | undefined }) {
    if (!date) return null;
    const u = getExpiryUrgency(date);
    const days = differenceInDays(utcDateOnly(date), new Date());
    const cfg = {
      red:    { cls: "bg-red-500/15 border-red-500/30 text-red-400", label: days <= 0 ? "VENCIDO" : `VENCE EM ${days}d` },
      yellow: { cls: "bg-yellow-500/15 border-yellow-500/30 text-yellow-400", label: `VENCE EM ${days}d` },
      blue:   { cls: "bg-blue-500/15 border-blue-500/30 text-blue-400", label: `VENCE EM ${days}d` },
      safe:   { cls: "bg-green-500/10 border-green-500/20 text-green-400", label: "VÁLIDO" },
    }[u];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${cfg.cls}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {cfg.label}
      </span>
    );
  }

  // ─── Stock badge ───────────────────────────────────────────────────────────

  function StockBadge({ product }: { product: Product }) {
    const low = product.totalQuantity < product.minStock;
    const empty = product.totalQuantity <= 0;
    if (empty) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-red-500/15 border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-widest">SEM ESTOQUE</span>;
    if (low) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-orange-500/15 border-orange-500/30 text-orange-400 text-[9px] font-black uppercase tracking-widest"><TrendingDown className="h-2.5 w-2.5" />ESTOQUE BAIXO</span>;
    return null;
  }

  // ─── Toggle expand ─────────────────────────────────────────────────────────

  const toggleExpand = useCallback((id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }, []);

  // Group filtered products by category
  const groupedProducts = useMemo(() => {
    const groups: { category: string; products: Product[] }[] = [];
    const map = new Map<string, Product[]>();

    for (const p of filteredProducts) {
      const key = p.category?.trim() || "__none__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }

    // Named categories first (sorted), then uncategorized
    const named = Array.from(map.keys()).filter(k => k !== "__none__").sort((a, b) => a.localeCompare(b));
    for (const cat of named) groups.push({ category: cat, products: map.get(cat)! });
    if (map.has("__none__")) groups.push({ category: "__none__", products: map.get("__none__")! });

    return groups;
  }, [filteredProducts]);

  // ─── Open edit modals ──────────────────────────────────────────────────────

  function openEditProduct(p: Product) {
    setProductForm({
      name: p.name, brand: p.brand || "", category: p.category || "",
      flavor: p.flavor || "", unit: p.unit, weight: p.weight || "",
      description: p.description || "", minStock: String(p.minStock),
      salePrice: p.salePrice ? String((p.salePrice / 100).toFixed(2)) : "",
      ncm: p.ncm || "", cfop: p.cfop || "", codigoBalanca: p.codigoBalanca || "",
    });
    setEditingProduct(p);
  }

  function openEditBatch(b: Batch) {
    setBatchForm({
      barcode: b.barcode || "", supplierCode: b.supplierCode || "",
      batchNumber: b.batchNumber || "", supplier: b.supplier || "",
      quantity: String(b.quantity),
      costPrice: b.costPrice ? String((b.costPrice / 100).toFixed(2)) : "",
      manufactureDate: b.manufactureDate ? new Date(b.manufactureDate).toISOString().slice(0, 10) : "",
      expiryDate: b.expiryDate ? new Date(b.expiryDate).toISOString().slice(0, 10) : "",
      entryDate: new Date(b.entryDate).toISOString().slice(0, 10),
    });
    setEditingBatch(b);
  }

  // ─── Submit handlers ───────────────────────────────────────────────────────

  async function handleCreateProduct() {
    if (!productForm.name.trim()) return toast({ title: "Nome é obrigatório", variant: "destructive" });

    // Check duplicate
    const dup = await checkDuplicate(productForm);
    if (dup) {
      setDupProduct(dup);
      return;
    }

    // Validate first batch quantity
    if (!firstBatchForm.quantity || Number(firstBatchForm.quantity) <= 0) {
      return toast({ title: "Informe a quantidade do primeiro lote", variant: "destructive" });
    }

    createProductMut.mutate({
      ...productForm,
      minStock: Number(productForm.minStock) || 5,
      salePrice: productForm.salePrice ? productForm.salePrice : undefined,
      _firstBatch: firstBatchForm,
    });
  }

  async function handleCreateProductAndFirstBatch() {
    const productRes = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...productForm,
        minStock: Number(productForm.minStock) || 5,
        salePrice: productForm.salePrice || undefined,
      }),
    });
    if (!productRes.ok) {
      const err = await productRes.json();
      return toast({ title: "Erro ao criar produto", description: err.message, variant: "destructive" });
    }
    const newProd = await productRes.json();

    // Create first batch if quantity provided
    if (firstBatchForm.quantity && Number(firstBatchForm.quantity) > 0) {
      await fetch(`/api/products/${newProd.id}/batches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...firstBatchForm }),
      });
    }

    invalidate();
    setAddProductOpen(false);
    setProductForm(emptyProduct());
    setFirstBatchForm(emptyBatch());
    toast({ title: "Produto criado com sucesso" });
  }

  // ─── Barcode scanner logic ─────────────────────────────────────────────────

  useEffect(() => {
    if (scanOpen) {
      setScanValue("");
      setScanResult(null);
      setScanCategory("");
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  }, [scanOpen]);

  // Reset inline scan + variant form when the Add Batch modal opens/closes
  useEffect(() => {
    setInlineScanValue("");
    setInlineScanResult(null);
    setShowInlineVariant(false);
    setInlineVariantFlavor("");
    setInlineVariantName("");
    if (addBatchFor) {
      setTimeout(() => inlineScanRef.current?.focus(), 150);
    }
  }, [addBatchFor]);

  async function handleScan() {
    const code = scanValue.trim();
    if (!code) return;
    setScanLoading(true);
    setScanResult(null);
    try {
      const res = await fetch(`/api/products/barcode/${encodeURIComponent(code)}`, { credentials: "include" });
      if (res.ok) {
        const product: Product = await res.json();
        setScanResult({ found: true, product });
      } else {
        setScanResult({ found: false });
      }
    } catch {
      setScanResult({ found: false });
    } finally {
      setScanLoading(false);
    }
  }

  function handleScanConfirm() {
    if (!scanResult) return;
    if (scanResult.found && scanResult.product) {
      // Product exists → open Add Batch modal with barcode pre-filled
      setAddBatchFor(scanResult.product);
      setBatchForm({ ...emptyBatch(), barcode: scanValue.trim() });
      toast({ title: `Produto encontrado: ${scanResult.product.name}` });
    } else {
      // Product not found → open New Product modal with barcode and category pre-filled
      setProductForm({ ...emptyProduct(), category: scanCategory.trim() });
      setFirstBatchForm({ ...emptyBatch(), barcode: scanValue.trim() });
      setAddProductOpen(true);
      toast({ title: "Produto não cadastrado — preencha os dados para cadastrá-lo." });
    }
    setScanOpen(false);
    setScanValue("");
    setScanResult(null);
    setScanCategory("");
  }

  async function handleInlineScan() {
    const code = inlineScanValue.trim();
    if (!code) return;
    setInlineScanLoading(true);
    setInlineScanResult(null);
    try {
      const res = await fetch(`/api/products/barcode/${encodeURIComponent(code)}`, { credentials: "include" });
      if (res.ok) {
        const found: Product = await res.json();
        if (addBatchFor && found.id === addBatchFor.id) {
          // Same product — pre-fill barcode and confirm
          setBatchForm(f => ({ ...f, barcode: code }));
          setInlineScanResult({ status: "match" });
        } else {
          // Different product in stock
          setInlineScanResult({ status: "other", otherProduct: found });
        }
      } else {
        // Barcode not registered — fill it as new
        setBatchForm(f => ({ ...f, barcode: code }));
        setInlineScanResult({ status: "new" });
      }
    } catch {
      setBatchForm(f => ({ ...f, barcode: code }));
      setInlineScanResult({ status: "new" });
    } finally {
      setInlineScanLoading(false);
    }
  }

  function handleRegisterAsNewVariant() {
    // Pre-fill Novo Produto form with current product's data — user just fills the flavor
    if (addBatchFor) {
      setProductForm({
        name: addBatchFor.name,
        brand: addBatchFor.brand || "",
        category: addBatchFor.category || "",
        flavor: "",           // intentionally blank — user must fill this
        unit: addBatchFor.unit || "Unidade",
        weight: addBatchFor.weight || "",
        description: addBatchFor.description || "",
        minStock: String(addBatchFor.minStock || 5),
        salePrice: addBatchFor.salePrice ? String((addBatchFor.salePrice / 100).toFixed(2)) : "",
        ncm: addBatchFor.ncm || "",
        cfop: addBatchFor.cfop || "",
        codigoBalanca: "",
      });
      setFirstBatchForm({ ...emptyBatch(), barcode: inlineScanValue.trim() });
    }
    setHighlightFlavor(true);
    setAddBatchFor(null);
    setInlineScanValue("");
    setInlineScanResult(null);
    setAddProductOpen(true);
  }

  async function handleCreateVariantAndBatch() {
    if (!addBatchFor) return;
    if (!inlineVariantFlavor.trim() && !inlineVariantName.trim()) {
      toast({ title: "Informe o sabor/variação ou o nome do novo produto", variant: "destructive" });
      return;
    }
    if (!batchForm.quantity || Number(batchForm.quantity) <= 0) {
      toast({ title: "Informe a quantidade do lote", variant: "destructive" });
      return;
    }

    try {
      // 1. Create the variant product (inherits all data from parent, overrides name/flavor)
      const productPayload = {
        name: inlineVariantName.trim() || addBatchFor.name,
        brand: addBatchFor.brand || "",
        category: addBatchFor.category || "",
        flavor: inlineVariantFlavor.trim(),
        unit: addBatchFor.unit || "Unidade",
        weight: addBatchFor.weight || "",
        description: addBatchFor.description || "",
        minStock: addBatchFor.minStock || 5,
        salePrice: addBatchFor.salePrice ? String((addBatchFor.salePrice / 100).toFixed(2)) : undefined,
        ncm: addBatchFor.ncm || "",
        cfop: addBatchFor.cfop || "",
      };

      const prodRes = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(productPayload),
      });

      if (!prodRes.ok) {
        const err = await prodRes.json();
        toast({ title: "Erro ao criar variante", description: err.message, variant: "destructive" });
        return;
      }

      const newProduct = await prodRes.json();

      // 2. Create the batch for the new variant
      const batchPayload = { ...batchForm, barcode: inlineScanValue.trim() || batchForm.barcode };
      await fetch(`/api/products/${newProduct.id}/batches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(batchPayload),
      });

      invalidate();
      setAddBatchFor(null);
      setBatchForm(emptyBatch());
      setShowInlineVariant(false);
      setInlineVariantFlavor("");
      setInlineVariantName("");
      setInlineScanValue("");
      setInlineScanResult(null);
      toast({ title: `Variante "${inlineVariantFlavor.trim() || inlineVariantName.trim()}" criada com lote adicionado!` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  }

  function handleDupAddBatch() {
    if (dupProduct) {
      setAddBatchFor(dupProduct);
      setBatchForm(emptyBatch());
    }
    setDupProduct(null);
    setAddProductOpen(false);
    setProductForm(emptyProduct());
    setFirstBatchForm(emptyBatch());
  }

  function handleSubmitBatch(productId: number) {
    createBatchMut.mutate({ productId, data: batchForm });
  }

  function handleUpdateBatch() {
    if (!editingBatch) return;
    updateBatchMut.mutate({ id: editingBatch.id, data: batchForm });
  }

  function handleDeduct() {
    if (!deductFor || !deductQty || Number(deductQty) <= 0) return;
    deductMut.mutate({ id: deductFor.id, qty: Number(deductQty), reason: deductReason });
  }

  // ─── Access guard ──────────────────────────────────────────────────────────

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

  // ─── Stats bar ─────────────────────────────────────────────────────────────

  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.totalQuantity < p.minStock).length;
  const expiringCount = products.filter(p => p.nearestExpiry && differenceInDays(utcDateOnly(p.nearestExpiry), new Date()) > 0 && differenceInDays(utcDateOnly(p.nearestExpiry), new Date()) <= 7).length;
  const expiredCount  = products.filter(p => p.nearestExpiry && differenceInDays(utcDateOnly(p.nearestExpiry), new Date()) <= 0).length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`p-4 md:p-6 lg:p-10 space-y-6 min-h-screen transition-colors duration-300 ${T.page}`}>

      {/* ── Header ── */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-2xl border gap-4 transition-colors duration-300 ${T.surface}`}>
        <div>
          <h1 className={`text-3xl md:text-4xl font-black italic tracking-tighter uppercase transition-colors duration-300 ${T.h1}`}>
            Gestão de <span className="text-primary">Estoque</span>
          </h1>
          <p className={`text-[10px] font-bold uppercase tracking-[0.3em] transition-colors duration-300 ${T.subtitle}`}>
            Produto → Lotes · FEFO
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLight(l => !l)}
            className={`flex items-center gap-2 h-9 px-3 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all ${T.toggleBtn}`}
          >
            {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span className="hidden sm:inline">{isLight ? "Escuro" : "Claro"}</span>
          </button>
          <Badge variant="outline" className={`text-xs px-4 py-1.5 font-black italic uppercase tracking-wider border transition-colors ${T.badge}`}>
            {user.username}
          </Badge>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Package, label: "Produtos", value: totalProducts, color: "text-primary" },
          { icon: TrendingDown, label: "Estoque Baixo", value: lowStockCount, color: "text-orange-400" },
          { icon: AlertTriangle, label: "Vencendo (7d)", value: expiringCount, color: "text-yellow-400" },
          { icon: X, label: "Vencidos", value: expiredCount, color: "text-red-400" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className={`p-4 rounded-2xl border transition-colors ${T.surface}`}>
            <div className={`flex items-center gap-2 mb-1 ${T.muted}`}>
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            </div>
            <div className={`text-2xl font-black ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Main Card ── */}
      <Card className={`rounded-2xl border transition-colors ${T.card}`}>
        <CardHeader className={`border-b p-5 transition-colors ${T.cardHd}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className={`flex items-center gap-2 font-black italic uppercase tracking-tighter text-xl ${T.cellPrimary}`}>
              <Layers className="h-6 w-6 text-primary" /> Produtos e Lotes
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setScanOpen(true)}
                className="h-9 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] uppercase tracking-widest rounded-xl gap-2"
              >
                <ScanBarcode className="h-4 w-4" /> Bipar Produto
              </Button>
              <Button
                onClick={() => { setAddProductOpen(true); setProductForm(emptyProduct()); setFirstBatchForm(emptyBatch()); }}
                className="h-9 px-5 bg-primary hover:bg-primary/90 text-black font-black text-[10px] uppercase tracking-widest rounded-xl gap-2"
              >
                <Plus className="h-4 w-4" /> Novo Produto
              </Button>
            </div>
          </div>

          {/* Search + filters */}
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${T.searchIcon}`} />
              <input
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium transition-colors outline-none ${T.input}`}
                placeholder="Buscar por nome, marca, categoria, código de barras..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className={`h-4 w-4 ${T.muted}`} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${T.muted}`}>Filtrar:</span>
              {([
                { key: "todos",     label: "Todos" },
                { key: "baixo",     label: "🟠 Estoque Baixo" },
                { key: "vencendo",  label: "🟡 Vencendo" },
                { key: "vencidos",  label: "🔴 Vencidos" },
                { key: "sem_lotes", label: "⚫ Sem Lotes" },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilterStatus(key)}
                  className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wide transition-all
                    ${filterStatus === key
                      ? "bg-primary border-primary text-black shadow-[0_0_12px_rgba(0,229,255,0.3)] scale-105"
                      : isLight
                        ? "bg-slate-100 border-slate-300 text-slate-600 hover:border-slate-400"
                        : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                    }`}
                >
                  {label}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2">
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className={`h-8 text-[10px] font-black uppercase tracking-wider w-36 rounded-xl border px-3 ${T.selectTrigger}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={`border ${T.dropdown}`}>
                    <SelectItem value="name" className={T.dropdownItem}>Por Nome</SelectItem>
                    <SelectItem value="qty"  className={T.dropdownItem}>Por Quantidade</SelectItem>
                    <SelectItem value="expiry" className={T.dropdownItem}>Por Validade</SelectItem>
                  </SelectContent>
                </Select>
                <span className={`text-[10px] font-bold whitespace-nowrap ${T.muted}`}>
                  {filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <Package className={`h-12 w-12 mx-auto ${T.muted} opacity-30`} />
              <p className={`italic uppercase text-sm font-black tracking-[0.25em] ${T.muted}`}>
                {searchTerm || filterStatus !== "todos" ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
              </p>
              {(searchTerm || filterStatus !== "todos") && (
                <button onClick={() => { setSearchTerm(""); setFilterStatus("todos"); }}
                  className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div>
              {groupedProducts.map(({ category, products: groupProds }) => {
                const catKey = category;
                const catLabel = category === "__none__" ? "Sem Categoria" : category;
                const isCatCollapsed = collapsedCategories.has(catKey);
                const catTotal = groupProds.reduce((sum, p) => sum + p.totalQuantity, 0);
                const catHasAlert = groupProds.some(p => p.totalQuantity < p.minStock);

                return (
                  <div key={catKey} className={`border-b ${isLight ? "border-slate-200" : "border-white/5"}`}>
                    {/* ── Category header row ── */}
                    <div
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none transition-colors
                        ${isLight ? "bg-slate-200 hover:bg-slate-300/60" : "bg-white/[0.04] hover:bg-white/[0.07]"}
                      `}
                      onClick={() => toggleCategory(catKey)}
                    >
                      <div className={`shrink-0 ${isLight ? "text-slate-700" : "text-white/40"}`}>
                        {isCatCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                      </div>
                      <Tag className={`h-3 w-3 shrink-0 ${category === "__none__" ? (isLight ? "text-slate-600" : "text-white/30") : "text-primary"}`} />
                      <span className={`font-black text-[11px] uppercase tracking-widest flex-1 ${category === "__none__" ? T.muted : (isLight ? "text-slate-800" : "text-white/80")}`}>
                        {catLabel}
                      </span>
                      <span className={`text-[10px] font-bold ${T.muted}`}>
                        {groupProds.length} produto{groupProds.length !== 1 ? "s" : ""}
                      </span>
                      {catHasAlert && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" /> Estoque baixo
                        </span>
                      )}
                      <span className={`text-[10px] font-black text-primary ml-2`}>{catTotal} un</span>
                    </div>

                    {/* ── Products in this category ── */}
                    {!isCatCollapsed && (
                      <div className={`divide-y ${isLight ? "divide-slate-200" : "divide-white/[0.03]"}`}>
                        {groupProds.map(product => {
                          const expanded = expandedIds.has(product.id);
                          const batches: Batch[] = expandedBatches[product.id] || [];
                          const lowStock = product.totalQuantity < product.minStock;

                          return (
                            <div key={product.id}>
                              {/* Product row */}
                              <div
                                className={`flex items-center gap-3 pl-9 pr-5 py-3.5 cursor-pointer transition-colors
                                  ${expanded ? (isLight ? "bg-slate-100" : "bg-primary/5") : "hover:bg-white/[0.02]"}
                                  ${lowStock && !expanded ? (isLight ? "bg-orange-100/60" : "bg-orange-500/5") : ""}
                                `}
                                onClick={() => toggleExpand(product.id)}
                              >
                                <div className="shrink-0 text-primary">
                                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                    <span className={`font-black text-sm tracking-tight ${T.cellPrimary}`}>{product.name}</span>
                                    {product.brand && <span className={`text-[10px] font-bold ${T.cellSub}`}>{product.brand}</span>}
                                    {product.flavor && <span className={`text-[10px] font-bold ${T.cellSub}`}>· {product.flavor}</span>}
                                    {product.weight && <span className={`text-[10px] font-bold ${T.cellSub}`}>· {product.weight}</span>}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <StockBadge product={product} />
                                    {product.nearestExpiry && <ExpiryBadge date={product.nearestExpiry} />}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <div className={`text-xl font-black ${lowStock ? "text-orange-400" : "text-primary"}`}>
                                    {product.totalQuantity}
                                  </div>
                                  <div className={`text-[9px] font-bold uppercase ${T.muted}`}>{product.unit}</div>
                                  <div className={`text-[9px] font-bold uppercase ${T.muted}`}>mín: {product.minStock}</div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                  <button title="Nova Variante" onClick={() => { setAddBatchFor(product); setBatchForm(emptyBatch()); }} className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors">
                                    <Plus className="h-4 w-4" />
                                  </button>
                                  <button title="Dar Baixa (FEFO)" onClick={() => { setDeductFor(product); setDeductQty(""); setDeductReason(""); }} className={`p-1.5 rounded-lg transition-colors ${T.muted} hover:text-orange-400 hover:bg-orange-400/10`}>
                                    <ShoppingCart className="h-4 w-4" />
                                  </button>
                                  <button title="Editar Produto" onClick={() => openEditProduct(product)} className={`p-1.5 rounded-lg transition-colors ${T.muted} hover:text-blue-400 hover:bg-blue-400/10`}>
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button title="Excluir Produto" onClick={() => { if (confirm(`Excluir "${product.name}" e todos os seus lotes?`)) deleteProductMut.mutate(product.id); }} className={`p-1.5 rounded-lg transition-colors ${T.muted} hover:text-red-400 hover:bg-red-400/10`}>
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Expanded batches */}
                              {expanded && (
                                <div className={`pl-9 pr-5 pb-4 transition-colors ${T.expandedBg}`}>
                                  <div className="flex items-center justify-between py-2 mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                      Lotes ({batches.length})
                                    </span>
                                    <div className="flex items-center gap-3">
                                      <button onClick={() => { setAddBatchFor(product); setBatchForm(emptyBatch()); }} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                                        <Plus className="h-3 w-3" /> Nova Variante
                                      </button>
                                    </div>
                                  </div>

                                  {batches.length === 0 ? (
                                    <p className={`text-center py-4 text-[11px] font-bold italic ${T.muted}`}>Nenhum lote cadastrado</p>
                                  ) : (
                                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: isLight ? "#94a3b8" : "rgba(255,255,255,0.07)" }}>
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className={T.tableHd}>
                                            {["Cód Barras", "Variante", "Validade", "Fabricação", "Qtd", "Custo", "Fornecedor", "Entrada", ""].map(h => (
                                              <th key={h} className={`px-3 py-2 text-left font-black uppercase tracking-widest text-[9px] ${T.tableHdText}`}>{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {batches.map(b => {
                                            const u = getExpiryUrgency(b.expiryDate);
                                            return (
                                              <tr key={b.id} className={`border-t transition-colors ${T.tableRow} ${T.rowUrgency[u]}`}>
                                                <td className={`px-3 py-2.5 font-mono text-[10px] ${T.cellPrimary}`}>{b.barcode || "—"}</td>
                                                <td className={`px-3 py-2.5 font-bold ${T.cellSub}`}>{b.batchNumber || "—"}</td>
                                                <td className="px-3 py-2.5">
                                                  {b.expiryDate ? (
                                                    <span className="flex flex-col gap-0.5">
                                                      <span className={T.cellPrimary}>{fmtDate(b.expiryDate)}</span>
                                                      <ExpiryBadge date={b.expiryDate} />
                                                    </span>
                                                  ) : "—"}
                                                </td>
                                                <td className={`px-3 py-2.5 ${T.cellSub}`}>{fmtDate(b.manufactureDate)}</td>
                                                <td className={`px-3 py-2.5 font-black text-sm ${b.quantity <= 0 ? "text-red-400" : "text-primary"}`}>{b.quantity}</td>
                                                <td className={`px-3 py-2.5 ${T.cellSub}`}>{fmtCurrency(b.costPrice)}</td>
                                                <td className={`px-3 py-2.5 ${T.cellSub}`}>{b.supplier || "—"}</td>
                                                <td className={`px-3 py-2.5 ${T.cellSub}`}>{fmtDate(b.entryDate)}</td>
                                                <td className="px-3 py-2.5">
                                                  <div className="flex gap-1">
                                                    <button onClick={() => openEditBatch(b)} className={`p-1 rounded hover:text-blue-400 ${T.muted}`}><Edit2 className="h-3.5 w-3.5" /></button>
                                                    <button onClick={() => { if (confirm("Excluir este lote?")) deleteBatchMut.mutate(b.id); }} className={`p-1 rounded hover:text-red-400 ${T.muted}`}><Trash2 className="h-3.5 w-3.5" /></button>
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Modal: Add Product ─────────────────────────────────────────────── */}
      <Dialog open={addProductOpen} onOpenChange={open => { setAddProductOpen(open); if (!open) setHighlightFlavor(false); }}>
        <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border ${T.dialog}`}>
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tighter text-xl text-primary">Novo Produto</DialogTitle>
            <DialogDescription className={T.muted}>
              {highlightFlavor
                ? "Os dados foram pré-preenchidos com o produto existente. Preencha o Sabor/Variação para diferenciar este produto."
                : "Preencha os dados do produto. Se ele já existir, um novo lote será adicionado automaticamente."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${T.muted}`}>Dados do Produto</p>
              <ProductFields form={productForm} setForm={setProductForm} T={T} highlightFlavor={highlightFlavor} />
            </div>

            <div className={`border-t pt-4 ${isLight ? "border-slate-200" : "border-white/10"}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${T.muted}`}>Primeiro Lote</p>
              <BatchFields form={firstBatchForm} setForm={setFirstBatchForm} T={T} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setAddProductOpen(false)} className={T.muted}>Cancelar</Button>
              <Button
                onClick={handleCreateProductAndFirstBatch}
                disabled={createProductMut.isPending}
                className="bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest px-6 rounded-xl"
              >
                {createProductMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Produto"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Duplicate Found ──────────────────────────────────────────── */}
      <Dialog open={!!dupProduct} onOpenChange={() => setDupProduct(null)}>
        <DialogContent className={`max-w-md rounded-2xl border ${T.dialog}`}>
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tighter text-yellow-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Produto Já Existe
            </DialogTitle>
            <DialogDescription className={T.muted}>
              Encontramos <strong className={T.cellPrimary}>"{dupProduct?.name}"</strong> com as mesmas características. O que deseja fazer?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button onClick={handleDupAddBatch} className="bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest rounded-xl">
              Adicionar Novo Lote ao Produto Existente
            </Button>
            <Button variant="outline" onClick={() => { setDupProduct(null); }} className={`border font-black uppercase tracking-widest rounded-xl ${T.muted}`}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Edit Product ─────────────────────────────────────────────── */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border ${T.dialog}`}>
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tighter text-xl text-primary">Editar Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <ProductFields form={productForm} setForm={setProductForm} T={T} />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditingProduct(null)} className={T.muted}>Cancelar</Button>
              <Button
                onClick={() => editingProduct && updateProductMut.mutate({ id: editingProduct.id, data: productForm })}
                disabled={updateProductMut.isPending}
                className="bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest px-6 rounded-xl"
              >
                {updateProductMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Add Batch ────────────────────────────────────────────────── */}
      <Dialog open={!!addBatchFor} onOpenChange={() => { setAddBatchFor(null); setInlineScanValue(""); setInlineScanResult(null); }}>
        <DialogContent className={`max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border ${T.dialog}`}>
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tighter text-xl text-primary">Nova Variante</DialogTitle>
            <DialogDescription className={T.muted}>
              Produto: <strong className={T.cellPrimary}>{addBatchFor?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">

            {/* ── Inline barcode scan strip ── */}
            <div className={`rounded-xl border p-3 space-y-2 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/[0.03]"}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${T.muted}`}>
                <ScanBarcode className="h-3.5 w-3.5 text-emerald-400" /> Bipe para verificar o produto
              </p>
              <div className="flex gap-2">
                <Input
                  ref={inlineScanRef}
                  className={`flex-1 font-mono text-sm tracking-widest ${T.dialogInput}`}
                  value={inlineScanValue}
                  onChange={e => { setInlineScanValue(e.target.value); setInlineScanResult(null); }}
                  onKeyDown={e => { if (e.key === "Enter") handleInlineScan(); }}
                  placeholder="Bipe ou digite o código de barras..."
                  autoComplete="off"
                />
                <Button
                  onClick={handleInlineScan}
                  disabled={!inlineScanValue.trim() || inlineScanLoading}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl px-3 shrink-0"
                >
                  {inlineScanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanBarcode className="h-4 w-4" />}
                </Button>
              </div>

              {/* Inline result feedback */}
              {inlineScanResult && (
                <div className={`rounded-lg px-3 py-2 flex items-start gap-2 text-xs ${
                  inlineScanResult.status === "match" ? "bg-emerald-500/15 border border-emerald-500/30" :
                  inlineScanResult.status === "other"  ? "bg-yellow-500/15 border border-yellow-500/30" :
                                                         "bg-blue-500/15 border border-blue-500/30"
                }`}>
                  {inlineScanResult.status === "match" && (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-emerald-400 font-bold">
                        Produto confirmado — código de barras preenchido no lote.
                      </span>
                    </>
                  )}
                  {inlineScanResult.status === "other" && (
                    <>
                      <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                      <span className="text-yellow-400 font-bold">
                        Este código pertence a outro produto: <strong className="text-white">{inlineScanResult.otherProduct?.name}</strong>. Verifique se está bipando o produto correto.
                      </span>
                    </>
                  )}
                  {inlineScanResult.status === "new" && (
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                        <span className="text-blue-400 font-bold">
                          Código novo — será registrado neste produto ao salvar o lote.
                        </span>
                      </div>

                      {/* ── Inline variant toggle ── */}
                      {!showInlineVariant ? (
                        <button
                          onClick={() => {
                            setShowInlineVariant(true);
                            setInlineVariantName(addBatchFor?.name || "");
                            setInlineVariantFlavor("");
                          }}
                          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-400 hover:text-amber-300 hover:underline transition-colors"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          É outra variante / sabor / modelo? Cadastrar como nova variante desta categoria
                        </button>
                      ) : (
                        <div className={`rounded-xl border p-3 space-y-3 ${isLight ? "border-amber-300/50 bg-amber-50" : "border-amber-400/30 bg-amber-400/5"}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Nova variante em "{addBatchFor?.category || "mesma categoria"}"
                            </span>
                            <button
                              onClick={() => { setShowInlineVariant(false); setInlineVariantFlavor(""); setInlineVariantName(""); }}
                              className={`text-[10px] font-bold ${T.muted} hover:text-red-400`}
                            >
                              ✕ cancelar
                            </button>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>
                                Variante <span className="text-amber-400">*</span>
                              </Label>
                              <Input
                                className={`mt-1 ${T.dialogInput} border-amber-400/40 focus:border-amber-400`}
                                value={inlineVariantFlavor}
                                onChange={e => setInlineVariantFlavor(e.target.value)}
                                placeholder="Ex: Bacon, Queijo, Diet, Chef Chips..."
                                autoFocus
                              />
                            </div>
                            <div>
                              <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>
                                Nome do produto (opcional — padrão: {addBatchFor?.name})
                              </Label>
                              <Input
                                className={`mt-1 ${T.dialogInput}`}
                                value={inlineVariantName}
                                onChange={e => setInlineVariantName(e.target.value)}
                                placeholder={addBatchFor?.name || "Nome do produto"}
                              />
                            </div>
                          </div>
                          <p className={`text-[9px] ${T.muted}`}>
                            Categoria, marca, unidade e preço serão herdados de <strong>{addBatchFor?.name}</strong>. O lote abaixo será adicionado a esta variante.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <BatchFields form={batchForm} setForm={setBatchForm} T={T} />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setAddBatchFor(null)} className={T.muted}>Cancelar</Button>
              {showInlineVariant ? (
                <Button
                  onClick={handleCreateVariantAndBatch}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest px-6 rounded-xl gap-2"
                >
                  <Plus className="h-4 w-4" /> Criar Variante + Lote
                </Button>
              ) : (
                <Button
                  onClick={() => addBatchFor && handleSubmitBatch(addBatchFor.id)}
                  disabled={createBatchMut.isPending}
                  className="bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest px-6 rounded-xl"
                >
                  {createBatchMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar Lote"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Edit Batch ───────────────────────────────────────────────── */}
      <Dialog open={!!editingBatch} onOpenChange={() => setEditingBatch(null)}>
        <DialogContent className={`max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border ${T.dialog}`}>
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tighter text-xl text-primary">Editar Lote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <BatchFields form={batchForm} setForm={setBatchForm} T={T} />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditingBatch(null)} className={T.muted}>Cancelar</Button>
              <Button
                onClick={handleUpdateBatch}
                disabled={updateBatchMut.isPending}
                className="bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest px-6 rounded-xl"
              >
                {updateBatchMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Barcode Scanner ─────────────────────────────────────────── */}
      <Dialog open={scanOpen} onOpenChange={open => { setScanOpen(open); if (!open) { setScanValue(""); setScanResult(null); } }}>
        <DialogContent className={`max-w-md rounded-2xl border ${T.dialog}`}>
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tighter text-xl text-emerald-400 flex items-center gap-2">
              <ScanBarcode className="h-5 w-5" /> Bipar Produto
            </DialogTitle>
            <DialogDescription className={T.muted}>
              Bipe o produto com o leitor de código de barras ou digite o código manualmente e pressione Enter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Input */}
            <div>
              <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Código de Barras</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  ref={scanInputRef}
                  className={`flex-1 ${T.dialogInput} text-lg tracking-widest font-mono`}
                  value={scanValue}
                  onChange={e => { setScanValue(e.target.value); setScanResult(null); }}
                  onKeyDown={e => { if (e.key === "Enter") handleScan(); }}
                  placeholder="Aguardando bipagem..."
                  autoComplete="off"
                />
                <Button
                  onClick={handleScan}
                  disabled={!scanValue.trim() || scanLoading}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest rounded-xl px-4"
                >
                  {scanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Result */}
            {scanResult && (
              <div className={`rounded-xl border p-4 ${scanResult.found ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"}`}>
                {scanResult.found && scanResult.product ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                      <span className="font-black text-emerald-400 text-sm uppercase tracking-widest">Produto Encontrado</span>
                    </div>
                    <p className={`font-bold text-base ${T.cellPrimary}`}>{scanResult.product.name}</p>
                    <div className={`flex gap-4 text-xs ${T.muted}`}>
                      <span>Estoque: <strong className="text-primary">{scanResult.product.totalQuantity} {scanResult.product.unit}</strong></span>
                      {scanResult.product.nearestExpiry && (
                        <span>Validade mais próx.: <strong>{fmtDate(scanResult.product.nearestExpiry)}</strong></span>
                      )}
                    </div>
                    <p className={`text-[10px] uppercase tracking-widest ${T.muted}`}>→ Será aberto o formulário de <strong>Novo Lote</strong> para este produto.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                      <span className="font-black text-red-400 text-sm uppercase tracking-widest">Produto Não Cadastrado</span>
                    </div>
                    <p className={`text-xs ${T.muted}`}>Código <strong className="font-mono">{scanValue}</strong> não foi encontrado no estoque.</p>
                    {/* Category selector — ensures new product is created within the right category */}
                    <div>
                      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>
                        Categoria do novo produto
                      </Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          className={`flex-1 ${T.dialogInput}`}
                          value={scanCategory}
                          onChange={e => setScanCategory(e.target.value)}
                          placeholder="Ex: Salgadinhos, Bebidas..."
                          list="scan-categories"
                        />
                        <datalist id="scan-categories">
                          {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(cat => (
                            <option key={cat} value={cat!} />
                          ))}
                        </datalist>
                      </div>
                      <p className={`text-[10px] mt-1 ${T.muted}`}>→ O formulário de <strong>Novo Produto</strong> abrirá com esta categoria pré-preenchida.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="ghost" onClick={() => setScanOpen(false)} className={T.muted}>Cancelar</Button>
              {scanResult && (
                <Button
                  onClick={handleScanConfirm}
                  className={scanResult.found
                    ? "bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest px-6 rounded-xl"
                    : "bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest px-6 rounded-xl"
                  }
                >
                  {scanResult.found ? "Adicionar Lote" : "Cadastrar Produto"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Deduct (FEFO) ────────────────────────────────────────────── */}
      <Dialog open={!!deductFor} onOpenChange={() => setDeductFor(null)}>
        <DialogContent className={`max-w-sm rounded-2xl border ${T.dialog}`}>
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tighter text-xl text-orange-400 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Baixa de Estoque
            </DialogTitle>
            <DialogDescription className={T.muted}>
              <strong className={T.cellPrimary}>{deductFor?.name}</strong><br />
              Estoque atual: <strong className="text-primary">{deductFor?.totalQuantity} {deductFor?.unit}</strong><br />
              A baixa será realizada pelo método <strong>FEFO</strong> (validade mais próxima primeiro).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-3">
            <div>
              <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Quantidade</Label>
              <Input type="number" className={`mt-1 ${T.dialogInput}`} value={deductQty} onChange={e => setDeductQty(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Motivo</Label>
              <Input className={`mt-1 ${T.dialogInput}`} value={deductReason} onChange={e => setDeductReason(e.target.value)} placeholder="Ex: Consumo interno, perda, venda..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setDeductFor(null)} className={T.muted}>Cancelar</Button>
              <Button
                onClick={handleDeduct}
                disabled={deductMut.isPending || !deductQty || Number(deductQty) <= 0}
                className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest px-6 rounded-xl"
              >
                {deductMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Baixa"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
