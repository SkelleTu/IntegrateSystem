import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  BrainCircuit, Radar, Package, Palette, Megaphone, Users, Target, UserPlus, MessagesSquare, Activity, Trash2,
  ChartNoAxesCombined, Bot, Plug, Plus, Search, RefreshCw, ArrowUpRight,
  Clock3, CheckCircle2, AlertCircle, Sparkles, Layers3, CalendarDays,
  MessageSquareText, Handshake, Wallet, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type MarketingRecord = {
  id: number;
  type: string;
  title: string;
  status: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
type Overview = { totals: Record<string, number>; recent: MarketingRecord[] };
const sections = [
  { id: "overview", label: "Visão geral", icon: ChartNoAxesCombined },
  { id: "opportunity", label: "Oportunidades", icon: Radar },
  { id: "product", label: "Produtos", icon: Package },
  { id: "brand", label: "Marcas", icon: Palette },
  { id: "campaign", label: "Campanhas", icon: Megaphone },
  { id: "social", label: "Redes sociais", icon: Activity },
  { id: "growth", label: "Growth / Follow", icon: UserPlus },
  { id: "community", label: "Comunidade", icon: MessagesSquare },
  { id: "content", label: "Conteúdo", icon: MessageSquareText },
  { id: "audience", label: "Audiência", icon: Users },
  { id: "lead", label: "Leads e vendas", icon: Handshake },
  { id: "finance", label: "Financeiro", icon: Wallet },
  { id: "analytics", label: "Desempenho", icon: ChartNoAxesCombined },
  { id: "agent", label: "Agentes IA", icon: Bot },
  { id: "automation", label: "Automações", icon: Layers3 },
  { id: "integration", label: "Integrações", icon: Plug },
] as const;
const statusLabels: Record<string, string> = {
  draft: "Rascunho", planned: "Planejado", active: "Ativo",
  paused: "Pausado", completed: "Concluído", archived: "Arquivado",
};
const statusColors: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  completed: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  paused: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  archived: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};
const integrationList = [
  { name: "Kernel", detail: "Pesquisa web e navegação automatizada autorizada", icon: Radar },
  { name: "Supermetrics", detail: "Dados de redes sociais, audiência e campanhas", icon: ChartNoAxesCombined },
  { name: "n8n", detail: "Orquestração, filas e rotinas programadas", icon: Layers3 },
  { name: "Supabase", detail: "Dados, autenticação e memória operacional", icon: Wallet },
  { name: "Canva", detail: "Identidade visual e materiais criativos", icon: Palette },
  { name: "Metricool", detail: "Calendário, métricas e desempenho social", icon: CalendarDays },
  { name: "Postiz", detail: "Planejamento e publicação multicanal", icon: Megaphone },
];
const agentCatalog = [
  ["Market Research", "Pesquisa nichos, demanda e tendências."],
  ["Trend Hunter", "Monitora sinais e tendências emergentes."],
  ["Competitor Analyst", "Compara posicionamento, ofertas e concorrentes."],
  ["Opportunity Scorer", "Pontua oportunidades por demanda, margem e risco."],
  ["Product Hunter", "Localiza produtos, categorias e fornecedores."],
  ["Profit Analyst", "Estima custos, margens e viabilidade."],
  ["Brand Manager", "Organiza posicionamento, marca e identidade."],
  ["Creative Director", "Coordena peças, roteiros e campanhas."],
  ["Social Media Manager", "Organiza canais, calendário e publicações."],
  ["Audience Researcher", "Segmenta públicos e oportunidades de audiência."],
  ["Community Manager", "Organiza comentários e atendimento."],
  ["Lead Hunter", "Pesquisa e qualifica potenciais clientes."],
  ["Conversion Analyst", "Acompanha conversões e desempenho comercial."],
  ["Financial Analyst", "Consolida receitas, despesas e lucro."],
] as const;

