import { useQuery, useMutation } from "@tanstack/react-query";
import { Sale, CashRegister, SaleItem, Payment } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar as CalendarIcon, XCircle, ArrowLeft, ShieldAlert, History, Landmark, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";


function AuditTimeline({ dateRange }: { dateRange: { start: string; end: string } }) {
  const [module,setModule]=useState(""); const [status,setStatus]=useState(""); const [action,setAction]=useState(""); const [q,setQ]=useState(""); const [hourStart,setHourStart]=useState(""); const [hourEnd,setHourEnd]=useState("");
  const p=new URLSearchParams({start:dateRange.start,end:dateRange.end,limit:"500"}); if(module)p.set("module",module); if(status)p.set("status",status); if(action)p.set("action",action); if(q)p.set("q",q); if(hourStart)p.set("hourStart",hourStart); if(hourEnd)p.set("hourEnd",hourEnd);
  const {data=[],isLoading}=useQuery<any[]>({queryKey:["/api/audit/events",p.toString()],queryFn:async()=>{const r=await fetch("/api/audit/events?"+p.toString());if(!r.ok)throw new Error("Falha");return r.json();},refetchInterval:15000});
  return <div className="space-y-5">
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      <select value={module} onChange={e=>setModule(e.target.value)} className="bg-black border border-white/10 rounded-lg h-10 px-3 text-xs font-bold text-white"><option value="">Todos os setores</option><option value="caixa">Caixa</option><option value="estoque">Estoque</option><option value="financeiro">Financeiro</option><option value="fiscal">Fiscal</option><option value="administracao">Administração</option></select>
      <select value={action} onChange={e=>setAction(e.target.value)} className="bg-black border border-white/10 rounded-lg h-10 px-3 text-xs font-bold text-white"><option value="">Todas ações</option><option value="insert">Criação</option><option value="update">Alteração</option><option value="delete">Exclusão</option></select>
      <select value={status} onChange={e=>setStatus(e.target.value)} className="bg-black border border-white/10 rounded-lg h-10 px-3 text-xs font-bold text-white"><option value="">Todos status</option><option value="active">Ativo</option><option value="deleted">Deletado</option></select>
      <input type="time" value={hourStart} onChange={e=>setHourStart(e.target.value)} className="bg-black border border-white/10 rounded-lg h-10 px-3 text-xs font-bold text-white [color-scheme:dark]"/>
      <input type="time" value={hourEnd} onChange={e=>setHourEnd(e.target.value)} className="bg-black border border-white/10 rounded-lg h-10 px-3 text-xs font-bold text-white [color-scheme:dark]"/>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Produto, protocolo, ID..." className="bg-black border border-white/10 rounded-lg h-10 px-3 text-xs font-bold text-white"/>
    </div>
    {isLoading?<div className="py-10 text-center text-primary font-black uppercase text-xs">Carregando auditoria...</div>:data.length===0?<div className="py-10 text-center text-zinc-600 font-black uppercase text-xs">Nenhum evento encontrado</div>:<div className="space-y-2 max-h-[650px] overflow-y-auto pr-2">{data.map((e:any)=><div key={e.id} className="rounded-xl border border-white/5 bg-black/30 p-4"><div className="flex gap-4"><div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0"><History className="w-4 h-4 text-primary"/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-white font-black text-xs">{new Date(e.occurredAt).toLocaleDateString("pt-BR")}</span><span className="text-primary font-black text-xs">{new Date(e.occurredAt).toLocaleTimeString("pt-BR",{hour12:false})}</span><Badge className="bg-white/10 text-white border-white/10 text-[8px] uppercase">{e.module}</Badge><Badge className={e.status==="deleted"?"bg-red-500/15 text-red-300":"bg-emerald-500/10 text-emerald-300"}>{e.status==="deleted"?"DELETADO":e.action==="insert"?"CRIADO":e.action==="update"?"ALTERADO":"REGISTRADO"}</Badge></div><p className="text-zinc-300 font-bold text-xs mt-2">{e.entityType} #{e.entityId||"—"}</p><p className="text-zinc-500 text-[10px] mt-1">{e.actorUserId?"Usuário #"+e.actorUserId:"Registro automático do sistema"}{e.details?" · "+String(e.details).slice(0,220):""}</p></div></div></div>)}</div>}
  </div>
}

export default function Reports() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const businessToday = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: businessToday, end: businessToday });

  const [saleToCancel, setSaleToCancel] = useState<number | null>(null);
  const isAuthorizedToCancel = user?.role === "owner" || user?.role === "admin" || user?.masterAccessAuthorized === true;
  const [expandedRegister, setExpandedRegister] = useState<number | null>(null);

  const { data: sales, isLoading: isLoadingSales } = useQuery<Sale[]>({
    queryKey: ["/api/sales", dateRange.start, dateRange.end],
    queryFn: async () => {
      const start = dateRange.start ? `${dateRange.start}T00:00:00.000-03:00` : "";
      const end = dateRange.end ? `${dateRange.end}T23:59:59.999-03:00` : "";
      const res = await fetch(`/api/sales?start=${start}&end=${end}`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: registers, isLoading: isLoadingRegisters } = useQuery<(CashRegister & { sales?: (Sale & { items: SaleItem[], payments: Payment[] })[] })[]>({
    queryKey: ["/api/cash-registers/history", dateRange.start, dateRange.end],
    queryFn: async () => {
      const res = await fetch(`/api/cash-registers/history?start=${dateRange.start}&end=${dateRange.end}`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/sales/${id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-registers/history"] });
      toast({ title: "Venda cancelada com sucesso" });
      setSaleToCancel(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao cancelar venda", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleCancelClick = () => {
    if (!saleToCancel) return;

    if (!isAuthorizedToCancel) {
      toast({
        title: "Acesso negado",
        description: "Somente a conta proprietária ou administradora pode cancelar vendas.",
        variant: "destructive"
      });
      return;
    }

    cancelMutation.mutate(saleToCancel);
  };

  const totalCompleted = sales?.filter(s => s.status === "completed").reduce((sum, s) => sum + s.totalAmount, 0) || 0;

  return (
    <div className="h-full bg-black p-4 md:p-8 pt-24 md:pt-28 space-y-8 max-w-[1600px] mx-auto overflow-y-auto custom-scrollbar">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-zinc-900/50 p-6 rounded-2xl border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:text-primary hover:bg-white/5 w-12 h-12 rounded-full"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="w-7 h-7" />
          </Button>
          <div>
            <h1 className="text-white text-3xl md:text-4xl font-black italic uppercase tracking-tighter leading-none">Relatórios <span className="text-primary">&</span> Contabilidade</h1>
            <p className="text-white/40 uppercase text-[10px] font-bold tracking-[0.3em] mt-2">Gestão financeira e histórico detalhado</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5 shadow-inner">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-transparent text-white text-sm font-bold border-0 focus:ring-0 w-32"
            />
            <span className="text-white/20 font-black uppercase text-[10px]">até</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-transparent text-white text-sm font-bold border-0 focus:ring-0 w-32"
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-zinc-900 border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Landmark className="w-12 h-12 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-white/40 text-[10px] font-black uppercase tracking-widest">Total Líquido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-primary text-4xl font-black italic tracking-tighter">
              R$ {(totalCompleted / 100).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-zinc-900 border-white/10 shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/5 p-6">
            <CardTitle className="text-white uppercase italic tracking-tighter text-xl font-black flex items-center gap-3">
              <History className="w-6 h-6 text-primary" /> Histórico de Caixas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingRegisters ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {registers?.map((reg) => (
                  <div key={reg.id} className="group transition-colors hover:bg-white/[0.02]">
                    <div 
                      className="p-6 cursor-pointer flex items-center justify-between"
                      onClick={() => setExpandedRegister(expandedRegister === reg.id ? null : reg.id)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <Badge className={`${reg.status === 'open' ? 'bg-green-500' : 'bg-zinc-700'} text-black font-black uppercase italic text-[9px]`}>
                            {reg.status === 'open' ? 'Aberto' : 'Fechado'}
                          </Badge>
                          <span className="text-white font-black uppercase italic text-sm tracking-tight">
                            {format(new Date(reg.openedAt!), "dd/MM/yyyy HH:mm")}
                          </span>
                        </div>
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Operador ID: {reg.userId}</p>
                      </div>
                      
                      <div className="text-right flex items-center gap-6">
                        <div className="space-y-1">
                          <p className="text-white font-black italic text-lg leading-none">R$ {((reg.closingAmount || 0) / 100).toFixed(2)}</p>
                          <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Fechamento</p>
                        </div>
                        {expandedRegister === reg.id ? <ChevronUp className="w-5 h-5 text-primary" /> : <ChevronDown className="w-5 h-5 text-zinc-500" />}
                      </div>
                    </div>

                    {expandedRegister === reg.id && (
                      <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                        <div className="bg-black/40 rounded-xl border border-white/5 overflow-hidden">
                          <Table>
                            <TableHeader className="bg-white/5 border-white/10">
                              <TableRow>
                                <TableHead className="text-[10px] font-black uppercase text-zinc-500">Hora</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-zinc-500">Itens</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-zinc-500 text-right">Valor</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reg.sales?.map((sale) => (
                                <TableRow key={sale.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                  <TableCell className="text-white/60 font-medium text-xs">
                                    {format(new Date(sale.createdAt), "HH:mm")}
                                  </TableCell>
                                  <TableCell className="text-white font-bold text-[10px] uppercase max-w-[200px] truncate">
                                    {sale.items.map(i => `${i.quantity}x ${i.itemType}`).join(", ")}
                                  </TableCell>
                                  <TableCell className="text-right text-primary font-black italic">
                                    R$ {(sale.totalAmount / 100).toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {(!reg.sales || reg.sales.length === 0) && (
                                <TableRow>
                                  <TableCell colSpan={3} className="text-center py-4 text-white/20 font-bold uppercase text-[10px]">Nenhuma venda registrada</TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                          
                          <div className="p-4 bg-white/5 border-t border-white/10 grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <p className="text-[9px] font-black uppercase text-zinc-500">Abertura</p>
                              <p className="text-white font-bold text-xs">R$ {(reg.openingAmount! / 100).toFixed(2)}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[9px] font-black uppercase text-zinc-500">Vendas (Total)</p>
                              <p className="text-primary font-bold text-xs">R$ {((reg.sales?.reduce((s,v) => s + v.totalAmount, 0) || 0) / 100).toFixed(2)}</p>
                            </div>
                            <div className="space-y-1 text-right">
                              <p className="text-[9px] font-black uppercase text-zinc-500">Diferença</p>
                              <p className={`font-bold text-xs ${reg.difference && reg.difference < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                R$ {((reg.difference || 0) / 100).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10 shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/5 p-6">
            <CardTitle className="text-white uppercase italic tracking-tighter text-xl font-black flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary" /> Vendas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingSales ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-white/5 border-white/10">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase text-zinc-500">Data/Hora</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-zinc-500">Valor</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-zinc-500">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-zinc-500 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales?.map((sale) => (
                    <TableRow key={sale.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="text-white/60 font-medium text-xs">
                        {format(new Date(sale.createdAt), "dd/MM HH:mm")}
                      </TableCell>
                      <TableCell className="text-white font-black italic text-sm">
                        R$ {(sale.totalAmount / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={sale.status === "completed" ? "default" : (sale.status === "simulation" ? "outline" : "destructive")} 
                          className={`uppercase text-[8px] font-black italic tracking-widest ${sale.status === "simulation" ? "border-blue-500 text-blue-500 bg-blue-500/10" : ""}`}
                        >
                          {sale.status === "completed" ? "Concluída" : (sale.status === "simulation" ? "Simulação" : "Cancelada")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {sale.status === "completed" && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-zinc-500 hover:text-red-500 hover:bg-red-500/10 w-8 h-8 rounded-full transition-all"
                            onClick={() => setSaleToCancel(sale.id)}
                            disabled={cancelMutation.isPending}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={saleToCancel !== null} onOpenChange={(open) => !open && setSaleToCancel(null)}>
        <AlertDialogContent className="bg-zinc-950 border-white/10 text-white rounded-2xl p-8 shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert className="w-10 h-10 text-red-500" />
              <AlertDialogTitle className="text-2xl uppercase italic font-black tracking-tighter leading-none">Confirmar <span className="text-red-500">Cancelamento</span></AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-zinc-400 text-sm">
              Esta ação irá estornar o estoque e registrar o cancelamento no financeiro de maneira definitiva.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {!isAuthorizedToCancel && (
            <p className="py-4 text-sm text-red-400">
              O cancelamento está restrito às contas proprietária e administradora.
            </p>
          )}

          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel 
              onClick={() => {
                setSaleToCancel(null);
                }}
              className="bg-transparent border-white/10 text-white hover:bg-white/5 h-12 px-6 font-bold uppercase italic text-xs tracking-widest rounded-xl"
            >
              Abortar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelClick}
              disabled={cancelMutation.isPending || !isAuthorizedToCancel}
              className="bg-red-600 hover:bg-red-700 text-white border-0 h-12 px-8 font-black uppercase italic text-sm tracking-widest rounded-xl"
            >
              {cancelMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "CONFIRMAR CANCELAMENTO"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
