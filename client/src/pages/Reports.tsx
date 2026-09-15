import { useQuery, useMutation } from "@tanstack/react-query";
import { Sale } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar as CalendarIcon, XCircle, ArrowLeft, ShieldAlert, History, Landmark, FileText, ChevronDown, ChevronUp, Printer, Banknote, CreditCard, QrCode, ArrowDownToLine, ArrowUpFromLine, LockKeyhole, UnlockKeyhole } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

const money = (c: number | null | undefined) => `R$ ${((Number(c || 0)) / 100).toFixed(2).replace(".", ",")}`;
const dateTime = (value: any) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
};

const movementLabel: Record<string, string> = {
  opening: "Abertura",
  replenishment: "Suprimento",
  withdrawal: "Sangria",
  adjustment: "Ajuste",
  closing: "Fechamento",
};

const movementIcon = (type: string) => {
  if (type === "opening") return <UnlockKeyhole className="w-4 h-4" />;
  if (type === "closing") return <LockKeyhole className="w-4 h-4" />;
  if (type === "withdrawal") return <ArrowDownToLine className="w-4 h-4" />;
  if (type === "replenishment") return <ArrowUpFromLine className="w-4 h-4" />;
  return <Landmark className="w-4 h-4" />;
};

function printRegister(register: any) {
  const popup = window.open("", "_blank", "width=1100,height=900");
  if (!popup) return;

  const summary = register.summary || {};
  const movements = (register.movements || []).map((m: any) => `
    <tr><td>${dateTime(m.createdAt)}</td><td>${movementLabel[m.type] || m.type}</td><td>${money(m.amount)}</td><td>${String(m.reason || "—").replace(/</g, "&lt;")}</td></tr>
  `).join("");
  const sales = (register.sales || []).map((sale: any) => {
    const pays = (sale.payments || []).map((p: any) => `${p.method}: ${money(p.amount)}`).join(" | ") || "—";
    const items = (sale.items || []).map((i: any) => `${i.quantity}x item ${i.itemType} #${i.itemId}`).join(" | ") || "—";
    return `<tr><td>${dateTime(sale.createdAt)}</td><td>#${sale.id}</td><td>${sale.status}</td><td>${items}</td><td>${pays}</td><td>${money(sale.totalAmount)}</td></tr>`;
  }).join("");

  popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Caixa #${register.id}</title><style>
body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{margin:0 0 4px}h2{margin-top:28px;border-bottom:1px solid #ccc;padding-bottom:6px}small{color:#555}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.card{border:1px solid #ccc;border-radius:8px;padding:10px}.muted{color:#666}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #ddd;padding:7px;font-size:11px;text-align:left;vertical-align:top}th{background:#f5f5f5} .right{text-align:right}@media print{button{display:none}}
</style></head><body>
<h1>Relatório Completo do Caixa #${register.id}</h1>
<small>Operador: ${String(register.operator?.username || register.userId || "N/I")} | Status: ${String(register.status || "N/I")}</small>
<div class="grid" style="margin-top:20px">
<div class="card"><b>Abertura</b><br>${dateTime(register.openedAt)}<br>${money(summary.openingAmount)}</div>
<div class="card"><b>Fechamento</b><br>${dateTime(register.closedAt)}<br>${register.closingAmount == null ? "—" : money(register.closingAmount)}</div>
<div class="card"><b>Esperado</b><br>${money(summary.expectedAmount)}</div>
<div class="card"><b>Diferença</b><br>${summary.difference == null ? "—" : money(summary.difference)}</div>
</div>
<h2>Resumo financeiro do dia</h2>
<table><tr><th>Abertura</th><th>Dinheiro</th><th>Cartão</th><th>PIX</th><th>Suprimentos</th><th>Sangrias</th><th>Ajustes</th><th>Esperado</th></tr>
<tr><td>${money(summary.openingAmount)}</td><td>${money(summary.cashSales)}</td><td>${money(summary.cardSales)}</td><td>${money(summary.pixSales)}</td><td>${money(summary.replenishments)}</td><td>${money(summary.withdrawals)}</td><td>${money(summary.adjustments)}</td><td>${money(summary.expectedAmount)}</td></tr></table>
<h2>Movimentações completas</h2><table><tr><th>Data/Hora</th><th>Tipo</th><th>Valor</th><th>Observação / motivo</th></tr>${movements || "<tr><td colspan='4'>Nenhuma movimentação.</td></tr>"}</table>
<h2>Vendas do caixa</h2><table><tr><th>Data/Hora</th><th>Venda</th><th>Status</th><th>Itens</th><th>Pagamentos</th><th>Total</th></tr>${sales || "<tr><td colspan='6'>Nenhuma venda.</td></tr>"}</table>
<h2>Quantitativos</h2><p>Vendas concluídas: <b>${summary.completedSales || 0}</b> | Canceladas: <b>${summary.cancelledSales || 0}</b> | Simulações: <b>${summary.simulations || 0}</b></p>
</body></html>`);
  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 150);
}

type RegisterReport = any & {
  operator?: { id: number; username: string; role: string } | null;
  movements: any[];
  sales: (Sale & { items: any[]; payments: any[] })[];
  summary: any;
};

export default function Reports() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState({ start: format(new Date(), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") });
  const [saleToCancel, setSaleToCancel] = useState<number | null>(null);
  const [masterPassword, setMasterPassword] = useState("");
  const [expandedRegister, setExpandedRegister] = useState<number | null>(null);

  const { data: sales, isLoading: isLoadingSales } = useQuery<Sale[]>({
    queryKey: ["/api/sales", dateRange.start, dateRange.end],
    queryFn: async () => {
      const start = `${dateRange.start}T00:00:00.000Z`;
      const end = `${dateRange.end}T23:59:59.999Z`;
      const res = await fetch(`/api/sales?start=${start}&end=${end}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: registers, isLoading: isLoadingRegisters } = useQuery<RegisterReport[]>({
    queryKey: ["/api/cash-control/reports/history", dateRange.start, dateRange.end],
    queryFn: async () => {
      const res = await fetch(`/api/cash-control/reports/history?start=${dateRange.start}&end=${dateRange.end}`);
      if (!res.ok) throw new Error("Não foi possível carregar o histórico completo dos caixas.");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => (await apiRequest("POST", `/api/sales/${id}/cancel`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-control/reports/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-registers/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-control/status"] });
      toast({ title: "Venda cancelada com sucesso" });
      setSaleToCancel(null);
      setMasterPassword("");
    },
    onError: (error: Error) => toast({ title: "Erro ao cancelar venda", description: error.message, variant: "destructive" }),
  });

  const handleCancelClick = () => {
    if (!saleToCancel) return;
    if (user?.username !== "SkelleTu" && masterPassword !== "Victor.!.1999") {
      toast({ title: "Acesso Negado", description: "Senha da conta master incorreta.", variant: "destructive" });
      return;
    }
    cancelMutation.mutate(saleToCancel);
  };

  const totalCompleted = sales?.filter((s) => s.status === "completed").reduce((sum, s) => sum + s.totalAmount, 0) || 0;

  return (
    <div className="h-full bg-black p-4 md:p-8 pt-24 md:pt-28 space-y-8 max-w-[1800px] mx-auto overflow-y-auto custom-scrollbar">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-zinc-900/50 p-6 rounded-2xl border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="text-white hover:text-primary hover:bg-white/5 w-12 h-12 rounded-full" onClick={() => setLocation("/")}><ArrowLeft className="w-7 h-7" /></Button>
          <div><h1 className="text-white text-3xl md:text-4xl font-black italic uppercase tracking-tighter leading-none">Relatórios <span className="text-primary">&</span> Contabilidade</h1><p className="text-white/40 uppercase text-[10px] font-bold tracking-[0.3em] mt-2">Gestão financeira, auditoria e histórico completo de caixas</p></div>
        </div>
        <div className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5 shadow-inner"><CalendarIcon className="w-5 h-5 text-primary" /><input type="date" value={dateRange.start} onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))} className="bg-transparent text-white text-sm font-bold border-0 focus:ring-0" /><span className="text-white/20 font-black uppercase text-[10px]">até</span><input type="date" value={dateRange.end} onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))} className="bg-transparent text-white text-sm font-bold border-0 focus:ring-0" /></div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-zinc-900 border-white/10 shadow-2xl"><CardHeader className="pb-2"><CardTitle className="text-white/40 text-[10px] font-black uppercase tracking-widest">Vendas Concluídas</CardTitle></CardHeader><CardContent><div className="text-primary text-4xl font-black italic tracking-tighter">{money(totalCompleted)}</div></CardContent></Card>
        <Card className="bg-zinc-900 border-white/10 shadow-2xl"><CardHeader className="pb-2"><CardTitle className="text-white/40 text-[10px] font-black uppercase tracking-widest">Caixas no período</CardTitle></CardHeader><CardContent><div className="text-white text-4xl font-black italic tracking-tighter">{registers?.length || 0}</div></CardContent></Card>
        <Card className="bg-zinc-900 border-white/10 shadow-2xl"><CardHeader className="pb-2"><CardTitle className="text-white/40 text-[10px] font-black uppercase tracking-widest">Último fechamento</CardTitle></CardHeader><CardContent><div className="text-white text-xl font-black italic">{registers?.[0]?.closedAt ? dateTime(registers[0].closedAt) : "—"}</div></CardContent></Card>
      </div>

      <Card className="bg-zinc-900 border-white/10 shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/5 p-6"><CardTitle className="text-white uppercase italic tracking-tighter text-xl font-black flex items-center gap-3"><History className="w-6 h-6 text-primary" /> Histórico Completo de Caixas</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoadingRegisters ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div> : (
            <div className="divide-y divide-white/5">
              {(!registers || registers.length === 0) && <div className="py-12 text-center text-white/30 font-bold uppercase text-xs">Nenhum caixa no período selecionado.</div>}
              {registers?.map((reg) => {
                const isExpanded = expandedRegister === reg.id;
                return <div key={reg.id} className="transition-colors hover:bg-white/[0.02]">
                  <div className="p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-5 cursor-pointer" onClick={() => setExpandedRegister(isExpanded ? null : reg.id)}>
                    <div className="space-y-2 min-w-0">
                      <div className="flex flex-wrap items-center gap-3"><Badge className={`${reg.status === "open" ? "bg-emerald-400" : reg.status === "closed_pending_review" ? "bg-amber-400" : "bg-zinc-700"} text-black font-black uppercase italic text-[9px]`}>{reg.status === "open" ? "Aberto" : reg.status === "closed_pending_review" ? "Pendente de revisão" : "Fechado"}</Badge><span className="text-white font-black uppercase italic text-sm">Caixa #{reg.id}</span><span className="text-white/50 text-xs font-bold">Operador: {reg.operator?.username || reg.userId}</span></div>
                      <div className="text-white/60 text-xs font-medium">Abertura: <span className="text-white">{dateTime(reg.openedAt)}</span> <span className="mx-2 text-white/20">•</span> Fechamento: <span className="text-white">{dateTime(reg.closedAt)}</span></div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0"><div className="text-right"><div className="text-white font-black italic text-lg">Esperado {money(reg.summary?.expectedAmount)}</div><div className="text-primary font-black text-sm">Físico {reg.closingAmount == null ? "—" : money(reg.closingAmount)}</div></div><Button variant="outline" size="icon" className="border-white/10 text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); printRegister(reg); }}><Printer className="w-4 h-4" /></Button>{isExpanded ? <ChevronUp className="w-5 h-5 text-primary" /> : <ChevronDown className="w-5 h-5 text-zinc-500" />}</div>
                  </div>

                  {isExpanded && <div className="px-6 pb-6 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                      {[["Abertura", reg.summary?.openingAmount, UnlockKeyhole], ["Dinheiro", reg.summary?.cashSales, Banknote], ["Cartão", reg.summary?.cardSales, CreditCard], ["PIX", reg.summary?.pixSales, QrCode], ["Suprimentos", reg.summary?.replenishments, ArrowUpFromLine], ["Sangrias", reg.summary?.withdrawals, ArrowDownToLine], ["Ajustes", reg.summary?.adjustments, Landmark], ["Esperado", reg.summary?.expectedAmount, LockKeyhole]].map(([label, value, Icon]: any) => <div key={String(label)} className="rounded-xl border border-white/5 bg-black/30 p-3"><div className="flex items-center gap-2 text-white/40 text-[9px] uppercase font-black"><Icon className="w-3 h-3" />{label}</div><div className="mt-2 text-white font-black italic text-sm">{money(value)}</div></div>)}
                    </div>

                    <div className="rounded-xl border border-white/5 bg-black/30 overflow-hidden">
                      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between"><span className="text-white font-black uppercase italic text-xs">Abertura / Fechamento</span><span className="text-white/40 text-[10px]">Todas as datas e horas</span></div>
                      <div className="grid md:grid-cols-2 gap-4 p-4"><div className="rounded-lg border border-white/5 p-4"><div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase"><UnlockKeyhole className="w-4 h-4" /> Abertura</div><div className="mt-2 text-white font-black">{dateTime(reg.openedAt)}</div><div className="text-white/50 text-xs mt-1">Valor inicial: {money(reg.summary?.openingAmount)}</div></div><div className="rounded-lg border border-white/5 p-4"><div className="flex items-center gap-2 text-amber-400 text-[10px] font-black uppercase"><LockKeyhole className="w-4 h-4" /> Fechamento</div><div className="mt-2 text-white font-black">{dateTime(reg.closedAt)}</div><div className="text-white/50 text-xs mt-1">Valor físico: {reg.closingAmount == null ? "—" : money(reg.closingAmount)} | Diferença: {reg.difference == null ? "—" : money(reg.difference)}</div></div></div>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-black/30 overflow-hidden"><div className="px-4 py-3 border-b border-white/5 flex items-center justify-between"><span className="text-white font-black uppercase italic text-xs">Movimentações do caixa</span><span className="text-white/40 text-[10px]">Inclui observações</span></div><Table><TableHeader className="bg-white/5"><TableRow><TableHead className="text-[10px] font-black uppercase">Data/Hora</TableHead><TableHead className="text-[10px] font-black uppercase">Tipo</TableHead><TableHead className="text-[10px] font-black uppercase text-right">Valor</TableHead><TableHead className="text-[10px] font-black uppercase">Observação / Motivo</TableHead></TableRow></TableHeader><TableBody>{(reg.movements || []).map((movement: any) => <TableRow key={movement.id} className="border-white/5"><TableCell className="text-white/60 text-xs whitespace-nowrap">{dateTime(movement.createdAt)}</TableCell><TableCell className="text-white font-black text-xs"><div className="flex items-center gap-2">{movementIcon(movement.type)}{movementLabel[movement.type] || movement.type}</div></TableCell><TableCell className="text-right text-primary font-black italic">{money(movement.amount)}</TableCell><TableCell className="text-white/70 text-xs">{movement.reason || "—"}</TableCell></TableRow>)}{(!reg.movements || reg.movements.length === 0) && <TableRow><TableCell colSpan={4} className="text-center py-6 text-white/20 text-xs uppercase font-bold">Nenhuma movimentação registrada.</TableCell></TableRow>}</TableBody></Table></div>

                    <div className="rounded-xl border border-white/5 bg-black/30 overflow-hidden"><div className="px-4 py-3 border-b border-white/5"><span className="text-white font-black uppercase italic text-xs">Vendas vinculadas ao caixa</span></div><Table><TableHeader className="bg-white/5"><TableRow><TableHead className="text-[10px] font-black uppercase">Data/Hora</TableHead><TableHead className="text-[10px] font-black uppercase">Venda</TableHead><TableHead className="text-[10px] font-black uppercase">Itens</TableHead><TableHead className="text-[10px] font-black uppercase">Pagamentos</TableHead><TableHead className="text-[10px] font-black uppercase">Status</TableHead><TableHead className="text-[10px] font-black uppercase text-right">Total</TableHead></TableRow></TableHeader><TableBody>{(reg.sales || []).map((sale: any) => <TableRow key={sale.id} className="border-white/5"><TableCell className="text-white/60 text-xs whitespace-nowrap">{dateTime(sale.createdAt)}</TableCell><TableCell className="text-white font-black text-xs">#{sale.id}</TableCell><TableCell className="text-white/70 text-xs max-w-[280px]">{(sale.items || []).map((item: any) => `${item.quantity}x ${item.itemType}#${item.itemId}`).join(", ") || "—"}</TableCell><TableCell className="text-white/70 text-xs">{(sale.payments || []).map((payment: any) => `${payment.method}: ${money(payment.amount)}`).join(" | ") || "—"}</TableCell><TableCell><Badge variant={sale.status === "completed" ? "default" : sale.status === "simulation" ? "outline" : "destructive"} className="uppercase text-[8px] font-black">{sale.status === "completed" ? "Concluída" : sale.status === "simulation" ? "Simulação" : "Cancelada"}</Badge></TableCell><TableCell className="text-right text-primary font-black italic">{money(sale.totalAmount)}</TableCell></TableRow>)}{(!reg.sales || reg.sales.length === 0) && <TableRow><TableCell colSpan={6} className="text-center py-6 text-white/20 text-xs uppercase font-bold">Nenhuma venda vinculada.</TableCell></TableRow>}</TableBody></Table></div>

                    <div className="flex justify-end"><Button onClick={() => printRegister(reg)} className="bg-white text-black hover:bg-primary hover:text-white font-black uppercase italic"><Printer className="w-4 h-4 mr-2" /> Imprimir relatório completo</Button></div>
                  </div>}
                </div>;
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-white/10 shadow-2xl rounded-2xl overflow-hidden"><CardHeader className="border-b border-white/5 bg-white/5 p-6"><CardTitle className="text-white uppercase italic tracking-tighter text-xl font-black flex items-center gap-3"><FileText className="w-6 h-6 text-primary" /> Vendas Recentes</CardTitle></CardHeader><CardContent className="p-0">{isLoadingSales ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div> : <Table><TableHeader className="bg-white/5"><TableRow><TableHead className="text-[10px] font-black uppercase">Data/Hora</TableHead><TableHead className="text-[10px] font-black uppercase">Valor</TableHead><TableHead className="text-[10px] font-black uppercase">Status</TableHead><TableHead className="text-[10px] font-black uppercase text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{sales?.map((sale) => <TableRow key={sale.id} className="border-white/5"><TableCell className="text-white/60 text-xs">{dateTime(sale.createdAt)}</TableCell><TableCell className="text-white font-black italic text-sm">{money(sale.totalAmount)}</TableCell><TableCell><Badge variant={sale.status === "completed" ? "default" : sale.status === "simulation" ? "outline" : "destructive"} className="uppercase text-[8px] font-black">{sale.status === "completed" ? "Concluída" : sale.status === "simulation" ? "Simulação" : "Cancelada"}</Badge></TableCell><TableCell className="text-right">{sale.status === "completed" && <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-red-500" onClick={() => setSaleToCancel(sale.id)} disabled={cancelMutation.isPending}><XCircle className="w-4 h-4" /></Button>}</TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>

      <AlertDialog open={saleToCancel !== null} onOpenChange={(open) => !open && setSaleToCancel(null)}><AlertDialogContent className="bg-zinc-950 border-white/10 text-white rounded-2xl p-8 shadow-2xl"><AlertDialogHeader><div className="flex items-center gap-3 mb-4"><ShieldAlert className="w-10 h-10 text-red-500" /><AlertDialogTitle className="text-2xl uppercase italic font-black tracking-tighter leading-none">Confirmar <span className="text-red-500">Cancelamento</span></AlertDialogTitle></div><AlertDialogDescription className="text-zinc-400 text-sm">Esta ação irá estornar o estoque e registrar o cancelamento no financeiro.</AlertDialogDescription></AlertDialogHeader>{user?.username !== "SkelleTu" && <div className="py-6 space-y-3"><label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] pl-1">Senha da Conta Master</label><Input type="password" placeholder="AUTORIZAÇÃO MESTRE" value={masterPassword} onChange={(e) => setMasterPassword(e.target.value)} className="bg-black border-white/10 text-white h-14 text-xl font-black italic focus:border-red-500/50 transition-all rounded-xl" /></div>}<AlertDialogFooter className="gap-3"><AlertDialogCancel onClick={() => { setSaleToCancel(null); setMasterPassword(""); }} className="bg-transparent border-white/10 text-white hover:bg-white/5 h-12 px-6 font-bold uppercase italic text-xs tracking-widest rounded-xl">Abortar</AlertDialogCancel><AlertDialogAction onClick={handleCancelClick} disabled={cancelMutation.isPending || (user?.username !== "SkelleTu" && !masterPassword)} className="bg-red-600 hover:bg-red-700 text-white border-0 h-12 px-8 font-black uppercase italic text-sm tracking-widest rounded-xl">{cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "CONFIRMAR CANCELAMENTO"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