export default function MarketingHub() {
  const [section, setSection] = useState<string>("overview");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("planned");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const overviewQuery = useQuery<Overview>({ queryKey: ["/api/marketing/overview"], staleTime: 15000 });
  const recordsQuery = useQuery<MarketingRecord[]>({
    queryKey: ["/api/marketing/records", section],
    queryFn: async () => {
      const response = await fetch(`/api/marketing/records?type=${encodeURIComponent(section === "overview" ? "" : section)}`, { credentials: "include" });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || "Falha ao carregar registros");
      return response.json();
    },
    enabled: !["overview", "integration"].includes(section),
  });
  const invalidateMarketingQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/overview"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/records"] }),
    ]);
  };
  const updateMutation = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: number; nextStatus: string }) => {
      const response = await apiRequest("PATCH", "/api/marketing/records/" + id, { status: nextStatus });
      return response.json();
    },
    onSuccess: () => invalidateMarketingQueries(),
    onError: (error: Error) => toast({ title: "Falha ao atualizar", description: error.message, variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", "/api/marketing/records/" + id),
    onSuccess: () => invalidateMarketingQueries(),
    onError: (error: Error) => toast({ title: "Falha ao excluir", description: error.message, variant: "destructive" }),
  });
  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/marketing/records", {
        type: section, title: title.trim(), status,
        payload: { description: description.trim() },
      });
      return response.json();
    },
    onSuccess: async () => {
      setCreateOpen(false); setTitle(""); setDescription(""); setStatus("planned");
      await invalidateMarketingQueries();
      toast({ title: "Registro salvo", description: "O item foi salvo na central de marketing." });
    },
    onError: (error: Error) => toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" }),
  });
  const filteredRecords = useMemo(() => (recordsQuery.data || []).filter((record) =>
    !search || record.title.toLowerCase().includes(search.toLowerCase()) ||
    String(record.payload?.description || "").toLowerCase().includes(search.toLowerCase())
  ), [recordsQuery.data, search]);
  const totals = overviewQuery.data?.totals || {};
  const activeSection = sections.find((item) => item.id === section);
  const canCreate = !["overview", "integration", "agent"].includes(section);
  const openCreate = () => { setTitle(""); setDescription(""); setStatus("planned"); setCreateOpen(true); };

  return (
    <div className="min-h-screen bg-[#07090d] text-white px-4 py-6 md:px-7 md:py-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
              <BrainCircuit className="h-4 w-4" /> Aura System / Inteligência de negócios
            </div>
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">Central de Marketing IA</h1>
            <p className="mt-1 max-w-3xl text-sm text-zinc-400">Pesquisa, produtos, marcas, redes sociais, audiência, vendas e agentes especializados em um único núcleo.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => { invalidateMarketingQueries(); }}>
              <RefreshCw className="mr-2 h-4 w-4" /> Atualizar dados
            </Button>
            {canCreate && <Button className="bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold" onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Novo registro</Button>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[
            ["Oportunidades", totals.opportunity || 0, Radar],
            ["Produtos", totals.product || 0, Package],
            ["Marcas", totals.brand || 0, Palette],
            ["Campanhas", totals.campaign || 0, Megaphone],
            ["Conteúdos", totals.content || 0, MessageSquareText],
            ["Leads", totals.lead || 0, Target],
          ].map(([label, value, Icon]: any) => (
            <Card key={label} className="border-white/10 bg-white/[0.035] text-white">
              <CardContent className="flex items-center justify-between gap-2 p-4">
                <div><p className="text-xs text-zinc-400">{label}</p><p className="mt-1 text-2xl font-black tabular-nums">{value}</p></div>
                <Icon className="h-5 w-5 text-cyan-300" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.025] p-2 md:flex-row md:flex-wrap">
          {sections.map((item) => {
            const Icon = item.icon;
            return <Button key={item.id} size="sm" variant={section === item.id ? "default" : "ghost"}
              className={section === item.id ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400" : "justify-start text-zinc-300 hover:bg-white/10 hover:text-white"}
              onClick={() => { setSection(item.id); setSearch(""); }}>
              <Icon className="mr-2 h-4 w-4" />{item.label}
            </Button>;
          })}
        </div>

        {section === "overview" && (
          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <Card className="border-white/10 bg-white/[0.035] text-white">
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5 text-cyan-300" /> Centro de comando</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Pesquisa e oportunidades", "Identificação de nichos, tendências, concorrentes e demanda.", Radar, "opportunity"],
                  ["Produtos e rentabilidade", "Validação, fornecedores, custos, preço e margem.", Package, "product"],
                  ["Marca e campanhas", "Posicionamento, identidade, conteúdo e distribuição.", Palette, "brand"],
                  ["Audiência e relacionamento", "Públicos, comunidade, leads e atendimento.", Users, "audience"],
                  ["Agentes especializados", "Papéis, tarefas, histórico e autonomia operacional.", Bot, "agent"],
                  ["Automações", "Rotinas, filas, gatilhos e execução programada.", Layers3, "automation"],
                ].map(([name, detail, Icon, id]: any) => (
                  <button key={id} onClick={() => setSection(id)} className="group flex gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-cyan-400/40 hover:bg-cyan-400/5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300"><Icon className="h-5 w-5" /></span>
                    <span><span className="block font-bold">{name}</span><span className="mt-1 block text-xs leading-relaxed text-zinc-400">{detail}</span></span>
                    <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-zinc-600 group-hover:text-cyan-300" />
                  </button>
                ))}
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/[0.035] text-white">
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Clock3 className="h-5 w-5 text-cyan-300" /> Atividade recente</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(overviewQuery.data?.recent || []).length === 0 && <p className="text-sm text-zinc-500">Nenhum registro ainda. Comece cadastrando uma oportunidade, produto ou campanha.</p>}
                {(overviewQuery.data?.recent || []).map((record) => <div key={record.id} className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0"><div><p className="text-sm font-semibold">{record.title}</p><p className="mt-1 text-xs text-zinc-500">{sections.find((x) => x.id === record.type)?.label || record.type} · {new Date(record.createdAt).toLocaleString("pt-BR")}</p></div><Badge className={statusColors[record.status] || "border-white/10 bg-white/5 text-zinc-300"}>{statusLabels[record.status] || record.status}</Badge></div>)}
              </CardContent>
            </Card>
          </div>
        )}

        {section === "growth" && <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100"><AlertCircle className="mr-2 inline h-4 w-4" /> Este espaço organiza pesquisa de perfis, critérios de público e fila de follow/unfollow. A execução automática só poderá ser ativada quando existir uma API oficial ou mecanismo permitido para a plataforma; não será usado para contornar limites ou proteções de contas.</div>}
        {section === "community" && <div className="rounded-xl border border-sky-400/20 bg-sky-400/5 p-4 text-sm text-sky-100"><MessageSquareText className="mr-2 inline h-4 w-4" /> Comentários, respostas e mensagens ficam organizados aqui. A automação depende das permissões oficiais e da conexão da conta social.</div>}
        {section === "social" && <div className="rounded-xl border border-sky-400/20 bg-sky-400/5 p-4 text-sm text-sky-100"><Activity className="mr-2 inline h-4 w-4" /> Cadastre os canais e perfis que serão gerenciados. Publicação e coleta de métricas serão habilitadas após autenticação dos conectores.</div>}
        {section === "finance" && <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm text-zinc-300">Registre receitas, despesas, custos de aquisição e margens. Os indicadores consolidados serão calculados a partir dos lançamentos e integrações conectadas.</div>}
        {section === "analytics" && <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm text-zinc-300">Registre hipóteses e análises de desempenho. Dados reais de alcance, engajamento, conversão e vendas dependem dos conectores.</div>}
        {section === "integration" && (
          <div className="space-y-4">
            <Card className="border-white/10 bg-white/[0.035] text-white">
              <CardHeader><CardTitle className="text-lg">Conectores da operação</CardTitle><p className="text-sm text-zinc-400">Os conectores aparecem aqui como pendentes até que as credenciais e permissões sejam configuradas no ambiente de produção.</p></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {integrationList.map((item) => { const Icon = item.icon; return <div key={item.name} className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-4"><span className="rounded-lg bg-white/5 p-2 text-cyan-300"><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{item.name}</p><Badge className="border-amber-400/20 bg-amber-400/10 text-amber-200">Pendente</Badge></div><p className="mt-1 text-xs text-zinc-400">{item.detail}</p></div></div>; })}
              </CardContent>
            </Card>
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100"><AlertCircle className="mr-2 inline h-4 w-4" /> Nenhum token ou senha é solicitado ou armazenado nesta tela. As chaves devem ser adicionadas como variáveis secretas no Render.</div>
          </div>
        )}

        {section === "agent" && (
          <Card className="border-white/10 bg-white/[0.035] text-white">
            <CardHeader><CardTitle className="text-lg">Catálogo de agentes especializados</CardTitle><p className="text-sm text-zinc-400">Papéis e responsabilidades definidos. A execução autônoma depende da conexão dos modelos e dos serviços de orquestração.</p></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {agentCatalog.map(([name, detail]) => <div key={name} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-center gap-2"><Bot className="h-4 w-4 text-cyan-300" /><p className="font-bold">{name}</p><Badge className="ml-auto border-amber-400/20 bg-amber-400/10 text-amber-200">Aguardando IA</Badge></div><p className="mt-2 text-xs text-zinc-400">{detail}</p></div>)}
            </CardContent>
          </Card>
        )}

        {!["overview", "integration", "agent"].includes(section) && (
          <Card className="border-white/10 bg-white/[0.035] text-white">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><CardTitle className="text-lg">{activeSection?.label || "Registros"}</CardTitle><p className="mt-1 text-sm text-zinc-400">Registros vinculados à empresa e à conta autenticada na Aura System.</p></div>
              <div className="flex flex-wrap gap-2"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar registros..." className="w-full border-white/10 bg-black/30 pl-9 text-white sm:w-56" /></div><Button className="bg-cyan-500 font-bold text-slate-950 hover:bg-cyan-400" onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Novo</Button></div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recordsQuery.isLoading && <div className="py-10 text-center text-sm text-zinc-400">Carregando registros...</div>}
              {recordsQuery.isError && <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">{(recordsQuery.error as Error).message}</div>}
              {!recordsQuery.isLoading && !recordsQuery.isError && filteredRecords.length === 0 && <div className="py-12 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5"><Search className="h-5 w-5 text-zinc-400" /></div><p className="font-semibold">Nenhum registro encontrado</p><p className="mt-1 text-sm text-zinc-500">Cadastre o primeiro item desta área para iniciar o histórico.</p></div>}
              {filteredRecords.map((record) => <div key={record.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{record.title}</p><Badge className={statusColors[record.status] || "border-white/10 bg-white/5 text-zinc-300"}>{statusLabels[record.status] || record.status}</Badge></div><p className="mt-1 whitespace-pre-wrap text-sm text-zinc-400">{String(record.payload?.description || "")}</p><p className="mt-2 text-[11px] text-zinc-600">Criado em {new Date(record.createdAt).toLocaleString("pt-BR")}</p></div><div className="flex shrink-0 gap-2"><Button size="sm" variant="outline" disabled={updateMutation.isPending} className="border-white/10 text-zinc-200" onClick={() => updateMutation.mutate({ id: record.id, nextStatus: record.status === "completed" ? "planned" : "completed" })}>{record.status === "completed" ? "Reabrir" : "Concluir"}</Button><Button size="sm" variant="ghost" disabled={deleteMutation.isPending} className="text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={() => { if (window.confirm("Excluir este registro?")) deleteMutation.mutate(record.id); }}><Trash2 className="h-4 w-4" /></Button></div></div>)}
            </CardContent>
          </Card>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Área isolada dos demais módulos da Aura System <span className="text-zinc-700">•</span> dados segregados por empresa <span className="text-zinc-700">•</span> sem execução externa enquanto conectores estiverem pendentes</div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-white/10 bg-[#10141c] text-white sm:max-w-lg">
          <DialogHeader><DialogTitle>Novo registro · {activeSection?.label}</DialogTitle><DialogDescription className="text-zinc-400">Os dados serão salvos no banco da Aura System, vinculados à empresa atual.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label htmlFor="marketing-title">Título</Label><Input id="marketing-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={180} placeholder="Ex.: Oportunidade no nicho de alimentação" className="border-white/10 bg-black/30 text-white" /></div>
            <div className="space-y-2"><Label htmlFor="marketing-description">Descrição e observações</Label><Textarea id="marketing-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={8000} placeholder="Contexto, hipótese, público, custos, próximos passos..." className="border-white/10 bg-black/30 text-white" /></div>
            <div className="space-y-2"><Label>Status</Label><div className="flex flex-wrap gap-2">{["draft", "planned", "active", "paused", "completed"].map((value) => <Button key={value} type="button" size="sm" variant={status === value ? "default" : "outline"} className={status === value ? "bg-cyan-500 text-slate-950" : "border-white/10 text-zinc-300"} onClick={() => setStatus(value)}>{statusLabels[value]}</Button>)}</div></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setCreateOpen(false)} className="text-zinc-300">Cancelar</Button><Button disabled={!title.trim() || createMutation.isPending} onClick={() => createMutation.mutate()} className="bg-cyan-500 font-bold text-slate-950 hover:bg-cyan-400">{createMutation.isPending ? "Salvando..." : "Salvar registro"}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
