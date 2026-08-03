import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, Printer, Barcode, Terminal, Play, Settings2, Loader2,
  ShieldCheck, History, Download, Eye, Wand2, Search, ExternalLink,
  Info, Lock, RefreshCw, Pencil, Building2
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── helpers visuais ──────────────────────────────────────────────────────────

type FieldOrigin = "cadastro" | "cep" | "cnpj" | "sistema";

const ORIGIN_META: Record<FieldOrigin, { label: string; color: string }> = {
  cadastro: { label: "Do cadastro",          color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  cep:      { label: "Via CEP",              color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  cnpj:     { label: "Receita Federal",      color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  sistema:  { label: "Sistema",              color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
};

function AutoField({
  label, value, origin, onUnlock,
}: {
  label: string; value: string | number | undefined;
  origin: FieldOrigin; onUnlock?: () => void;
}) {
  const { label: originLabel, color } = ORIGIN_META[origin];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-white/30 uppercase font-black text-[10px] tracking-widest">{label}</Label>
        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${color} flex items-center gap-1`}>
          <Lock className="w-2.5 h-2.5" /> {originLabel}
        </span>
      </div>
      <div className="relative">
        <Input value={value ?? ""} readOnly
          className="bg-black/20 border-white/5 text-white/40 font-bold h-12 rounded-xl cursor-not-allowed pr-10" />
        {onUnlock && (
          <button type="button" onClick={onUnlock} title="Editar manualmente"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-primary transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function ManualField({
  label, value, onChange, placeholder, help, link, linkLabel, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; help: string; link?: string; linkLabel?: string; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-white/60 uppercase font-black text-[10px] tracking-widest">{label}</Label>
        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border bg-orange-500/10 text-orange-400 border-orange-500/20 flex items-center gap-1">
          <Pencil className="w-2.5 h-2.5" /> Manual
        </span>
      </div>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="bg-black/40 border-white/20 text-white font-bold h-12 rounded-xl focus:border-primary/50 transition-colors" />
      <p className="text-[10px] text-white/30 flex items-start gap-1.5 mt-1 leading-relaxed">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-orange-400/60" />
        <span>
          {help}{link && (<>{" "}<a href={link} target="_blank" rel="noopener noreferrer"
            className="text-primary/70 underline hover:text-primary inline-flex items-center gap-0.5">
            {linkLabel ?? "Acessar"} <ExternalLink className="w-2.5 h-2.5" />
          </a></>)}
        </span>
      </p>
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

const REGIME_LABEL: Record<string, string> = {
  "1": "Simples Nacional",
  "2": "Simples Nacional (Excesso de Sublimite)",
  "3": "Regime Normal (Lucro Presumido / Real)",
};

export default function FiscalConfig() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ["/api/fiscal/settings"],
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: history, isLoading: isLoadingHistory } = useQuery<any[]>({
    queryKey: ["/api/fiscal/history"],
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/fiscal/settings", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/fiscal/settings"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/fiscal/settings"] });
      toast({ title: "Sucesso", description: "Configurações fiscais salvas." });
    },
  });

  const [formData, setFormData]       = useState<any>(null);
  const [cepLoading, setCepLoading]   = useState(false);
  const [cepFilled, setCepFilled]     = useState(false);
  const [cnpjFetched, setCnpjFetched] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [unlocked, setUnlocked]       = useState<Set<string>>(new Set());

  const unlock = (field: string) => setUnlocked(prev => new Set([...prev, field]));
  const set    = (field: string, value: any) => setFormData((prev: any) => ({ ...prev, [field]: value }));

  // Inicializa formData quando settings chegam
  if (settings && !formData) {
    setFormData(settings);
    if (settings.logradouro && settings.codigoIbge) {
      setCepFilled(true);
      setCnpjFetched(true);
    }
  }

  // Sincroniza simulacaoReal (pode mudar pelo Caixa)
  if (settings && formData && settings.simulacaoReal !== formData.simulacaoReal) {
    setFormData((prev: any) => ({ ...prev, simulacaoReal: settings.simulacaoReal }));
  }

  // ── Busca automática pela Receita Federal assim que o CNPJ estiver disponível ──
  useEffect(() => {
    if (!settings?.cnpj) return;
    const cnpjLimpo = settings.cnpj.replace(/\D/g, "");
    if (cnpjLimpo.length !== 14) return;

    const autoFetch = async () => {
      setCnpjLoading(true);
      try {
        const res  = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
        const data = await res.json();

        if (data.message || !data.razao_social) {
          // CNPJ não encontrado na base — provavelmente de teste; sem toast de erro
          return;
        }

        // Formatações
        const cepFmt  = data.cep
          ? data.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2")
          : "";
        const cnpjFmt = data.cnpj
          ? data.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
          : settings.cnpj;
        const logradouro = [data.descricao_tipo_de_logradouro, data.logradouro]
          .filter(Boolean).join(" ");

        // Regime tributário
        let regime = "3";
        if (data.opcao_pelo_mei)      regime = "1";
        else if (data.opcao_pelo_simples) regime = "1";
        else if (Array.isArray(data.regime_tributario) && data.regime_tributario.length > 0) {
          const ultimo = data.regime_tributario[data.regime_tributario.length - 1];
          const forma  = (ultimo.forma_de_tributacao ?? "").toUpperCase();
          if (forma.includes("SIMPLES")) regime = forma.includes("EXCESSO") ? "2" : "1";
        }

        setFormData((prev: any) => ({
          ...(prev ?? settings),
          razaoSocial:      data.razao_social                                   ?? prev?.razaoSocial ?? "",
          nomeFantasia:     data.nome_fantasia || data.razao_social              ?? prev?.nomeFantasia ?? "",
          cnpj:             cnpjFmt,
          cep:              cepFmt,
          logradouro:       logradouro                                           || prev?.logradouro ?? "",
          numero:           data.numero                                          ?? prev?.numero ?? "",
          bairro:           data.bairro                                          ?? prev?.bairro ?? "",
          municipio:        data.municipio                                       ?? prev?.municipio ?? "",
          uf:               data.uf                                              ?? prev?.uf ?? "SP",
          codigoIbge:       data.codigo_municipio_ibge ? String(data.codigo_municipio_ibge) : prev?.codigoIbge ?? "",
          regimeTributario: regime,
        }));
        setCnpjFetched(true);
        setCepFilled(true);
        setUnlocked(new Set()); // reseta overrides manuais — dados vêm da Receita Federal

        toast({
          title: "✅ Dados preenchidos automaticamente",
          description: `${data.razao_social} — informações obtidas direto da Receita Federal.`,
        });
      } catch {
        // falha silenciosa — sem conexão ou CNPJ não encontrado
      } finally {
        setCnpjLoading(false);
      }
    };

    autoFetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.cnpj]);

  // ── Busca por CEP (manual, para campos não cobertos pelo CNPJ) ──
  const buscarCep = async () => {
    const cep = (formData?.cep || "").replace(/\D/g, "");
    if (cep.length !== 8) {
      toast({ title: "CEP inválido", description: "Digite um CEP com 8 dígitos.", variant: "destructive" });
      return;
    }
    setCepLoading(true);
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast({ title: "CEP não encontrado", description: "Verifique o CEP digitado.", variant: "destructive" });
        return;
      }
      setFormData((prev: any) => ({
        ...prev,
        logradouro: data.logradouro || prev.logradouro,
        bairro:     data.bairro     || prev.bairro,
        municipio:  data.localidade || prev.municipio,
        uf:         data.uf         || prev.uf,
        codigoIbge: data.ibge       || prev.codigoIbge,
      }));
      setCepFilled(true);
      toast({ title: "CEP encontrado!", description: "Endereço atualizado automaticamente." });
    } catch {
      toast({ title: "Erro ao buscar CEP", description: "Verifique sua conexão.", variant: "destructive" });
    } finally {
      setCepLoading(false);
    }
  };

  const handleSave = () => mutation.mutate(formData);

  const handleFillFakeData = () => {
    const fakeData = {
      ...formData,
      razaoSocial: "EMPRESA DE TESTES ALEATORIOS LTDA", nomeFantasia: "LOJA VIRTUAL TESTE",
      cnpj: "12.345.678/0001-99", regimeTributario: "1", ambiente: "homologacao",
      serieNfce: 1, inscricaoEstadual: "123456789", uf: "SP", municipio: "SAO PAULO",
      codigoIbge: "3550308", logradouro: "AVENIDA PAULISTA", numero: "1000",
      bairro: "BELA VISTA", cep: "01310-100", ultimoNumeroNfce: 1,
      cscToken: "ABC123DEF456GHI789", cscId: "000001",
    };
    setFormData(fakeData);
    setCnpjFetched(true);
    setCepFilled(true);
    mutation.mutate(fakeData);
    toast({ title: "Dados de Teste Gerados", description: "Campos preenchidos para homologação." });
  };

  // Helpers de lock
  const isRfLocked  = (field: string) => cnpjFetched && !unlocked.has(field) && !!formData?.[field];
  const isCepLocked = (field: string) => !cnpjFetched && cepFilled && !unlocked.has(field) && !!formData?.[field];
  const fieldOrigin = (field: string): FieldOrigin => cnpjFetched ? "cnpj" : "cep";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-8 max-w-[1600px] mx-auto bg-transparent">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 panel-translucent p-6">
        <div className="flex items-center gap-6">
          <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-white text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">
              📄 Fiscal / <span className="text-primary">Impressão</span>
            </h1>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.4em] mt-2">
              Módulo de Gestão Tributária e Hardware
            </p>
          </div>
        </div>
      </div>

      {/* Banner de carregamento automático */}
      {cnpjLoading && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-violet-500/20 bg-violet-500/5">
          <Loader2 className="w-4 h-4 text-violet-400 animate-spin flex-shrink-0" />
          <p className="text-[11px] text-violet-400/80 font-bold">
            Consultando dados na Receita Federal... Aguarde.
          </p>
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 px-1">
        {(Object.entries(ORIGIN_META) as [FieldOrigin, { label: string; color: string }][]).map(([key, { label, color }]) => (
          <span key={key} className={`text-[10px] font-bold flex items-center gap-1.5 px-2 py-1 rounded-full border ${color}`}>
            <Lock className="w-2.5 h-2.5" /> {label}
          </span>
        ))}
        <span className="text-[10px] font-bold flex items-center gap-1.5 text-orange-400/70 border border-orange-500/20 bg-orange-500/10 px-2 py-1 rounded-full">
          <Pencil className="w-2.5 h-2.5" /> Preenchimento manual necessário
        </span>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="bg-black/40 border border-white/10 p-1 rounded-xl mb-8 flex-wrap h-auto gap-2">
          <TabsTrigger value="config" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase italic tracking-widest text-[10px] py-3 px-6 rounded-lg transition-all gap-2">
            <Settings2 className="w-4 h-4" /> Configuração Fiscal
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase italic tracking-widest text-[10px] py-3 px-6 rounded-lg transition-all gap-2">
            <History className="w-4 h-4" /> Histórico NFC-e
          </TabsTrigger>
          <TabsTrigger value="printers" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase italic tracking-widest text-[10px] py-3 px-6 rounded-lg transition-all gap-2">
            <Printer className="w-4 h-4" /> Impressoras
          </TabsTrigger>
          <TabsTrigger value="barcode" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase italic tracking-widest text-[10px] py-3 px-6 rounded-lg transition-all gap-2">
            <Barcode className="w-4 h-4" /> Leitor de Barras
          </TabsTrigger>
          <TabsTrigger value="simulacao" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase italic tracking-widest text-[10px] py-3 px-6 rounded-lg transition-all gap-2">
            <Play className="w-4 h-4" /> Testes (Simulação)
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase italic tracking-widest text-[10px] py-3 px-6 rounded-lg transition-all gap-2">
            <Terminal className="w-4 h-4" /> Logs Fiscais
          </TabsTrigger>
        </TabsList>

        {/* ─── ABA CONFIG ─────────────────────────────────────── */}
        <TabsContent value="config" className="space-y-6">

          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={handleFillFakeData}
              className="bg-primary/10 border-primary/20 text-primary font-black uppercase italic tracking-widest text-[10px] h-10 px-4 gap-2 hover:bg-primary hover:text-black transition-all">
              <Wand2 className="w-4 h-4" /> Modo Teste — Dados Fictícios
            </Button>
            <Button onClick={handleSave} disabled={mutation.isPending}
              className="h-10 px-6 bg-primary text-black font-black uppercase italic tracking-widest text-[10px] rounded-xl hover:bg-primary/90 transition-all">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Configurações"}
            </Button>
          </div>

          {/* ── Seção 1: Dados da Empresa ── */}
          <Card className="panel-translucent border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white font-black uppercase italic tracking-tighter text-xl flex items-center gap-3">
                <Building2 className="w-5 h-5 text-violet-400" /> Dados da Empresa
              </CardTitle>
              <CardDescription className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
                {cnpjFetched
                  ? "Preenchido automaticamente pela Receita Federal — clique em ✏️ para corrigir se necessário"
                  : "Pré-preenchido do cadastro — será atualizado automaticamente quando o CNPJ for válido"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Razão Social */}
                {isRfLocked("razaoSocial") && !unlocked.has("razaoSocial") ? (
                  <AutoField label="Razão Social" value={formData?.razaoSocial} origin="cnpj" onUnlock={() => unlock("razaoSocial")} />
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-white/60 uppercase font-black text-[10px] tracking-widest">Razão Social</Label>
                    <Input value={formData?.razaoSocial || ""} onChange={e => set("razaoSocial", e.target.value)}
                      className="bg-black/40 border-white/20 text-white font-bold h-12 rounded-xl" />
                  </div>
                )}

                {/* Nome Fantasia */}
                {isRfLocked("nomeFantasia") && !unlocked.has("nomeFantasia") ? (
                  <AutoField label="Nome Fantasia" value={formData?.nomeFantasia} origin="cnpj" onUnlock={() => unlock("nomeFantasia")} />
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-white/60 uppercase font-black text-[10px] tracking-widest">Nome Fantasia</Label>
                    <Input value={formData?.nomeFantasia || ""} onChange={e => set("nomeFantasia", e.target.value)}
                      className="bg-black/40 border-white/20 text-white font-bold h-12 rounded-xl" />
                  </div>
                )}

                {/* CNPJ — sempre do cadastro */}
                {!unlocked.has("cnpj") ? (
                  <AutoField label="CNPJ" value={formData?.cnpj} origin="cadastro" onUnlock={() => unlock("cnpj")} />
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-white/60 uppercase font-black text-[10px] tracking-widest">CNPJ</Label>
                    <Input value={formData?.cnpj || ""} onChange={e => set("cnpj", e.target.value)}
                      className="bg-black/40 border-white/20 text-white font-bold h-12 rounded-xl" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Seção 2: Regime e Ambiente ── */}
          <Card className="panel-translucent border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white font-black uppercase italic tracking-tighter text-xl flex items-center gap-3">
                <Settings2 className="w-5 h-5 text-orange-400" /> Regime Tributário e Ambiente
              </CardTitle>
              <CardDescription className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
                {cnpjFetched ? "Regime detectado automaticamente pela Receita Federal" : "Escolha conforme o registro da empresa"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Regime Tributário */}
                {isRfLocked("regimeTributario") && !unlocked.has("regimeTributario") ? (
                  <AutoField
                    label="Regime Tributário"
                    value={REGIME_LABEL[formData?.regimeTributario] ?? formData?.regimeTributario}
                    origin="cnpj"
                    onUnlock={() => unlock("regimeTributario")}
                  />
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-white/60 uppercase font-black text-[10px] tracking-widest">Regime Tributário</Label>
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border bg-orange-500/10 text-orange-400 border-orange-500/20 flex items-center gap-1">
                        <Pencil className="w-2.5 h-2.5" /> Manual
                      </span>
                    </div>
                    <Select value={formData?.regimeTributario} onValueChange={v => set("regimeTributario", v)}>
                      <SelectTrigger className="bg-black/40 border-white/20 text-white font-bold h-12 rounded-xl">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white font-bold">
                        <SelectItem value="1">1 — Simples Nacional</SelectItem>
                        <SelectItem value="2">2 — Simples Nacional (Excesso de Sublimite)</SelectItem>
                        <SelectItem value="3">3 — Regime Normal (Lucro Presumido/Real)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-white/30 flex items-start gap-1.5 leading-relaxed">
                      <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-orange-400/60" />
                      Consulte no{" "}
                      <a href="https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp"
                        target="_blank" rel="noopener noreferrer"
                        className="text-primary/70 underline hover:text-primary inline-flex items-center gap-0.5">
                        Cartão CNPJ <ExternalLink className="w-2.5 h-2.5" />
                      </a> ou com seu contador.
                    </p>
                  </div>
                )}

                {/* Ambiente */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-white/60 uppercase font-black text-[10px] tracking-widest">Ambiente NFC-e</Label>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border bg-orange-500/10 text-orange-400 border-orange-500/20 flex items-center gap-1">
                      <Pencil className="w-2.5 h-2.5" /> Manual
                    </span>
                  </div>
                  <Select value={formData?.ambiente} onValueChange={v => set("ambiente", v)}>
                    <SelectTrigger className="bg-black/40 border-white/20 text-white font-bold h-12 rounded-xl">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white font-bold">
                      <SelectItem value="homologacao">🧪 Homologação — testes, sem valor fiscal</SelectItem>
                      <SelectItem value="producao">✅ Produção — emissão real, válida juridicamente</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-white/30 flex items-start gap-1.5 leading-relaxed">
                    <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-orange-400/60" />
                    Use <strong className="text-white/40">Homologação</strong> nos testes. Mude para{" "}
                    <strong className="text-white/40">Produção</strong> somente quando validado.
                  </p>
                </div>

                {/* Inscrição Estadual — sempre manual */}
                <ManualField
                  label="Inscrição Estadual"
                  value={formData?.inscricaoEstadual || ""}
                  onChange={v => set("inscricaoEstadual", v)}
                  placeholder="Ex: 123456789"
                  help="Consta no Cartão CNPJ emitido pela Receita Federal ou no certificado de inscrição estadual da SEFAZ do seu estado."
                  link="https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp"
                  linkLabel="Emitir Cartão CNPJ"
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Seção 3: Endereço Fiscal ── */}
          <Card className="panel-translucent border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white font-black uppercase italic tracking-tighter text-xl flex items-center gap-3">
                <Search className="w-5 h-5 text-emerald-400" /> Endereço Fiscal
              </CardTitle>
              <CardDescription className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
                {cnpjFetched
                  ? "Endereço obtido automaticamente pela Receita Federal"
                  : "Digite o CEP e clique em 🔍 para preencher automaticamente"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* CEP */}
                {isRfLocked("cep") && !unlocked.has("cep") ? (
                  <AutoField label="CEP" value={formData?.cep} origin="cnpj" onUnlock={() => unlock("cep")} />
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-white/60 uppercase font-black text-[10px] tracking-widest">CEP</Label>
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border bg-orange-500/10 text-orange-400 border-orange-500/20 flex items-center gap-1">
                        <Pencil className="w-2.5 h-2.5" /> Manual
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Input value={formData?.cep || ""}
                        onChange={e => { set("cep", e.target.value); setCepFilled(false); }}
                        onKeyDown={e => e.key === "Enter" && buscarCep()}
                        placeholder="00000-000" maxLength={9}
                        className="bg-black/40 border-white/20 text-white font-bold h-12 rounded-xl flex-1" />
                      <Button type="button" onClick={buscarCep} disabled={cepLoading}
                        className="h-12 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all rounded-xl"
                        title="Buscar endereço pelo CEP">
                        {cepLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-[10px] text-white/30 flex items-start gap-1.5 leading-relaxed">
                      <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-orange-400/60" />
                      Não sabe o CEP?{" "}
                      <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noopener noreferrer"
                        className="text-primary/70 underline hover:text-primary inline-flex items-center gap-0.5">
                        Correios <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </p>
                  </div>
                )}

                {/* Número — sempre manual */}
                <ManualField label="Número" value={formData?.numero || ""} onChange={v => set("numero", v)}
                  placeholder="Ex: 1000"
                  help="O número do imóvel não está disponível pela API — informe manualmente." />

                {/* Logradouro */}
                {(isRfLocked("logradouro") || isCepLocked("logradouro")) && !unlocked.has("logradouro") ? (
                  <AutoField label="Logradouro" value={formData?.logradouro} origin={fieldOrigin("logradouro")} onUnlock={() => unlock("logradouro")} />
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">Logradouro</Label>
                    <Input value={formData?.logradouro || ""} onChange={e => set("logradouro", e.target.value)}
                      placeholder="Preenchido automaticamente"
                      className="bg-black/40 border-white/10 text-white/60 font-bold h-12 rounded-xl border-dashed" />
                  </div>
                )}

                {/* Bairro */}
                {(isRfLocked("bairro") || isCepLocked("bairro")) && !unlocked.has("bairro") ? (
                  <AutoField label="Bairro" value={formData?.bairro} origin={fieldOrigin("bairro")} onUnlock={() => unlock("bairro")} />
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">Bairro</Label>
                    <Input value={formData?.bairro || ""} onChange={e => set("bairro", e.target.value)}
                      placeholder="Preenchido automaticamente"
                      className="bg-black/40 border-white/10 text-white/60 font-bold h-12 rounded-xl border-dashed" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Município */}
                {(isRfLocked("municipio") || isCepLocked("municipio")) && !unlocked.has("municipio") ? (
                  <AutoField label="Município" value={formData?.municipio} origin={fieldOrigin("municipio")} onUnlock={() => unlock("municipio")} />
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">Município</Label>
                    <Input value={formData?.municipio || ""} onChange={e => set("municipio", e.target.value)}
                      placeholder="Preenchido automaticamente"
                      className="bg-black/40 border-white/10 text-white/60 font-bold h-12 rounded-xl border-dashed" />
                  </div>
                )}

                {/* UF */}
                {(isRfLocked("uf") || isCepLocked("uf")) && !unlocked.has("uf") ? (
                  <AutoField label="UF" value={formData?.uf} origin={fieldOrigin("uf")} onUnlock={() => unlock("uf")} />
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">UF</Label>
                    <Select value={formData?.uf} onValueChange={v => set("uf", v)}>
                      <SelectTrigger className="bg-black/40 border-white/10 text-white/60 font-bold h-12 rounded-xl border-dashed">
                        <SelectValue placeholder="Preenchido automaticamente" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white font-bold">
                        {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Código IBGE */}
                {(isRfLocked("codigoIbge") || isCepLocked("codigoIbge")) && !unlocked.has("codigoIbge") ? (
                  <AutoField label="Código IBGE" value={formData?.codigoIbge} origin={fieldOrigin("codigoIbge")} onUnlock={() => unlock("codigoIbge")} />
                ) : (
                  <ManualField label="Código IBGE" value={formData?.codigoIbge || ""} onChange={v => set("codigoIbge", v)}
                    placeholder="Preenchido automaticamente (ex: 3550308)"
                    help="Preenchido automaticamente pelo CNPJ ou CEP. Se precisar manualmente:"
                    link="https://www.ibge.gov.br/explica/codigos-dos-municipios.php"
                    linkLabel="Tabela IBGE" />
                )}
              </div>

              {!cnpjFetched && !cepFilled && (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <RefreshCw className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <p className="text-[11px] text-emerald-400/80 font-bold">
                    Digite o CEP acima e clique em 🔍 para preencher logradouro, bairro, município, UF e código IBGE.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Seção 4: CSC ── */}
          <Card className="panel-translucent border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white font-black uppercase italic tracking-tighter text-xl flex items-center gap-3">
                <Lock className="w-5 h-5 text-orange-400" /> Credenciais NFC-e (CSC)
              </CardTitle>
              <CardDescription className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
                Obtidos no portal da SEFAZ do seu estado — não disponíveis pela Receita Federal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ManualField label="CSC Token" value={formData?.cscToken || ""} onChange={v => set("cscToken", v)}
                  placeholder="Ex: 0123456789ABCDEF"
                  help='Gerado no portal da SEFAZ do seu estado ao credenciar o CNPJ para NFC-e. Pesquise: "credenciamento CSC NFC-e [seu estado]" ou acesse o portal nacional:'
                  link="https://www.nfe.fazenda.gov.br/portal/principal.aspx"
                  linkLabel="Portal NF-e Nacional" />
                <ManualField label="CSC ID" value={formData?.cscId || ""} onChange={v => set("cscId", v)}
                  placeholder="Ex: 000001"
                  help="Número sequencial gerado junto com o CSC Token no portal da SEFAZ. Geralmente é 000001 para o primeiro credenciamento." />
              </div>
            </CardContent>
          </Card>

          {/* ── Seção 5: Numeração — sistema gerencia ── */}
          <Card className="panel-translucent border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white font-black uppercase italic tracking-tighter text-xl flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-yellow-400" /> Numeração NFC-e
              </CardTitle>
              <CardDescription className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
                Controlado automaticamente pelo sistema — não altere
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AutoField label="Série NFC-e" value={formData?.serieNfce ?? 1} origin="sistema" />
                <div className="space-y-1.5">
                  <AutoField label="Último Número NFC-e Emitido" value={formData?.ultimoNumeroNfce ?? 0} origin="sistema" />
                  <p className="text-[10px] text-white/20 flex items-center gap-1.5 mt-1">
                    <RefreshCw className="w-3 h-3 text-yellow-400/50" />
                    Incrementado a cada NFC-e emitida com sucesso.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={mutation.isPending}
              className="h-12 px-10 bg-primary text-black font-black uppercase italic tracking-widest rounded-xl hover:bg-primary/90 transition-all">
              {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salvar Configurações"}
            </Button>
          </div>
        </TabsContent>

        {/* ─── ABA HISTÓRICO ─────────────────────────────────── */}
        <TabsContent value="history">
          <Card className="panel-translucent border-white/10">
            <CardHeader>
              <CardTitle className="text-white font-black uppercase italic tracking-tighter text-2xl flex items-center gap-3">
                <History className="w-6 h-6 text-primary" /> Histórico de Emissões
              </CardTitle>
              <CardDescription className="text-white/40 uppercase font-bold text-[10px] tracking-widest">Lista de todas as NFC-e emitidas</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : (
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-black/40">
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableHead className="text-white/40 uppercase font-black text-[10px] tracking-widest">Data/Hora</TableHead>
                        <TableHead className="text-white/40 uppercase font-black text-[10px] tracking-widest">Número</TableHead>
                        <TableHead className="text-white/40 uppercase font-black text-[10px] tracking-widest">Chave de Acesso</TableHead>
                        <TableHead className="text-white/40 uppercase font-black text-[10px] tracking-widest">Valor</TableHead>
                        <TableHead className="text-white/40 uppercase font-black text-[10px] tracking-widest">Status</TableHead>
                        <TableHead className="text-white/40 uppercase font-black text-[10px] tracking-widest text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history?.map((doc) => (
                        <TableRow key={doc.id} className="border-white/10 hover:bg-white/5 transition-colors">
                          <TableCell className="text-white font-bold text-xs">
                            {doc.dataEmissao ? format(new Date(doc.dataEmissao), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
                          </TableCell>
                          <TableCell className="text-white font-black italic">{doc.serie}/{doc.numero}</TableCell>
                          <TableCell className="text-white/60 font-mono text-[10px]">{doc.chaveAcesso}</TableCell>
                          <TableCell className="text-primary font-black">R$ {(doc.valorTotal / 100).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={
                              doc.status === "authorized" ? "bg-primary/20 text-primary border-primary/20" :
                              (doc.status === "simulated" || doc.status === "simulation") ? "bg-blue-500/20 text-blue-400 border-blue-500/20" :
                              "bg-red-500/20 text-red-500 border-red-500/20"
                            }>
                              {doc.status === "authorized" ? "AUTORIZADO" :
                               (doc.status === "simulated" || doc.status === "simulation") ? "SIMULADO" : "REJEITADO"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="icon" variant="outline" className="h-8 w-8 border-white/10 hover:bg-primary hover:text-black"><Eye className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" className="h-8 w-8 border-white/10 hover:bg-primary hover:text-black"><Download className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!history || history.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-white/20 font-bold uppercase tracking-widest">Nenhum documento encontrado</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
