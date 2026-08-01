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
  ScanBarcode, CheckCircle2, XCircle, GripVertical, Flame
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
  emLiquidacao?: boolean | null;
  ncm?: string | null;
  cfop?: string | null;
  codigoBalanca?: string | null;
  codigoProduto?: string | null;
  totalQuantity: number;
  nearestExpiry?: string | Date | null;
  createdAt: string;
  batchSkus?: string[];
}

interface Batch {
  id: number;
  productId: number;
  // ── Identidade da variante ────────────────────────────────────────────────
  sku?: string | null;          // Código interno/SKU exclusivo desta variante
  variantName?: string | null;  // Nome descritivo (ex: "Coca-Cola Zero 2L")
  barcode?: string | null;      // Código de barras EAN/GTIN
  // ── Lote / rastreabilidade ────────────────────────────────────────────────
  batchNumber?: string | null;  // Número do lote do fabricante
  supplierCode?: string | null;
  supplier?: string | null;
  // ── Datas ─────────────────────────────────────────────────────────────────
  manufactureDate?: string | null;
  expiryDate?: string | null;
  entryDate: string;
  // ── Estoque e preços ──────────────────────────────────────────────────────
  quantity: number;
  costPrice: number;
  salePrice?: number | null;    // Preço de venda por variante (sobrepõe produto)
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
  ncm: "", cfop: "", codigoBalanca: "", codigoProduto: "",
});

const emptyBatch = () => ({
  // Identidade da variante
  sku: "", variantName: "", barcode: "",
  // Lote / rastreabilidade
  batchNumber: "", supplierCode: "", supplier: "",
  // Estoque e preços
  quantity: "", costPrice: "", salePrice: "",
  // Datas
  manufactureDate: "", expiryDate: "",
  entryDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()),
});

// ─── Filter types ─────────────────────────────────────────────────────────────

type FilterStatus = "todos" | "baixo" | "vencendo" | "vencidos" | "sem_lotes";

// ─── Product Form fields (must be outside InventoryPage to avoid remount on re-render) ──

function ProductFields({ form, setForm, T, highlightFlavor = false }: any) {
  const isKg = form.unit === "kg";
  return (
    <div className="grid grid-cols-2 gap-3">

      {/* ── Tipo de venda ──────────────────────────────────────────────────── */}
      <div className="col-span-2">
        <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Tipo de Venda *</Label>
        <div className="flex gap-2 mt-1.5">
          <button
            type="button"
            onClick={() => setForm((f: any) => ({ ...f, unit: "Unidade" }))}
            className={`flex-1 h-11 rounded-xl border font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
              !isKg
                ? "bg-primary text-black border-primary shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                : "bg-transparent text-white/40 border-white/10 hover:border-white/30 hover:text-white/70"
            }`}
          >
            📦 Por Unidade
          </button>
          <button
            type="button"
            onClick={() => setForm((f: any) => ({ ...f, unit: "kg" }))}
            className={`flex-1 h-11 rounded-xl border font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
              isKg
                ? "bg-primary text-black border-primary shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                : "bg-transparent text-white/40 border-white/10 hover:border-white/30 hover:text-white/70"
            }`}
          >
            ⚖️ Por Peso (kg)
          </button>
        </div>
        {isKg && (
          <p className="text-[9px] mt-1.5 text-primary/80 font-bold bg-primary/5 border border-primary/20 rounded-lg px-2.5 py-1.5">
            ⚖️ Produto vendido por peso. No caixa, o operador informa o peso em kg e o sistema calcula automaticamente (peso × preço/kg).
          </p>
        )}
      </div>

      {/* ── Nome ────────────────────────────────────────────────────────────── */}
      <div className="col-span-2">
        <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Nome do Grupo *</Label>
        <Input className={`mt-1 ${T.dialogInput}`} value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder={isKg ? "Ex: Carne Bovina, Frango, Queijo Minas" : "Ex: Amaciantes, Detergente, Papel Higiênico"} />
        <p className="text-[9px] mt-1 text-white/30 font-bold">Nome genérico do tipo de produto — os detalhes (marca, tamanho, sabor) vão nas variantes</p>
      </div>

      {/* ── Marca + Categoria ─────────────────────────────────────────────── */}
      <div>
        <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Marca Geral</Label>
        <Input className={`mt-1 ${T.dialogInput}`} value={form.brand} onChange={e => setForm((f: any) => ({ ...f, brand: e.target.value }))} placeholder="Ex: Veja, Omo (opcional)" />
      </div>
      <div>
        <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Categoria</Label>
        <Input className={`mt-1 ${T.dialogInput}`} value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))} placeholder="Ex: Limpeza, Higiene, Bebidas" />
      </div>

      {/* ── Peso/Volume da embalagem (só para unidade) ─────────────────────── */}
      {!isKg && (
        <div>
          <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Tamanho Padrão da Embalagem</Label>
          <Input className={`mt-1 ${T.dialogInput}`} value={form.weight} onChange={e => setForm((f: any) => ({ ...f, weight: e.target.value }))} placeholder="Ex: 500ml, 1L, 45g (opcional)" />
        </div>
      )}

      {/* ── Estoque mínimo ─────────────────────────────────────────────────── */}
      <div>
        <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>{isKg ? "Estoque Mínimo (kg)" : "Estoque Mínimo (unid.)"}</Label>
        <Input type="number" className={`mt-1 ${T.dialogInput}`} value={form.minStock} onChange={e => setForm((f: any) => ({ ...f, minStock: e.target.value }))} placeholder={isKg ? "Ex: 1.5" : "5"} />
      </div>

      {/* ── Código Balança (PLU) ────────────────────────────────────────────── */}
      <div>
        <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Código Balança (PLU)</Label>
        <Input
          className={`mt-1 ${T.dialogInput}`}
          value={form.codigoBalanca ?? ""}
          onChange={e => setForm((f: any) => ({ ...f, codigoBalanca: e.target.value }))}
          placeholder={isKg ? "Ex: 3780 (etiqueta Urano)" : "Ex: 3780"}
        />
      </div>

      {/* ── Descrição ─────────────────────────────────────────────────────── */}
      <div className="col-span-2">
        <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Descrição</Label>
        <Input className={`mt-1 ${T.dialogInput}`} value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Opcional" />
      </div>
    </div>
  );
}

