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
import { FileText, Printer, Barcode, Terminal, Play, Settings2, Loader2, ShieldCheck } from "lucide-react";

export default function FiscalConfig() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ["/api/fiscal/settings"],
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/fiscal/settings", data);
      return res.json();
    },
    onSuccess: () => {
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

  // Initialize form data once settings are loaded
  if (settings && !formData) {
    setFormData(settings);
  }

  const handleSave = () => {
    mutation.mutate(formData);
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
            <CardHeader>
              <CardTitle className="text-white font-black uppercase italic tracking-tighter text-2xl flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-primary" /> Dados da Instituição
              </CardTitle>
              <CardDescription className="text-white/40 uppercase font-bold text-[10px] tracking-widest">Preencha os dados conforme registro na SEFAZ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">Razão Social</Label>
                  <Input 
                    value={formData?.razaoSocial || ""} 
                    onChange={e => setFormData({...formData, razaoSocial: e.target.value})}
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">Nome Fantasia</Label>
                  <Input 
                    value={formData?.nomeFantasia || ""} 
                    onChange={e => setFormData({...formData, nomeFantasia: e.target.value})}
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">CNPJ</Label>
                  <Input 
                    value={formData?.cnpj || ""} 
                    onChange={e => setFormData({...formData, cnpj: e.target.value})}
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
              </div>

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
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">Código IBGE</Label>
                  <Input 
                    value={formData?.codigoIbge || ""} 
                    onChange={e => setFormData({...formData, codigoIbge: e.target.value})}
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
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">Número</Label>
                  <Input 
                    value={formData?.numero || ""} 
                    onChange={e => setFormData({...formData, numero: e.target.value})}
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">Bairro</Label>
                  <Input 
                    value={formData?.bairro || ""} 
                    onChange={e => setFormData({...formData, bairro: e.target.value})}
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">CEP</Label>
                  <Input 
                    value={formData?.cep || ""} 
                    onChange={e => setFormData({...formData, cep: e.target.value})}
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
                <div className="space-y-2">
                  <Label className="text-white/40 uppercase font-black text-[10px] tracking-widest">Série NFC-e</Label>
                  <Input 
                    type="number"
                    value={formData?.serieNfce || 1} 
                    onChange={e => setFormData({...formData, serieNfce: parseInt(e.target.value)})}
                    className="bg-black/40 border-white/10 text-white font-bold h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white/5 rounded-2xl border border-white/10">
                <div className="space-y-4">
                  <Label className="text-primary uppercase font-black text-xs tracking-widest flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Certificado Digital (A1)
                  </Label>
                  <div className="flex flex-col gap-2">
                    <Input 
                      type="file" 
                      accept=".pfx,.p12"
                      className="hidden" 
                      id="cert-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const base64 = event.target?.result as string;
                            setFormData({...formData, certificadoA1: base64});
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <label 
                      htmlFor="cert-upload"
                      className="flex items-center justify-center gap-2 w-full h-12 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl cursor-pointer border border-dashed border-white/20 transition-all"
                    >
                      {formData?.certificadoA1 ? "✅ Certificado Carregado" : "Clique para selecionar o arquivo .pfx"}
                    </label>
                    <p className="text-[9px] text-white/30 uppercase font-bold text-center">Apenas arquivos .pfx ou .p12 (Certificado A1)</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <Label className="text-primary uppercase font-black text-xs tracking-widest flex items-center gap-2">
                    Senha do Certificado
                  </Label>
                  <Input 
                    type="password"
                    value={formData?.certificadoSenha || ""} 
                    onChange={e => setFormData({...formData, certificadoSenha: e.target.value})}
                    placeholder="Digite a senha do certificado"
                    className="bg-black border-white/20 text-white font-bold h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <Button 
                  onClick={handleSave}
                  disabled={mutation.isPending}
                  className="bg-primary hover:bg-white text-black font-black uppercase italic h-14 px-12 text-lg rounded-xl shadow-xl transition-all border-none"
                >
                  {mutation.isPending ? <Loader2 className="animate-spin" /> : "Salvar Configurações"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="printers">
          <Card className="panel-translucent border-white/10">
            <CardHeader>
              <CardTitle className="text-white font-black uppercase italic tracking-tighter text-2xl">Gerenciamento de Impressoras</CardTitle>
              <CardDescription className="text-white/40 uppercase font-bold text-[10px] tracking-widest">Integração via App Local Windows</CardDescription>
            </CardHeader>
            <CardContent className="py-20 text-center">
              <Printer className="w-16 h-16 text-white/10 mx-auto mb-6" />
              <p className="text-white/60 font-black uppercase italic text-xl tracking-tighter">Aguardando Conexão com App Local...</p>
              <p className="text-white/20 text-xs mt-4 uppercase tracking-widest font-bold">Certifique-se de que o App AuraPrint está em execução no Windows</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="barcode">
          <Card className="panel-translucent border-white/10">
            <CardHeader>
              <CardTitle className="text-white font-black uppercase italic tracking-tighter text-2xl">Leitor de Código de Barras</CardTitle>
              <CardDescription className="text-white/40 uppercase font-bold text-[10px] tracking-widest">Configuração de Dispositivos HID</CardDescription>
            </CardHeader>
            <CardContent className="py-20 text-center">
              <Barcode className="w-16 h-16 text-white/10 mx-auto mb-6" />
              <p className="text-white/60 font-black uppercase italic text-xl tracking-tighter">Pronto para Bipar</p>
              <p className="text-white/20 text-xs mt-4 uppercase tracking-widest font-bold">O leitor funciona como um teclado. Clique em um campo de busca e bipe o produto.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulacao">
          <Card className="panel-translucent border-white/10">
            <CardHeader>
              <CardTitle className="text-white font-black uppercase italic tracking-tighter text-2xl">Testes de Emissão (Simulação)</CardTitle>
              <CardDescription className="text-white/40 uppercase font-bold text-[10px] tracking-widest">Validação do Fluxo Fiscal sem valor jurídico</CardDescription>
            </CardHeader>
            <CardContent className="py-10 space-y-6">
              <div className="p-6 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-primary font-bold text-sm uppercase italic">Modo de Simulação Ativo</p>
                <p className="text-white/60 text-xs mt-1">Neste modo, o XML é gerado localmente e o QR Code é uma representação fictícia para testes de impressão.</p>
              </div>
              <Button className="bg-white/5 border border-white/10 text-white hover:bg-white/10 font-black uppercase italic h-12 rounded-lg">
                Gerar Nota de Teste
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="panel-translucent border-white/10">
            <CardHeader>
              <CardTitle className="text-white font-black uppercase italic tracking-tighter text-2xl">Logs Fiscais</CardTitle>
              <CardDescription className="text-white/40 uppercase font-bold text-[10px] tracking-widest">Histórico de comunicações SEFAZ e Erros</CardDescription>
            </CardHeader>
            <CardContent className="py-20 text-center">
              <Terminal className="w-16 h-16 text-white/10 mx-auto mb-6" />
              <p className="text-white/40 italic uppercase text-xs font-bold">Nenhum evento registrado</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
