import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Printer, Barcode, Terminal, Play, Settings2, Loader2, ShieldCheck, History, Download, Eye, Wand2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FiscalConfig() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ["/api/fiscal/settings"],
    refetchOnWindowFocus: true,
    staleTime: 0
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

  const [formData, setFormData] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (settings && !formData) {
    setFormData(settings);
  }

  // Sincroniza o estado local se as configurações mudarem (ex: vindo do Caixa)
  if (settings && formData && settings.simulacaoReal !== formData.simulacaoReal) {
    setFormData(prev => ({ ...prev, simulacaoReal: settings.simulacaoReal }));
  }

  const handleSave = () => {
    mutation.mutate(formData);
  };

  const handleFillFakeData = () => {
    const fakeData = {
      ...formData,
      razaoSocial: "EMPRESA DE TESTES ALEATORIOS LTDA",
      nomeFantasia: "LOJA VIRTUAL TESTE",
      cnpj: "12.345.678/0001-99",
      regimeTributario: "1",
      ambiente: "homologacao",
      serieNfce: 1,
      inscricaoEstadual: "123456789",
      uf: "SP",
      municipio: "SAO PAULO",
      codigoIbge: "3550308",
      logradouro: "AVENIDA PAULISTA",
      numero: "1000",
      bairro: "BELA VISTA",
      ultimoNumeroNfce: 1,
      cscToken: "ABC123DEF456GHI789",
      cscId: "000001"
    };
    setFormData(fakeData);
    
    // Auto-save when generating fake data to ensure backend has it
    mutation.mutate(fakeData);
    
    toast({
      title: "Dados Gerados e Salvos",
      description: "Campos preenchidos e configurações atualizadas para teste.",
    });
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-8 max-w-[1600px] mx-auto bg-transparent">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 panel-translucent p-6">
        <div className="flex items-center gap-6">
          <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-white text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">📄 Fiscal / <span className="text-primary">Impressão</span></h1>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.4em] mt-2">Módulo de Gestão Tributária e Hardware</p>
          </div>
        </div>
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

        <TabsContent value="config">
          <Card className="panel-translucent border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-white font-black uppercase italic tracking-tighter text-2xl flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-primary" /> Dados da Instituição
                </CardTitle>
                <CardDescription className="text-white/40 uppercase font-bold text-[10px] tracking-widest">Preencha os dados conforme registro na SEFAZ</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFillFakeData}
                  className="bg-primary/10 border-primary/20 text-primary font-black uppercase italic tracking-widest text-[10px] h-10 px-4 gap-2 hover:bg-primary hover:text-black transition-all shadow-[0_0_15px_rgba(0,255,102,0.1)] hover:shadow-[0_0_20px_rgba(0,255,102,0.3)]"
                >
                  <Wand2 className="w-4 h-4" /> 
                  <div className="flex flex-col items-start leading-none">
                    <span>Modo Teste</span>
                    <span className="text-[7px] opacity-60">Gerar Dados Fictícios</span>
                  </div>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">Razão Social</Label>
                  <Input 
                    value={formData?.razaoSocial || ""} 
                    onChange={e => setFormData({...formData, razaoSocial: e.target.value})}
                    placeholder="Ex: Empresa de Teste LTDA"
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">Nome Fantasia</Label>
                  <Input 
                    value={formData?.nomeFantasia || ""} 
                    onChange={e => setFormData({...formData, nomeFantasia: e.target.value})}
                    placeholder="Ex: Minha Loja"
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">CNPJ</Label>
                  <Input 
                    value={formData?.cnpj || ""} 
                    onChange={e => setFormData({...formData, cnpj: e.target.value})}
                    placeholder="Ex: 00.000.000/0001-00"
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">Regime Tributário</Label>
                  <Select value={formData?.regimeTributario} onValueChange={v => setFormData({...formData, regimeTributario: v})}>
                    <SelectTrigger className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl">
                      <SelectValue placeholder="Regime" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white font-bold">
                      <SelectItem value="1">Simples Nacional</SelectItem>
                      <SelectItem value="2">Simples Nacional - Excesso</SelectItem>
                      <SelectItem value="3">Regime Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">Ambiente</Label>
                  <Select value={formData?.ambiente} onValueChange={v => setFormData({...formData, ambiente: v})}>
                    <SelectTrigger className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl">
                      <SelectValue placeholder="Ambiente" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white font-bold">
                      <SelectItem value="homologacao">Homologação</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">Série NFC-e</Label>
                  <Input 
                    type="number"
                    value={formData?.serieNfce || 1} 
                    onChange={e => setFormData({...formData, serieNfce: parseInt(e.target.value)})}
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">Inscrição Estadual</Label>
                  <Input 
                    value={formData?.inscricaoEstadual || ""} 
                    onChange={e => setFormData({...formData, inscricaoEstadual: e.target.value})}
                    placeholder="Ex: 123456789"
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">UF</Label>
                  <Select value={formData?.uf} onValueChange={v => setFormData({...formData, uf: v})}>
                    <SelectTrigger className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white font-bold">
                      {["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"].map(uf => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">Município</Label>
                  <Input 
                    value={formData?.municipio || ""} 
                    onChange={e => setFormData({...formData, municipio: e.target.value})}
                    placeholder="Ex: São Paulo"
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">Código IBGE</Label>
                  <Input 
                    value={formData?.codigoIbge || ""} 
                    onChange={e => setFormData({...formData, codigoIbge: e.target.value})}
                    placeholder="Ex: 3550308"
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">Logradouro</Label>
                  <Input 
                    value={formData?.logradouro || ""} 
                    onChange={e => setFormData({...formData, logradouro: e.target.value})}
                    placeholder="Ex: Av. Paulista"
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">Número</Label>
                  <Input 
                    value={formData?.numero || ""} 
                    onChange={e => setFormData({...formData, numero: e.target.value})}
                    placeholder="Ex: 1000"
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">Bairro</Label>
                  <Input 
                    value={formData?.bairro || ""} 
                    onChange={e => setFormData({...formData, bairro: e.target.value})}
                    placeholder="Ex: Bela Vista"
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">CEP</Label>
                  <Input 
                    value={formData?.cep || ""} 
                    onChange={e => setFormData({...formData, cep: e.target.value})}
                    placeholder="Ex: 01310-100"
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">CSC Token (NFC-e)</Label>
                  <Input 
                    value={formData?.cscToken || ""} 
                    onChange={e => setFormData({...formData, cscToken: e.target.value})}
                    placeholder="Ex: 0123456789ABCDEF"
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">CSC ID</Label>
                  <Input 
                    value={formData?.cscId || ""} 
                    onChange={e => setFormData({...formData, cscId: e.target.value})}
                    placeholder="Ex: 000001"
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleSave}
                    disabled={mutation.isPending}
                    className="w-full h-12 bg-primary text-black font-black uppercase italic tracking-widest rounded-xl hover:bg-primary/90 transition-all"
                  >
                    {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salvar Configurações"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
                <div className="flex justify-center p-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
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
                          <TableCell className="text-white font-black italic">
                            {doc.serie}/{doc.numero}
                          </TableCell>
                          <TableCell className="text-white/60 font-mono text-[10px]">
                            {doc.chaveAcesso}
                          </TableCell>
                          <TableCell className="text-primary font-black">
                            R$ {(doc.valorTotal / 100).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              doc.status === 'authorized' ? 'bg-primary/20 text-primary border-primary/20' :
                              (doc.status === 'simulated' || doc.status === 'simulation') ? 'bg-blue-500/20 text-blue-400 border-blue-500/20' :
                              'bg-red-500/20 text-red-500 border-red-500/20'
                            }>
                              {doc.status === 'authorized' ? 'AUTORIZADO' : 
                               (doc.status === 'simulated' || doc.status === 'simulation') ? 'SIMULADO' : 'REJEITADO'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="icon" variant="outline" className="h-8 w-8 border-white/10 hover:bg-primary hover:text-black">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="outline" className="h-8 w-8 border-white/10 hover:bg-primary hover:text-black">
                                <Download className="w-4 h-4" />
                              </Button>
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