function BatchFields({ form, setForm, T, productUnit }: any) {
  const isKg = productUnit === "kg";
  return (
  <div className="grid grid-cols-2 gap-3">
    {/* ── Tipo de lote (info) ────────────────────────────────────────────── */}
    {isKg && (
      <div className="col-span-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 flex items-center gap-2">
        <span className="text-lg">⚖️</span>
        <p className="text-[9px] text-primary/80 font-bold">
          Produto por peso. Informe o custo e o preço de venda <strong>por kg</strong>.
          A quantidade em estoque é em <strong>kg</strong>.
        </p>
      </div>
    )}
    {/* ── Identidade da variante ─────────────────────────────────────────── */}
    <div>
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>
        Código Interno (SKU) <span className="text-primary">*</span>
      </Label>
      <Input
        className={`mt-1 ${T.dialogInput} font-mono`}
        value={form.sku ?? ""}
        onChange={e => setForm((f: any) => ({ ...f, sku: e.target.value }))}
        placeholder="Ex: 1001, SKU-042..."
      />
    </div>
    <div>
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Variante</Label>
      <Input
        className={`mt-1 ${T.dialogInput}`}
        value={form.variantName ?? ""}
        onChange={e => setForm((f: any) => ({ ...f, variantName: e.target.value }))}
        placeholder={isKg ? "Ex: Carne Bovina Traseira, Frango Inteiro..." : "Ex: Louê Essências Vanilla 500ml, Triex Fresh 500ml..."}
      />
      <p className="text-[9px] mt-1 text-white/30 font-bold">Escreva aqui a marca, tamanho, sabor — tudo que diferencia este item do grupo</p>
    </div>
    <div className="col-span-2">
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Código de Barras (EAN/GTIN)</Label>
      <Input
        className={`mt-1 ${T.dialogInput} font-mono tracking-widest`}
        value={form.barcode ?? ""}
        onChange={e => setForm((f: any) => ({ ...f, barcode: e.target.value }))}
        placeholder="Ex: 7894900010011 (EAN-13)..."
      />
    </div>
    {/* ── Estoque e preços ──────────────────────────────────────────────── */}
    <div>
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>
        {isKg ? "Quantidade em Estoque (kg) *" : "Quantidade *"}
      </Label>
      <Input
        type="number"
        step={isKg ? "0.001" : "1"}
        className={`mt-1 ${T.dialogInput}`}
        value={form.quantity}
        onChange={e => setForm((f: any) => ({ ...f, quantity: e.target.value }))}
        placeholder={isKg ? "Ex: 5.500 (kg)" : "0"}
      />
      {isKg && <p className="text-[9px] mt-1 text-white/30 font-bold">Kg disponíveis em estoque</p>}
    </div>
    <div>
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>
        {isKg ? "Custo de Compra (R$/kg)" : "Custo de Compra (R$)"}
      </Label>
      <Input
        className={`mt-1 ${T.dialogInput}`}
        value={form.costPrice}
        onChange={e => setForm((f: any) => ({ ...f, costPrice: e.target.value }))}
        placeholder={isKg ? "Ex: 18,50 por kg" : "0,00"}
      />
      {isKg && <p className="text-[9px] mt-1 text-white/30 font-bold">Custo por quilograma</p>}
    </div>
    <div>
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>
        {isKg ? "Preço de Venda (R$/kg)" : "Preço de Venda (R$)"}
      </Label>
      <Input
        className={`mt-1 ${T.dialogInput}`}
        value={form.salePrice ?? ""}
        onChange={e => setForm((f: any) => ({ ...f, salePrice: e.target.value }))}
        placeholder={isKg ? "Ex: 29,90 por kg" : "0,00 (deixe em branco para usar o preço do produto)"}
      />
      {isKg && <p className="text-[9px] mt-1 text-primary/60 font-bold">⚖️ Caixa calcula automaticamente: peso × preço/kg</p>}
    </div>
    {/* ── Datas ─────────────────────────────────────────────────────────── */}
    <div>
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Validade</Label>
      <Input type="date" className={`mt-1 ${T.dialogInput} [color-scheme:dark]`} value={form.expiryDate} onChange={e => setForm((f: any) => ({ ...f, expiryDate: e.target.value }))} />
    </div>
    <div>
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Data de Entrada</Label>
      <Input type="date" className={`mt-1 ${T.dialogInput} [color-scheme:dark]`} value={form.entryDate} onChange={e => setForm((f: any) => ({ ...f, entryDate: e.target.value }))} />
    </div>
    {/* ── Rastreabilidade (opcional) ────────────────────────────────────── */}
    <div>
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Nº Lote Fabricante</Label>
      <Input className={`mt-1 ${T.dialogInput}`} value={form.batchNumber ?? ""} onChange={e => setForm((f: any) => ({ ...f, batchNumber: e.target.value }))} placeholder="Ex: LOT-2024-001..." />
    </div>
    <div>
      <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Fornecedor</Label>
      <Input className={`mt-1 ${T.dialogInput}`} value={form.supplier ?? ""} onChange={e => setForm((f: any) => ({ ...f, supplier: e.target.value }))} placeholder="Ex: Distribuidora ABC..." />
    </div>
  </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Column resize state ──
  const [nameColPct, setNameColPct] = useState(48);
  const [btnColPct,  setBtnColPct]  = useState(38);
  const [colDrag, setColDrag] = useState<{ handle: 'left' | 'right'; startX: number; startPct: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
  const scanAutoRef = useRef(false);
  const scanLastKeystrokeRef = useRef(0);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Counting mode (repeated scans of same product) ──
  const [scanCountMode, setScanCountMode] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [scanCountedProduct, setScanCountedProduct] = useState<Product | null>(null);
  const [scanCountedBarcode, setScanCountedBarcode] = useState("");
  const [scanCountLoading, setScanCountLoading] = useState(false);

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
  const [inlineVariantCodigoProduto, setInlineVariantCodigoProduto] = useState("");

  // ── "Novo Produto" extra: highlight flavor field when coming from variant flow ──
  const [highlightFlavor, setHighlightFlavor] = useState(false);

  // ── Zerar quantidades state ──
  const [zeroQtyOpen, setZeroQtyOpen] = useState(false);
  const [zeroQtyPassword, setZeroQtyPassword] = useState("");
  const [zeroQtyStep, setZeroQtyStep] = useState<"password" | "confirm">("password");
  const [zeroQtyLoading, setZeroQtyLoading] = useState(false);
  const [zeroQtyConfirmText, setZeroQtyConfirmText] = useState("");

  // ── Limpar estoque state ──
  const [clearStockOpen, setClearStockOpen] = useState(false);
  const [clearStockPassword, setClearStockPassword] = useState("");
  const [clearStockStep, setClearStockStep] = useState<"password" | "confirm">("password");
  const [clearStockLoading, setClearStockLoading] = useState(false);
  const [clearStockConfirmText, setClearStockConfirmText] = useState("");

  // ── Restaurar estoque state ──
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restorePassword, setRestorePassword] = useState("");
  const [restoreStep, setRestoreStep] = useState<"password" | "confirm">("password");
  const [restoreLoading, setRestoreLoading] = useState(false);

  // ── Liquidar state ──
  const [liquidarProduct, setLiquidarProduct] = useState<Product | null>(null);
  const [liquidarPrice, setLiquidarPrice] = useState("");
  const [liquidarReason, setLiquidarReason] = useState("");

  // ── Form state ──
  const [productForm, setProductForm] = useState(emptyProduct());
  const [batchForm, setBatchForm] = useState(emptyBatch());
  const [deductQty, setDeductQty] = useState("");
  const [deductReason, setDeductReason] = useState("");

  // ── Also carry first-batch fields when creating new product ──
  const [firstBatchForm, setFirstBatchForm] = useState(emptyBatch());

  // ─── Theme ────────────────────────────────────────────────────────────────

  const T = isLight ? {
    page: "light-stock bg-slate-100 text-slate-900",
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
    page: "bg-[#090c0c] text-white isolate",
    surface: "bg-[#0e1214] border-[#1e2527] shadow-none",
    card: "bg-[#0e1214] border-[#1e2527]",
    cardHd: "border-[#1a2022]",
    h1: "text-white",
    subtitle: "text-white/30",
    muted: "text-white/40",
    badge: "border-white/10 text-white/60",
    selectTrigger: "bg-[#141a1c] border-[#1e2527] text-white/70",
    dropdown: "bg-[#0d1212] border-[#1e2527]",
    dropdownItem: "text-white/70 focus:bg-white/10",
    input: "bg-[#141a1c] border-[#1e2527] text-white focus:border-primary/50",
    tableHd: "bg-[#0b0f10]",
    tableHdText: "text-white/40",
    tableRow: "border-[#1a2022] hover:bg-white/[0.03]",
    cellPrimary: "text-white",
    cellSub: "text-white/40",
    toggleBtn: "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20",
    dialog: "bg-[#0a0f0f] border-[#1e2527] text-white",
    dialogLabel: "text-zinc-400",
    dialogInput: "bg-[#141a1c] border-[#1e2527] text-white focus:border-primary/50",
    searchIcon: "text-white/40",
    expandedBg: "bg-[#0b0f10]",
    rowUrgency: { safe: "", blue: "bg-blue-500/5", yellow: "bg-yellow-500/5", red: "bg-red-500/5" },
  } as const;

  // ─── Data Queries ──────────────────────────────────────────────────────────

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const { data: latestSnapshot } = useQuery<{ id: number; createdAt: string; createdBy: string; productCount: number } | null>({
    queryKey: ["/api/products/snapshot"],
    staleTime: 30000,
    refetchOnWindowFocus: false,
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

  const liquidarMut = useMutation({
    mutationFn: ({ id, salePrice }: any) => apiRequest("PUT", `/api/products/${id}`, { salePrice, emLiquidacao: true }),
    onSuccess: () => {
      invalidate();
      setLiquidarProduct(null);
      setLiquidarPrice("");
      setLiquidarReason("");
      toast({ title: "Produto em liquidação!", description: "Preço de venda atualizado." });
    },
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

  const { filteredProducts, exactMatchProductIds, skuMatchedBatchSkus } = useMemo(() => {
    let items = [...products];
    let exactIds = new Set<number>();
    // Maps productId → set of batch SKUs/barcodes that matched the search term
    let skuMatchedBatchSkus = new Map<number, Set<string>>();

    // Text search
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();

      // 1. Exact batch SKU / barcode match — highest priority
      const skuMatches = items.filter(p =>
        p.batchSkus?.some(s => s.toLowerCase() === term)
      );
      if (skuMatches.length > 0) {
        exactIds = new Set(skuMatches.map(p => p.id));
        items = skuMatches;
        // Track which specific SKUs matched so we can filter displayed batches
        for (const p of skuMatches) {
          const matched = new Set((p.batchSkus || []).filter(s => s.toLowerCase() === term));
          skuMatchedBatchSkus.set(p.id, matched);
        }
      } else {
        // 2. Exact codigoProduto match
        const exactCode = items.filter(p =>
          p.codigoProduto && p.codigoProduto.toLowerCase() === term
        );
        if (exactCode.length > 0) {
          exactIds = new Set(exactCode.map(p => p.id));
          items = exactCode;
        } else {
          // 3. Fuzzy search nos demais campos
          const fuse = new Fuse(items, {
            keys: ["name", "brand", "category", "flavor", "codigoBalanca", "codigoProduto", "weight"],
            threshold: 0.4,
            ignoreLocation: true,
            minMatchCharLength: 1,
          });
          items = fuse.search(term).map(r => r.item);
        }
      }
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

    return { filteredProducts: items, exactMatchProductIds: exactIds, skuMatchedBatchSkus };
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

  // ─── Auto-expand exact codigoProduto and batch SKU matches ────────────────

  useEffect(() => {
    if (exactMatchProductIds.size > 0) {
      setExpandedIds(prev => {
        const next = new Set(prev);
        exactMatchProductIds.forEach(id => next.add(id));
        return next;
      });
    }
  }, [exactMatchProductIds]);

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
      codigoProduto: (p as any).codigoProduto || "",
    });
    setEditingProduct(p);
  }

  function openEditBatch(b: Batch) {
    setBatchForm({
      sku: b.sku || "",
      variantName: b.variantName || "",
      barcode: b.barcode || "",
      supplierCode: b.supplierCode || "",
      batchNumber: b.batchNumber || "",
      supplier: b.supplier || "",
      quantity: String(b.quantity),
      costPrice: b.costPrice ? String((b.costPrice / 100).toFixed(2)) : "",
      salePrice: b.salePrice ? String((b.salePrice / 100).toFixed(2)) : "",
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
    // Validate required fields
    if (!productForm.name.trim()) {
      return toast({ title: "Nome do produto é obrigatório", variant: "destructive" });
    }
    if (!firstBatchForm.quantity || Number(firstBatchForm.quantity) <= 0) {
      return toast({ title: "Informe a quantidade do primeiro lote", variant: "destructive" });
    }
    if (!firstBatchForm.sku?.trim()) {
      return toast({
        title: "SKU (Código Interno) obrigatório no lote",
        description: "Cada variante deve ter seu próprio código interno exclusivo (SKU). Preencha o campo 'Código Interno' no primeiro lote.",
        variant: "destructive",
      });
    }

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

    // Create first batch
    const batchRes = await fetch(`/api/products/${newProd.id}/batches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...firstBatchForm }),
    });
    if (!batchRes.ok) {
      const err = await batchRes.json();
      // Product was created but batch failed — clean up by deleting the product
      await fetch(`/api/products/${newProd.id}`, { method: "DELETE", credentials: "include" });
      return toast({ title: "Erro ao criar lote", description: err.message, variant: "destructive" });
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
      scanAutoRef.current = false;
      setScanCountMode(false);
      setScanCount(0);
      setScanCountedProduct(null);
      setScanCountedBarcode("");
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  }, [scanOpen]);

  // Auto-confirm when scanner triggered the search and result arrived
  useEffect(() => {
    if (scanResult && scanAutoRef.current) {
      scanAutoRef.current = false;
      handleScanConfirm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanResult]);

  // Reset inline scan + variant form when the Add Batch modal opens/closes
  useEffect(() => {
    setInlineScanValue("");
    setInlineScanResult(null);
    setShowInlineVariant(false);
    setInlineVariantFlavor("");
    setInlineVariantName("");
    setInlineVariantCodigoProduto("");
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
      // Try barcode first, then SKU
      let res = await fetch(`/api/products/barcode/${encodeURIComponent(code)}`, { credentials: "include" });
      if (!res.ok) {
        res = await fetch(`/api/products/sku/${encodeURIComponent(code)}`, { credentials: "include" });
      }
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
      // Product exists → enter counting mode (bip more = more units)
      setScanCountedProduct(scanResult.product);
      setScanCountedBarcode(scanValue.trim());
      setScanCount(1);
      setScanCountMode(true);
      setScanResult(null);
      setScanValue("");
      setTimeout(() => scanInputRef.current?.focus(), 80);
    } else {
      // Product not found → open New Product modal with barcode and category pre-filled
      setProductForm({ ...emptyProduct(), category: scanCategory.trim() });
      setFirstBatchForm({ ...emptyBatch(), barcode: scanValue.trim() });
      setAddProductOpen(true);
      setScanOpen(false);
      setScanValue("");
      setScanResult(null);
      setScanCategory("");
      toast({ title: "Produto não cadastrado — preencha os dados para cadastrá-lo." });
    }
  }

  function handleConfirmCount() {
    if (!scanCountedProduct || scanCount <= 0) return;
    setScanCountLoading(true);
    createBatchMut.mutate(
      {
        productId: scanCountedProduct.id,
        data: {
          quantity: String(scanCount),
          barcode: scanCountedBarcode,
          sku: "",
          variantName: "",
          costPrice: "",
          salePrice: scanCountedProduct.salePrice ? String((scanCountedProduct.salePrice / 100).toFixed(2)) : "",
          entryDate: new Date().toISOString().split("T")[0],
          expiryDate: "",
          batchNumber: "",
          supplier: "",
        },
      },
      {
        onSettled: () => {
          setScanCountLoading(false);
          setScanCountMode(false);
          setScanCount(0);
          setScanCountedProduct(null);
          setScanCountedBarcode("");
          setScanOpen(false);
        },
      }
    );
  }

  async function handleInlineScan() {
    const code = inlineScanValue.trim();
    if (!code) return;
    setInlineScanLoading(true);
    setInlineScanResult(null);
    try {
      // Try barcode first, then SKU
      let res = await fetch(`/api/products/barcode/${encodeURIComponent(code)}`, { credentials: "include" });
      if (!res.ok) {
        res = await fetch(`/api/products/sku/${encodeURIComponent(code)}`, { credentials: "include" });
      }
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
        // Code not registered — fill it as new
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
        codigoProduto: "",
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
      // 1. Create the variant product (family grouper — inherits parent data)
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
        // codigoProduto fica no nível de família — não é o SKU da variante
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

      // 2. Create the batch for the new variant — SKU and barcode go HERE (batch level)
      const batchPayload = {
        ...batchForm,
        sku: inlineVariantCodigoProduto.trim() || batchForm.sku || "",
        variantName: inlineVariantFlavor.trim() || inlineVariantName.trim() || batchForm.variantName || "",
        barcode: inlineScanValue.trim() || batchForm.barcode,
      };
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
      setInlineVariantCodigoProduto("");
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

  async function handleUpdateBatch() {
    if (!editingBatch) return;
    // SKU, variantName e salePrice agora pertencem ao lote (variante), não ao produto
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
  const saleCount     = products.filter(p => p.emLiquidacao).length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`p-4 md:p-6 lg:p-10 space-y-6 min-h-screen transition-colors duration-300 ${T.page}`}>

      {/* ── Column resize drag overlay (fullscreen, only active while dragging) ── */}
      {colDrag && (
        <div
          className="fixed inset-0 z-[9999] cursor-col-resize"
          onMouseMove={(e) => {
            if (!listRef.current) return;
            const rect = listRef.current.getBoundingClientRect();
            const delta = ((e.clientX - colDrag.startX) / rect.width) * 100;
            if (colDrag.handle === 'left') {
              setNameColPct(Math.max(15, Math.min(75, colDrag.startPct + delta)));
            } else {
              setBtnColPct(Math.max(15, Math.min(75, colDrag.startPct - delta)));
            }
          }}
          onMouseUp={() => setColDrag(null)}
          onMouseLeave={() => setColDrag(null)}
        />
      )}

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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: Package, label: "Produtos", value: totalProducts, color: "text-primary" },
          { icon: TrendingDown, label: "Estoque Baixo", value: lowStockCount, color: "text-orange-400" },
          { icon: AlertTriangle, label: "Vencendo (7d)", value: expiringCount, color: "text-yellow-400" },
          { icon: X, label: "Vencidos", value: expiredCount, color: "text-red-400" },
          { icon: Flame, label: "Em Liquidação", value: saleCount, color: "text-orange-500" },
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
        <CardHeader className={`border-b p-4 transition-colors ${T.cardHd}`}>
          <div className="flex flex-col gap-3">
            <CardTitle className={`flex items-center gap-2 font-black italic uppercase tracking-tighter text-xl ${T.cellPrimary}`}>
              <Layers className="h-6 w-6 text-primary" /> Produtos e Lotes
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {latestSnapshot && (
                <Button
                  onClick={() => { setRestoreOpen(true); setRestorePassword(""); setRestoreStep("password"); }}
                  className="h-9 px-4 bg-primary/10 hover:bg-primary/20 text-white border border-primary/40 hover:border-primary/70 font-black text-[10px] uppercase tracking-widest rounded-xl gap-2 shadow-[0_0_10px_rgba(0,229,255,0.25)] hover:shadow-[0_0_18px_rgba(0,229,255,0.5)] transition-all"
                  title={`Restaurar snapshot de ${new Date(latestSnapshot.createdAt).toLocaleString("pt-BR")} (${latestSnapshot.productCount} produtos)`}
                >
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Restaurar
                </Button>
              )}
              <Button
                onClick={() => { setZeroQtyOpen(true); setZeroQtyPassword(""); setZeroQtyStep("password"); setZeroQtyConfirmText(""); }}
                className="h-9 px-4 bg-primary/10 hover:bg-primary/20 text-white border border-primary/40 hover:border-primary/70 font-black text-[10px] uppercase tracking-widest rounded-xl gap-2 shadow-[0_0_10px_rgba(0,229,255,0.25)] hover:shadow-[0_0_18px_rgba(0,229,255,0.5)] transition-all"
                title="Zera somente as quantidades. Produtos, categorias e dados permanecem intactos."
              >
                <BarChart3 className="h-4 w-4 text-primary" /> Zerar Qtd
              </Button>
              <Button
                onClick={() => { setClearStockOpen(true); setClearStockPassword(""); setClearStockStep("password"); setClearStockConfirmText(""); }}
                className="h-9 px-4 bg-primary/10 hover:bg-primary/20 text-white border border-primary/40 hover:border-primary/70 font-black text-[10px] uppercase tracking-widest rounded-xl gap-2 shadow-[0_0_10px_rgba(0,229,255,0.25)] hover:shadow-[0_0_18px_rgba(0,229,255,0.5)] transition-all"
              >
                <Trash2 className="h-4 w-4 text-primary" /> Limpar Estoque
              </Button>
              <Button
                onClick={() => setScanOpen(true)}
                className="h-9 px-4 bg-primary/10 hover:bg-primary/20 text-white border border-primary/40 hover:border-primary/70 font-black text-[10px] uppercase tracking-widest rounded-xl gap-2 shadow-[0_0_10px_rgba(0,229,255,0.25)] hover:shadow-[0_0_18px_rgba(0,229,255,0.5)] transition-all"
              >
                <ScanBarcode className="h-4 w-4 text-primary" /> Bipar Produto
              </Button>
              <Button
                onClick={() => { setAddProductOpen(true); setProductForm(emptyProduct()); setFirstBatchForm(emptyBatch()); }}
                className="h-9 px-4 bg-primary/10 hover:bg-primary/20 text-white border border-primary/40 hover:border-primary/70 font-black text-[10px] uppercase tracking-widest rounded-xl gap-2 shadow-[0_0_10px_rgba(0,229,255,0.25)] hover:shadow-[0_0_18px_rgba(0,229,255,0.5)] transition-all"
              >
                <Plus className="h-4 w-4 text-primary" /> Novo Produto
              </Button>
            </div>
          </div>

          {/* Search + filters */}
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${T.searchIcon}`} />
              <input
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium transition-colors outline-none ${T.input}`}
                placeholder="Buscar por nome, marca, categoria, SKU, código de barras..."
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
            <div ref={listRef}>
              {/* ── Column resize header ── */}
              <div className={`relative flex items-center h-7 border-b select-none ${isLight ? "border-slate-200 bg-slate-50" : "border-white/5 bg-black/10"}`}>
                <span className={`absolute left-9 text-[9px] font-black uppercase tracking-widest ${T.muted} pointer-events-none`} style={{ maxWidth: `${nameColPct - 5}%` }}>Produto</span>
                {/* Alça esquerda — borda direita da coluna de nomes */}
                <div
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setColDrag({ handle: 'left', startX: e.clientX, startPct: nameColPct }); }}
                  className="absolute inset-y-0 z-10 flex items-center justify-center cursor-col-resize group select-none"
                  style={{ left: `${nameColPct}%`, transform: "translateX(-50%)", width: "24px" }}
                  title="Arraste para ajustar coluna de nomes"
                >
                  <div className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-px ${isLight ? "bg-slate-300 group-hover:bg-primary" : "bg-white/20 group-hover:bg-primary"}`} />
                  <div className={`relative z-10 flex items-center justify-center rounded-full w-4 h-4 ${isLight ? "bg-white border border-slate-300 group-hover:border-primary" : "bg-zinc-800 border border-white/20 group-hover:border-primary"}`}>
                    <GripVertical className={`h-2.5 w-2.5 ${isLight ? "text-slate-400 group-hover:text-primary" : "text-white/30 group-hover:text-primary"}`} />
                  </div>
                </div>
                {/* Alça direita — borda esquerda da coluna de botões */}
                <div
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setColDrag({ handle: 'right', startX: e.clientX, startPct: btnColPct }); }}
                  className="absolute inset-y-0 z-10 flex items-center justify-center cursor-col-resize group select-none"
                  style={{ right: `${btnColPct}%`, transform: "translateX(50%)", width: "24px" }}
                  title="Arraste para ajustar coluna de botões"
                >
                  <div className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-px ${isLight ? "bg-slate-300 group-hover:bg-primary" : "bg-white/20 group-hover:bg-primary"}`} />
                  <div className={`relative z-10 flex items-center justify-center rounded-full w-4 h-4 ${isLight ? "bg-white border border-slate-300 group-hover:border-primary" : "bg-zinc-800 border border-white/20 group-hover:border-primary"}`}>
                    <GripVertical className={`h-2.5 w-2.5 ${isLight ? "text-slate-400 group-hover:text-primary" : "text-white/30 group-hover:text-primary"}`} />
                  </div>
                </div>
                <span className={`absolute right-4 text-[9px] font-black uppercase tracking-widest ${T.muted} pointer-events-none`} style={{ maxWidth: `${btnColPct - 5}%` }}>Qtd · Ações</span>
              </div>

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
                        ${isLight ? "bg-slate-200 hover:bg-slate-300/60" : "bg-[#111618] hover:bg-[#161d1f]"}
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
                          const skuFilter = skuMatchedBatchSkus.get(product.id);
                          const lowStock = product.totalQuantity < product.minStock;

                          const isExactMatch = exactMatchProductIds.has(product.id);
                          return (
                            <div key={product.id} className={isExactMatch ? `ring-2 ring-inset ${isLight ? "ring-primary/40" : "ring-primary/50"} rounded-xl mx-1 my-0.5` : ""}>
                              {/* Product row */}
                              <div
                                className={`flex items-center pr-5 py-3.5 cursor-pointer transition-colors
                                  ${isExactMatch ? (isLight ? "bg-primary/5" : "bg-primary/10") : expanded ? (isLight ? "bg-slate-100" : "bg-primary/5") : "hover:bg-white/[0.02]"}
                                  ${lowStock && !expanded && !isExactMatch ? (isLight ? "bg-orange-100/60" : "bg-orange-500/5") : ""}
                                `}
                                onClick={() => toggleExpand(product.id)}
                              >
                                {/* LEFT PANEL: chevron + name */}
                                <div
                                  className="flex items-center gap-3 pl-9 min-w-0 overflow-hidden shrink-0"
                                  style={{ width: `${nameColPct}%` }}
                                >
                                  <div className="shrink-0 text-primary">
                                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                      <span className={`font-black text-sm tracking-tight ${T.cellPrimary}`}>{product.name}</span>
                                      {product.emLiquidacao && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wide text-orange-500">
                                          <Flame className="h-3 w-3" />Em Liquidação
                                        </span>
                                      )}
                                      {product.brand && <span className={`text-[10px] font-bold ${T.cellSub}`}>{product.brand}</span>}
                                      {product.flavor && <span className={`text-[10px] font-bold ${T.cellSub}`}>· {product.flavor}</span>}
                                      {product.weight && <span className={`text-[10px] font-bold ${T.cellSub}`}>· {product.weight}</span>}
                                      {product.codigoProduto && (
                                        <span title="Código de referência da família do produto (não é o SKU de variante)" className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black font-mono ${isExactMatch ? "bg-primary/20 text-primary border border-primary/40" : `border ${isLight ? "bg-black/5 border-black/10 text-black/40" : "bg-white/5 border-white/10 text-white/30"}`}`}>
                                          <span className="opacity-60 font-bold not-italic text-[8px]">FAM</span> {product.codigoProduto}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <StockBadge product={product} />
                                      {product.nearestExpiry && <ExpiryBadge date={product.nearestExpiry} />}
                                    </div>
                                  </div>
                                </div>

                                {/* RIGHT PANEL: qty + buttons */}
                                <div className="flex-1" />
                                <div className="flex items-center justify-end gap-3 shrink-0" style={{ width: `${btnColPct}%` }}>
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
                                    <button title="Liquidar Produto" onClick={() => { setLiquidarProduct(product); setLiquidarPrice(product.salePrice ? (product.salePrice / 100).toFixed(2).replace(".", ",") : ""); setLiquidarReason(""); }} className={`p-1.5 rounded-lg transition-colors ${T.muted} hover:text-amber-400 hover:bg-amber-400/10`}>
                                      <Flame className="h-4 w-4" />
                                    </button>
                                    <button title="Editar Produto" onClick={() => openEditProduct(product)} className={`p-1.5 rounded-lg transition-colors ${T.muted} hover:text-blue-400 hover:bg-blue-400/10`}>
                                      <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button title="Excluir Produto" onClick={() => { if (confirm(`Excluir "${product.name}" e todos os seus lotes?`)) deleteProductMut.mutate(product.id); }} className={`p-1.5 rounded-lg transition-colors ${T.muted} hover:text-red-400 hover:bg-red-400/10`}>
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
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
                                            {["SKU", "Nome da Variante", "EAN/GTIN", "Validade", "Qtd", "Custo", "Preço Venda", "Fornecedor", "Entrada", ""].map(h => (
                                              <th key={h} className={`px-3 py-2 text-left font-black uppercase tracking-widest text-[9px] ${T.tableHdText}`}>{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {batches.map(b => {
                                            const u = getExpiryUrgency(b.expiryDate);
                                            const isBatchHighlighted = !!skuFilter && (
                                              (!!b.sku && skuFilter.has(b.sku.toLowerCase())) ||
                                              (!!b.barcode && skuFilter.has(b.barcode.toLowerCase()))
                                            );
                                            return (
                                              <tr key={b.id} className={`border-t transition-colors ${T.tableRow} ${isBatchHighlighted ? (isLight ? "bg-primary/10 ring-2 ring-inset ring-primary/40" : "bg-primary/15 ring-2 ring-inset ring-primary/50") : T.rowUrgency[u]}`}>
                                                {/* SKU */}
                                                <td className={`px-3 py-2.5 font-mono text-[10px] font-black ${isBatchHighlighted ? "text-primary" : b.sku ? "text-primary" : T.muted}`}>
                                                  {b.sku ? `#${b.sku}` : <span className="opacity-30">—</span>}
                                                  {isBatchHighlighted && <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[8px] font-black uppercase tracking-widest">● match</span>}
                                                </td>
                                                {/* Nome da variante */}
                                                <td className={`px-3 py-2.5 font-bold text-[11px] ${T.cellPrimary}`}>
                                                  {b.variantName || b.batchNumber || <span className={`${T.muted} font-normal opacity-60`}>—</span>}
                                                </td>
                                                {/* EAN/GTIN */}
                                                <td className={`px-3 py-2.5 font-mono text-[10px] ${T.cellSub}`}>{b.barcode || "—"}</td>
                                                {/* Validade */}
                                                <td className="px-3 py-2.5">
                                                  {b.expiryDate ? (
                                                    <span className="flex flex-col gap-0.5">
                                                      <span className={T.cellPrimary}>{fmtDate(b.expiryDate)}</span>
                                                      <ExpiryBadge date={b.expiryDate} />
                                                    </span>
                                                  ) : "—"}
                                                </td>
                                                {/* Quantidade */}
                                                <td className={`px-3 py-2.5 font-black text-sm ${b.quantity <= 0 ? "text-red-400" : "text-primary"}`}>{b.quantity}</td>
                                                {/* Custo */}
                                                <td className={`px-3 py-2.5 ${T.cellSub}`}>{fmtCurrency(b.costPrice)}</td>
                                                {/* Preço de Venda */}
                                                <td className={`px-3 py-2.5 font-bold ${b.salePrice ? "text-emerald-400" : T.muted}`}>
                                                  {b.salePrice ? fmtCurrency(b.salePrice) : <span className="opacity-40 text-[10px]">—</span>}
                                                </td>
                                                {/* Fornecedor */}
                                                <td className={`px-3 py-2.5 ${T.cellSub}`}>{b.supplier || "—"}</td>
                                                {/* Entrada */}
                                                <td className={`px-3 py-2.5 ${T.cellSub}`}>{fmtDate(b.entryDate)}</td>
                                                {/* Ações */}
                                                <td className="px-3 py-2.5">
                                                  <div className="flex gap-1">
                                                    <button onClick={() => openEditBatch(b)} className={`p-1 rounded hover:text-blue-400 ${T.muted}`}><Edit2 className="h-3.5 w-3.5" /></button>
                                                    <button onClick={() => { if (confirm("Excluir esta variante?")) deleteBatchMut.mutate(b.id); }} className={`p-1 rounded hover:text-red-400 ${T.muted}`}><Trash2 className="h-3.5 w-3.5" /></button>
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
              <BatchFields form={firstBatchForm} setForm={setFirstBatchForm} T={T} productUnit={productForm.unit} />
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
                            <div>
                              <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>
                                SKU da variante (opcional)
                              </Label>
                              <Input
                                className={`mt-1 ${T.dialogInput} font-mono`}
                                value={inlineVariantCodigoProduto}
                                onChange={e => setInlineVariantCodigoProduto(e.target.value)}
                                placeholder="Ex: 1001, SKU-042..."
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

            <BatchFields form={batchForm} setForm={setBatchForm} T={T} productUnit={addBatchFor?.unit} />
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
            <DialogTitle className="font-black italic uppercase tracking-tighter text-xl text-primary">Editar Variante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <BatchFields form={batchForm} setForm={setBatchForm} T={T} productUnit={productForm.unit} />
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
              Bipe o produto ou digite o código de barras (EAN/GTIN) ou o SKU (código interno da variante) e pressione Enter.
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
                  onChange={e => {
                    const now = Date.now();
                    const gap = now - scanLastKeystrokeRef.current;
                    scanLastKeystrokeRef.current = now;
                    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);

                    if (scanCountMode) {
                      // ── Counting mode: each fast scan = +1 unit ──
                      setScanValue(e.target.value);
                      if (gap < 50 && e.target.value.trim().length >= 3) {
                        scanTimerRef.current = setTimeout(() => {
                          setScanCount(prev => prev + 1);
                          setScanValue("");
                          setTimeout(() => scanInputRef.current?.focus(), 50);
                        }, 120);
                      }
                      return;
                    }

                    // ── Normal search mode ──
                    setScanValue(e.target.value);
                    setScanResult(null);
                    if (gap < 50 && e.target.value.trim().length >= 3) {
                      scanAutoRef.current = true;
                      const code = e.target.value;
                      scanTimerRef.current = setTimeout(() => {
                        (async () => {
                          setScanLoading(true);
                          setScanResult(null);
                          try {
                            let res = await fetch(`/api/products/barcode/${encodeURIComponent(code.trim())}`, { credentials: "include" });
                            if (!res.ok) res = await fetch(`/api/products/sku/${encodeURIComponent(code.trim())}`, { credentials: "include" });
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
                        })();
                      }, 120);
                    } else {
                      scanAutoRef.current = false;
                    }
                  }}
                  onKeyDown={e => { if (e.key === "Enter") handleScan(); }}
                  placeholder="Bipe o produto ou digite e pressione Enter..."
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

            {/* ── Counting mode UI ── */}
            {scanCountMode && scanCountedProduct && (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <span className="font-black text-emerald-400 text-sm uppercase tracking-widest">Repondo Estoque</span>
                  </div>
                  <p className={`font-bold text-base ${T.cellPrimary}`}>{scanCountedProduct.name}</p>
                  <p className={`text-xs ${T.muted}`}>
                    Estoque atual: <strong className="text-primary">{scanCountedProduct.totalQuantity} {scanCountedProduct.unit}</strong>
                  </p>
                </div>

                {/* Big counter */}
                <div className="flex flex-col items-center gap-2 py-4">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${T.muted}`}>Quantidade bipada</p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setScanCount(n => Math.max(1, n - 1))}
                      className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 text-xl font-black transition-all"
                    >−</button>
                    <span className="text-7xl font-black text-emerald-400 tabular-nums w-24 text-center">{scanCount}</span>
                    <button
                      onClick={() => setScanCount(n => n + 1)}
                      className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 text-xl font-black transition-all"
                    >+</button>
                  </div>
                  <p className={`text-[10px] ${T.muted}`}>Continue bipando para incrementar — ou ajuste manualmente</p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => { setScanCountMode(false); setScanCount(0); setScanCountedProduct(null); }}
                    className={`flex-1 ${T.muted}`}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleConfirmCount}
                    disabled={scanCountLoading}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest rounded-xl"
                  >
                    {scanCountLoading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : `Confirmar +${scanCount} ${scanCountedProduct.unit}`}
                  </Button>
                </div>
              </div>
            )}

            {/* ── Normal result + actions ── */}
            {!scanCountMode && (
              <>
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
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                          <span className="font-black text-red-400 text-sm uppercase tracking-widest">Produto Não Cadastrado</span>
                        </div>
                        <p className={`text-xs ${T.muted}`}>Código <strong className="font-mono">{scanValue}</strong> não foi encontrado no estoque.</p>
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
                      {scanResult.found ? "Contar unidades →" : "Cadastrar Produto"}
                    </Button>
                  )}
                </div>
              </>
            )}
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

      {/* ── Liquidar Dialog ── */}
      <Dialog open={!!liquidarProduct} onOpenChange={() => setLiquidarProduct(null)}>
        <DialogContent className={`max-w-sm rounded-2xl border ${T.dialog}`}>
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tighter text-xl text-amber-400 flex items-center gap-2">
              <Flame className="h-5 w-5" /> Liquidar Produto
            </DialogTitle>
            <DialogDescription className={T.muted}>
              <strong className={T.cellPrimary}>{liquidarProduct?.name}</strong><br />
              {liquidarProduct?.salePrice
                ? <>Preço atual: <strong className="text-primary">{(liquidarProduct.salePrice / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></>
                : "Sem preço cadastrado"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-3">
            <div>
              <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Novo Preço de Venda (R$) *</Label>
              <Input
                className={`mt-1 ${T.dialogInput}`}
                value={liquidarPrice}
                onChange={e => setLiquidarPrice(e.target.value)}
                placeholder="Ex: 1,99"
                autoFocus
              />
            </div>
            <div>
              <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Motivo da Liquidação (opcional)</Label>
              <Input
                className={`mt-1 ${T.dialogInput}`}
                value={liquidarReason}
                onChange={e => setLiquidarReason(e.target.value)}
                placeholder="Ex: Próximo ao vencimento, excesso de estoque..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setLiquidarProduct(null)} className={T.muted}>Cancelar</Button>
              <Button
                onClick={() => {
                  if (!liquidarProduct || !liquidarPrice) return;
                  liquidarMut.mutate({ id: liquidarProduct.id, salePrice: liquidarPrice });
                }}
                disabled={liquidarMut.isPending || !liquidarPrice}
                className="bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest px-6 rounded-xl gap-2"
              >
                {liquidarMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Flame className="h-4 w-4" /> Liquidar</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Zerar Quantidades ── */}
      <Dialog open={zeroQtyOpen} onOpenChange={(o) => { if (!zeroQtyLoading) { setZeroQtyOpen(o); setZeroQtyStep("password"); setZeroQtyPassword(""); setZeroQtyConfirmText(""); } }}>
        <DialogContent className={`max-w-lg border ${T.dialog}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black italic uppercase tracking-tighter text-orange-400 text-xl">
              <BarChart3 className="h-6 w-6" /> Zerar Quantidades do Estoque
            </DialogTitle>
            <DialogDescription className={T.muted}>
              {zeroQtyStep === "password" ? "Autentique-se para prosseguir com esta operação." : "Confirme a zeragem de quantidades."}
            </DialogDescription>
          </DialogHeader>

          {zeroQtyStep === "password" ? (
            <div className="space-y-4 mt-2">
              <div className="rounded-xl border-2 border-orange-500 bg-orange-950/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-400 shrink-0" />
                  <p className="text-orange-300 font-black uppercase text-[12px] tracking-widest">Operação de Inventário</p>
                </div>
                <p className="text-orange-100 text-sm font-semibold leading-relaxed">
                  Isso vai <strong className="text-white">zerar a quantidade de todos os lotes</strong> do estoque.
                </p>
                <ul className={`text-sm space-y-1.5 list-none ${isLight ? "text-orange-800" : "text-orange-200/80"}`}>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /><span>Todos os produtos são <strong>mantidos</strong> com suas categorias e informações</span></li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /><span>Códigos de barras, SKUs e preços são <strong>preservados</strong></span></li>
                  <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" /><span>Apenas as <strong>quantidades</strong> de todos os lotes são zeradas</span></li>
                </ul>
                <p className={`text-[11px] font-black uppercase tracking-widest border-t pt-2 ${isLight ? "border-orange-300 text-orange-600" : "border-orange-500/30 text-orange-400"}`}>
                  Ideal para inventário: organize os produtos e insira as quantidades depois.
                </p>
              </div>
              <div>
                <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Senha do Administrador</Label>
                <Input
                  type="password"
                  className={`mt-1 ${T.dialogInput}`}
                  value={zeroQtyPassword}
                  onChange={e => setZeroQtyPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter" && zeroQtyPassword) setZeroQtyStep("confirm"); }}
                />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <Button variant="ghost" onClick={() => setZeroQtyOpen(false)} className={T.muted}>Cancelar</Button>
                <Button
                  disabled={!zeroQtyPassword}
                  onClick={() => setZeroQtyStep("confirm")}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest px-6 rounded-xl"
                >
                  Prosseguir
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="rounded-xl border-2 border-orange-500 bg-orange-950/60 p-5 space-y-3">
                <p className="text-orange-300 font-black uppercase text-[13px] tracking-widest text-center">Confirme a zeragem</p>
                <p className="text-white text-sm font-bold leading-relaxed text-center">
                  As quantidades de <span className="text-orange-400">todos os {products.length} produto{products.length !== 1 ? "s" : ""}</span> serão zeradas.<br/>
                  <span className={`text-sm font-medium ${isLight ? "text-orange-700" : "text-orange-300/80"}`}>Dados e cadastros permanecem intactos.</span>
                </p>
                <div className={`text-xs leading-relaxed p-3 rounded-lg border ${isLight ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-orange-900/30 border-orange-700/40 text-orange-300"}`}>
                  Para continuar, digite <strong className="font-black">ZERAR</strong> no campo abaixo:
                </div>
                <Input
                  className={`text-center font-black tracking-[0.5em] uppercase ${T.dialogInput} border-orange-500 focus:border-orange-400`}
                  placeholder="ZERAR"
                  value={zeroQtyConfirmText}
                  onChange={e => setZeroQtyConfirmText(e.target.value.toUpperCase())}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <Button variant="ghost" onClick={() => { setZeroQtyStep("password"); setZeroQtyPassword(""); setZeroQtyConfirmText(""); }} className={T.muted}>
                  Voltar
                </Button>
                <Button
                  disabled={zeroQtyLoading || zeroQtyConfirmText !== "ZERAR"}
                  onClick={async () => {
                    setZeroQtyLoading(true);
                    try {
                      const res = await fetch("/api/products/zero-quantities", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ password: zeroQtyPassword }),
                      });
                      if (!res.ok) {
                        const err = await res.json();
                        toast({ title: "Erro", description: err.message, variant: "destructive" });
                        setZeroQtyStep("password");
                        setZeroQtyPassword("");
                        setZeroQtyConfirmText("");
                      } else {
                        const data = await res.json();
                        qc.invalidateQueries({ queryKey: ["/api/products"] });
                        setZeroQtyOpen(false);
                        setZeroQtyPassword("");
                        setZeroQtyStep("password");
                        setZeroQtyConfirmText("");
                        toast({
                          title: "Quantidades zeradas!",
                          description: `${data.batchesZeroed} lote${data.batchesZeroed !== 1 ? "s" : ""} zerado${data.batchesZeroed !== 1 ? "s" : ""}. Produtos e dados preservados.`,
                        });
                      }
                    } catch {
                      toast({ title: "Erro de conexão", variant: "destructive" });
                    } finally {
                      setZeroQtyLoading(false);
                    }
                  }}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest px-6 rounded-xl gap-2 disabled:opacity-40"
                >
                  {zeroQtyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><BarChart3 className="h-4 w-4" /> Zerar Agora</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Limpar Estoque ── */}
      <Dialog open={clearStockOpen} onOpenChange={(o) => { if (!clearStockLoading) { setClearStockOpen(o); setClearStockStep("password"); setClearStockPassword(""); setClearStockConfirmText(""); } }}>
        <DialogContent className={`max-w-lg border ${T.dialog}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black italic uppercase tracking-tighter text-red-500 text-xl">
              <Trash2 className="h-6 w-6" /> Limpar Todo o Estoque
            </DialogTitle>
            <DialogDescription className={T.muted}>
              {clearStockStep === "password" ? "Autentique-se para prosseguir com esta operação crítica." : "Leia com atenção. Esta ação é permanente."}
            </DialogDescription>
          </DialogHeader>

          {clearStockStep === "password" ? (
            <div className="space-y-4 mt-2">
              {/* Bloco de aviso visível ANTES de confirmar */}
              <div className="rounded-xl border-2 border-red-500 bg-red-950/60 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
                  <p className="text-red-300 font-black uppercase text-[12px] tracking-widest">Atenção — Operação de Alto Risco</p>
                </div>
                <p className="text-red-200 text-sm font-semibold leading-relaxed">
                  Você está prestes a <strong className="text-white">apagar permanentemente todos os {products.length} produto{products.length !== 1 ? "s" : ""}</strong> do estoque, incluindo todos os seus lotes, preços, quantidades e histórico de movimentações.
                </p>
                <ul className="text-red-300 text-xs space-y-1 list-disc list-inside">
                  <li>Todo o catálogo de produtos será apagado</li>
                  <li>Todos os lotes e quantidades em estoque somem</li>
                  <li>O histórico de entradas e saídas será removido</li>
                  <li>O caixa não encontrará nenhum produto para venda</li>
                </ul>
                <p className="text-red-400 text-[11px] font-black uppercase tracking-widest border-t border-red-500/30 pt-2">
                  Um snapshot será salvo automaticamente para restauração emergencial.
                </p>
              </div>
              <div>
                <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Senha do Administrador</Label>
                <Input
                  type="password"
                  className={`mt-1 ${T.dialogInput}`}
                  value={clearStockPassword}
                  onChange={e => setClearStockPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter" && clearStockPassword) setClearStockStep("confirm"); }}
                />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <Button variant="ghost" onClick={() => setClearStockOpen(false)} className={T.muted}>Cancelar</Button>
                <Button
                  disabled={!clearStockPassword}
                  onClick={() => setClearStockStep("confirm")}
                  className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest px-6 rounded-xl"
                >
                  Prosseguir
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              {/* Aviso final reforçado */}
              <div className="rounded-xl border-2 border-red-600 bg-red-950/80 p-5 space-y-3">
                <p className="text-red-300 font-black uppercase text-[13px] tracking-widest text-center">🚨 Última chance — confirme a exclusão</p>
                <p className="text-white text-sm font-bold leading-relaxed text-center">
                  Isso vai apagar <span className="text-red-400">{products.length} produto{products.length !== 1 ? "s" : ""}</span> e todos os seus dados do estoque.<br/>
                  <span className="text-red-300">Não é possível desfazer esta ação diretamente.</span>
                </p>
                <div className={`text-xs leading-relaxed p-3 rounded-lg border ${isLight ? "bg-red-50 border-red-200 text-red-700" : "bg-red-900/30 border-red-700/40 text-red-300"}`}>
                  Para continuar, digite <strong className="font-black">LIMPAR</strong> no campo abaixo:
                </div>
                <Input
                  className={`text-center font-black tracking-[0.5em] uppercase ${T.dialogInput} border-red-500 focus:border-red-400`}
                  placeholder="LIMPAR"
                  value={clearStockConfirmText}
                  onChange={e => setClearStockConfirmText(e.target.value.toUpperCase())}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <Button variant="ghost" onClick={() => { setClearStockStep("password"); setClearStockPassword(""); setClearStockConfirmText(""); }} className={T.muted}>
                  Voltar
                </Button>
                <Button
                  disabled={clearStockLoading || clearStockConfirmText !== "LIMPAR"}
                  onClick={async () => {
                    setClearStockLoading(true);
                    try {
                      const res = await fetch("/api/products", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ password: clearStockPassword }),
                      });
                      if (!res.ok) {
                        const err = await res.json();
                        toast({ title: "Erro", description: err.message, variant: "destructive" });
                        setClearStockStep("password");
                        setClearStockPassword("");
                        setClearStockConfirmText("");
                      } else {
                        qc.invalidateQueries({ queryKey: ["/api/products"] });
                        qc.invalidateQueries({ queryKey: ["/api/products/snapshot"] });
                        setClearStockOpen(false);
                        setClearStockPassword("");
                        setClearStockStep("password");
                        setClearStockConfirmText("");
                        toast({ title: "Estoque limpo.", description: "Use o botão Restaurar se precisar reverter." });
                      }
                    } catch {
                      toast({ title: "Erro de conexão", variant: "destructive" });
                    } finally {
                      setClearStockLoading(false);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest px-6 rounded-xl gap-2 disabled:opacity-40"
                >
                  {clearStockLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4" /> Apagar Tudo</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Restaurar Estoque ── */}
      <Dialog open={restoreOpen} onOpenChange={(o) => { if (!restoreLoading) { setRestoreOpen(o); setRestoreStep("password"); setRestorePassword(""); } }}>
        <DialogContent className={`max-w-md border ${T.dialog}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black italic uppercase tracking-tighter text-amber-400 text-xl">
              <CheckCircle2 className="h-6 w-6" /> Restaurar Estoque
            </DialogTitle>
            <DialogDescription className={T.muted}>
              Restaura o último snapshot salvo antes da limpeza.
            </DialogDescription>
          </DialogHeader>

          {latestSnapshot && (
            <div className={`rounded-xl border p-3 text-xs space-y-1 ${isLight ? "bg-amber-50 border-amber-200" : "bg-amber-900/20 border-amber-700/30"}`}>
              <p className="text-amber-500 font-black uppercase text-[10px] tracking-widest">Snapshot disponível</p>
              <p className={T.cellPrimary}><strong>{latestSnapshot.productCount} produtos</strong> salvos em {new Date(latestSnapshot.createdAt).toLocaleString("pt-BR")}</p>
              <p className={T.muted}>Criado por: {latestSnapshot.createdBy}</p>
            </div>
          )}

          {restoreStep === "password" ? (
            <div className="space-y-4 mt-1">
              <div className={`rounded-xl border p-3 text-xs ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                <p className={`${T.cellPrimary} font-semibold`}>O estoque atual será substituído pelos dados do snapshot. Produtos adicionados após a limpeza serão perdidos.</p>
              </div>
              <div>
                <Label className={`text-[10px] font-black uppercase tracking-widest ${T.dialogLabel}`}>Senha do Administrador</Label>
                <Input
                  type="password"
                  className={`mt-1 ${T.dialogInput}`}
                  value={restorePassword}
                  onChange={e => setRestorePassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter" && restorePassword) setRestoreStep("confirm"); }}
                />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <Button variant="ghost" onClick={() => setRestoreOpen(false)} className={T.muted}>Cancelar</Button>
                <Button
                  disabled={!restorePassword}
                  onClick={() => setRestoreStep("confirm")}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest px-6 rounded-xl"
                >
                  Prosseguir
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-1">
              <div className={`rounded-xl border-2 border-amber-500 p-4 text-sm font-semibold text-center ${isLight ? "bg-amber-50" : "bg-amber-900/30"}`}>
                <p className={T.cellPrimary}>Confirma a restauração de <strong className="text-amber-500">{latestSnapshot?.productCount} produtos</strong> para o estoque?</p>
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <Button variant="ghost" onClick={() => { setRestoreStep("password"); setRestorePassword(""); }} className={T.muted}>Voltar</Button>
                <Button
                  disabled={restoreLoading}
                  onClick={async () => {
                    setRestoreLoading(true);
                    try {
                      const res = await fetch("/api/products/restore", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ password: restorePassword }),
                      });
                      if (!res.ok) {
                        const err = await res.json();
                        toast({ title: "Erro", description: err.message, variant: "destructive" });
                        setRestoreStep("password");
                        setRestorePassword("");
                      } else {
                        const data = await res.json();
                        qc.invalidateQueries({ queryKey: ["/api/products"] });
                        setRestoreOpen(false);
                        setRestorePassword("");
                        setRestoreStep("password");
                        toast({ title: `Estoque restaurado!`, description: `${data.productsRestored} produto${data.productsRestored !== 1 ? "s" : ""} recuperado${data.productsRestored !== 1 ? "s" : ""}.` });
                      }
                    } catch {
                      toast({ title: "Erro de conexão", variant: "destructive" });
                    } finally {
                      setRestoreLoading(false);
                    }
                  }}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest px-6 rounded-xl gap-2"
                >
                  {restoreLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4" /> Restaurar Agora</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
