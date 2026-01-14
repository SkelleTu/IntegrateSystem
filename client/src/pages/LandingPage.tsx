import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, ArrowRight, ShieldCheck, Zap, CreditCard, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import auraLogo from "@assets/AURA_1768346008566.png";
import luxuryBg from "@assets/stock_images/abstract_cyber_techn_19f009d2.jpg";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    taxId: "",
    email: "",
    phone: "",
    address: "",
    slug: "",
    plan: "pro",
    addressProof: null as File | null,
    rgFront: null as File | null,
    rgBack: null as File | null,
  });

  const handleFileClick = (id: string) => {
    document.getElementById(id)?.click();
  };

  const [checklist, setChecklist] = useState({
    name: false,
    taxId: false,
    email: false,
    phone: false,
    address: false,
    documents: false,
  });

  const handleRegister = async () => {
    setLoading(true);
    try {
      // Simulação de upload e registro
      await apiRequest("POST", "/api/admin/enterprises", {
        name: formData.name,
        taxId: formData.taxId,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        slug: formData.slug
      });
      setStep(3); // Vai para o pagamento
    } catch (err) {
      toast({ title: "Erro", description: "Falha ao registrar instituição.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateChecklist = (field: string, value: any) => {
    setChecklist(prev => ({ ...prev, [field]: !!value }));
  };

  const handleFileChange = (field: string, file: File | null) => {
    setFormData(prev => ({ ...prev, [field]: file }));
    if (formData.addressProof || formData.rgFront || formData.rgBack) {
      updateChecklist("documents", true);
    }
  };

  const handlePayment = () => {
    toast({ title: "Sucesso!", description: "Pagamento processado (Simulação). Bem-vindo ao Aura!" });
    setLocation("/login");
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-black relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 scale-105"
        style={{ backgroundImage: `url(${luxuryBg})` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />

      {/* Top Menu */}
      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <img src={auraLogo} alt="Aura Logo" className="h-8 w-auto" />
          <span className="text-white font-black italic tracking-tighter">AURA</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#" className="text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Início</a>
          <a href="#recursos" className="text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Recursos</a>
          <a href="#planos" className="text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Planos</a>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="text-white font-bold text-xs uppercase tracking-widest" onClick={() => setLocation("/login")}>Entrar</Button>
          <Button className="bg-primary text-white font-black italic text-xs uppercase tracking-widest px-6" onClick={() => setStep(2)}>Assinar</Button>
        </div>
      </nav>

      {/* Decorative Neon Elements with Pulse */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[30000ms]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[30000ms] delay-1000" />
      
      {/* Hero Section */}
      {step === 1 && (
        <>
        <div className="max-w-4xl w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 relative z-10 pt-20">
          <div className="flex justify-center mb-8">
            <div className="relative group">
              <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-all duration-1000 animate-pulse duration-[30000ms]" />
              <img 
                src={auraLogo} 
                alt="Aura System Logo" 
                className="w-48 md:w-64 h-auto relative z-10 drop-shadow-[0_0_30px_rgba(0,229,255,0.4)]"
              />
            </div>
          </div>
          <p className="text-zinc-400 text-lg md:text-2xl max-w-2xl mx-auto font-medium tracking-wide">
            Potencialize seu negócio com a estética do amanhã. O sistema definitivo para estabelecimentos de alto nível.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
            <Button size="lg" onClick={() => setStep(2)} className="bg-primary text-white font-black uppercase italic px-10 h-16 text-xl hover:scale-105 transition-transform shadow-[0_0_30px_rgba(0,229,255,0.6)] border-none animate-pulse">
              COMEÇAR AGORA <ArrowRight className="ml-2 w-6 h-6" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => setLocation("/login")} className="border-primary/20 bg-white/5 text-white font-bold h-16 px-10 hover:bg-primary/10 hover:border-primary/40 backdrop-blur-md">
              JÁ SOU ASSINANTE
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-24">
            {[
              { icon: ShieldCheck, title: "CYBER SECURITY", desc: "Arquitetura ultra-protegida com criptografia de ponta a ponta para seus dados institucionais." },
              { icon: Zap, title: "INSTANT FLOW", desc: "Fluxo de caixa inteligente e comanda digital ultra-veloz em tempo real." },
              { icon: CreditCard, title: "NEO PAYMENTS", desc: "Integração nativa com gateways globais e conciliação automática." }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-2xl glass-panel text-left border border-white/5 hover:border-primary/40 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <ShieldCheck className="w-12 h-12 text-primary" />
                </div>
                <feature.icon className="w-10 h-10 text-primary mb-6 group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]" />
                <h3 className="text-white font-black uppercase italic text-lg mb-3 tracking-tighter">{feature.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Benefits Section */}
          <div className="pt-32 space-y-16">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-5xl font-black italic uppercase text-white tracking-tighter">
                POR QUE ESCOLHER O <span className="text-primary">AURA</span>?
              </h2>
              <p className="text-zinc-500 font-bold uppercase text-xs tracking-[0.3em]">O Salto Tecnológico que seu Negócio Merece</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Gestão Unificada", desc: "Controle financeiro, estoque e equipe em um único terminal centralizado.", color: "text-blue-400" },
                { title: "Segurança de Dados", desc: "Backup em nuvem militar com redundância global para nunca perder nada.", color: "text-green-400" },
                { title: "Escalabilidade", desc: "Cresça sem limites. Aura adapta-se de pequenas lojas a grandes redes.", color: "text-purple-400" },
                { title: "Suporte VIP", desc: "Atendimento técnico prioritário 24/7 para manter sua operação ativa.", color: "text-amber-400" }
              ].map((benefit, i) => (
                <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className={`w-2 h-2 rounded-full ${benefit.color.replace('text', 'bg')} mb-4 shadow-[0_0_10px_currentColor]`} />
                  <h4 className="text-white font-black uppercase italic text-sm mb-2">{benefit.title}</h4>
                  <p className="text-zinc-500 text-xs font-medium leading-relaxed">{benefit.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="mt-24 w-full max-w-4xl text-center space-y-4 border-t border-white/10 pt-12 relative z-10 pb-12">
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.3em]">Informações da Empresa</p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-zinc-400 font-medium">
            <div className="flex items-center gap-2">
              <span className="text-primary text-[10px] font-black italic">CPF:</span>
              <span className="text-sm">465.048.898-21</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary text-[10px] font-black italic">SUPORTE:</span>
              <span className="text-sm">(19) 99723-8298</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary text-[10px] font-black italic">AURA SYSTEM © 2026</span>
            </div>
          </div>
        </footer>
        </>
      )}

      {/* Register Step */}
      {step === 2 && (
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl items-start relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <Card className="flex-1 bg-white/20 backdrop-blur-[40px] border-white/20 rounded-[2.5rem] md:rounded-[4rem] shadow-none overflow-hidden text-white relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            
            <CardHeader className="p-8 md:p-12 pb-4">
              <CardTitle className="text-3xl md:text-5xl font-black italic uppercase text-white tracking-tighter drop-shadow-2xl">Cadastro <span className="text-primary">Aura</span></CardTitle>
              <CardDescription className="text-white/40 font-bold uppercase text-[10px] tracking-[0.5em]">Terminal de Registro v2.0</CardDescription>
            </CardHeader>
            <CardContent className="p-8 md:p-12 pt-0 space-y-6 overflow-visible pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-black tracking-widest text-white pl-2">Nome da Instituição</label>
                  <Input 
                    placeholder="IDENTIFICAÇÃO"
                    className="bg-white/10 border-white/20 focus:border-primary/50 h-14 rounded-2xl text-white font-bold placeholder:text-white/40 px-6 transition-all focus:ring-4 focus:ring-primary/5"
                    value={formData.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({...formData, name: val, slug: val.toLowerCase().replace(/ /g, "-")});
                      updateChecklist("name", val);
                    }}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-black tracking-widest text-white pl-2">Documento (CNPJ/CPF)</label>
                  <Input 
                    placeholder="00.000.000/0000-00"
                    className="bg-white/10 border-white/20 focus:border-primary/50 h-14 rounded-2xl text-white font-bold placeholder:text-white/40 px-6 transition-all focus:ring-4 focus:ring-primary/5"
                    value={formData.taxId}
                    onChange={(e) => {
                      setFormData({...formData, taxId: e.target.value});
                      updateChecklist("taxId", e.target.value);
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-black tracking-widest text-white pl-2">E-mail</label>
                  <Input 
                    type="email"
                    placeholder="ADMIN@EMPRESA.COM"
                    className="bg-white/10 border-white/20 focus:border-primary/50 h-14 rounded-2xl text-white font-bold placeholder:text-white/40 px-6 transition-all focus:ring-4 focus:ring-primary/5"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({...formData, email: e.target.value});
                      updateChecklist("email", e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-black tracking-widest text-white pl-2">Telefone</label>
                  <Input 
                    placeholder="(00) 00000-0000"
                    className="bg-white/10 border-white/20 focus:border-primary/50 h-14 rounded-2xl text-white font-bold placeholder:text-white/40 px-6 transition-all focus:ring-4 focus:ring-primary/5"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({...formData, phone: e.target.value});
                      updateChecklist("phone", e.target.value);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase font-black tracking-widest text-white pl-2">Endereço Completo</label>
                <Input 
                  placeholder="LOCALIZAÇÃO FÍSICA"
                  className="bg-white/10 border-white/20 focus:border-primary/50 h-14 rounded-2xl text-white font-bold placeholder:text-white/40 px-6 transition-all focus:ring-4 focus:ring-primary/5"
                  value={formData.address}
                  onChange={(e) => {
                    setFormData({...formData, address: e.target.value});
                    updateChecklist("address", e.target.value);
                  }}
                />
              </div>

              <div className="space-y-6 pt-6 border-t border-white/10">
                <p className="text-[10px] font-black uppercase text-primary italic tracking-[0.2em] pl-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Verificação de Documentos
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-white/60 pl-2 tracking-wider">Comprovante de Residência</label>
                    <input
                      type="file"
                      id="addressProof"
                      className="hidden"
                      onChange={(e) => handleFileChange("addressProof", e.target.files?.[0] || null)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 bg-white/10 border-white/20 hover:bg-primary/20 hover:border-primary/50 text-white font-bold text-[10px] rounded-xl flex items-center justify-center gap-2 transition-all"
                      onClick={() => handleFileClick("addressProof")}
                    >
                      {formData.addressProof ? "ARQUIVO SELECIONADO" : "ENVIAR COMPROVANTE"}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-white/60 pl-2 tracking-wider">RG (Frente)</label>
                    <input
                      type="file"
                      id="rgFront"
                      className="hidden"
                      onChange={(e) => handleFileChange("rgFront", e.target.files?.[0] || null)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 bg-white/10 border-white/20 hover:bg-primary/20 hover:border-primary/50 text-white font-bold text-[10px] rounded-xl flex items-center justify-center gap-2 transition-all"
                      onClick={() => handleFileClick("rgFront")}
                    >
                      {formData.rgFront ? "ARQUIVO SELECIONADO" : "ENVIAR RG FRENTE"}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-white/60 pl-2 tracking-wider">RG (Verso)</label>
                    <input
                      type="file"
                      id="rgBack"
                      className="hidden"
                      onChange={(e) => handleFileChange("rgBack", e.target.files?.[0] || null)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 bg-white/10 border-white/20 hover:bg-primary/20 hover:border-primary/50 text-white font-bold text-[10px] rounded-xl flex items-center justify-center gap-2 transition-all"
                      onClick={() => handleFileClick("rgBack")}
                    >
                      {formData.rgBack ? "ARQUIVO SELECIONADO" : "ENVIAR RG VERSO"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-6 space-y-4">
                <Button 
                  className="w-full h-16 md:h-20 bg-primary hover:bg-primary/90 text-white transition-all duration-300 font-black italic text-xl md:text-2xl rounded-2xl md:rounded-3xl shadow-[0_0_40px_-5px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_-5px_rgba(16,185,129,0.5)] group overflow-hidden relative"
                  disabled={!checklist.name || !checklist.taxId || !checklist.email || !checklist.phone || !checklist.address || !formData.addressProof || !formData.rgFront || !formData.rgBack || loading}
                  onClick={handleRegister}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : "FINALIZAR CADASTRO"}
                </Button>
                <Button variant="ghost" className="w-full text-white/40 hover:text-white font-bold uppercase text-[10px] tracking-widest" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Cancelar Operação
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full md:w-80 bg-white/10 backdrop-blur-3xl border-white/10 rounded-[2rem] p-8 shadow-none text-white animate-in slide-in-from-right-8 duration-700">
            <CardTitle className="text-xl font-black italic uppercase text-white tracking-tighter mb-8 flex items-center gap-3">
              <Zap className="w-5 h-5 text-primary drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> CHECKLIST
            </CardTitle>
            <div className="space-y-4">
              {[
                { label: "IDENTIFICAÇÃO", checked: checklist.name },
                { label: "DOCUMENTAÇÃO", checked: checklist.taxId },
                { label: "CONTATO DIGITAL", checked: checklist.email },
                { label: "CONECTIVIDADE", checked: checklist.phone },
                { label: "LOGRADOURO", checked: checklist.address },
                { label: "VERIFICAÇÃO ARQUIVOS", checked: formData.addressProof && formData.rgFront && formData.rgBack },
              ].map((item, i) => (
                <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 border ${item.checked ? 'bg-primary/10 border-primary/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-white/5 border-white/5'}`}>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all duration-500 ${item.checked ? 'bg-primary border-primary scale-110' : 'border-white/10'}`}>
                    {item.checked && <ShieldCheck className="w-4 h-4 text-white" />}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${item.checked ? 'text-primary' : 'text-white/30'}`}>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-12 p-6 rounded-2xl bg-primary/5 border border-primary/10 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              <p className="text-[9px] font-bold text-white/50 leading-relaxed uppercase tracking-wider relative z-10">
                A Aura utiliza criptografia de ponta a ponta para proteger seus documentos e dados institucionais.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Payment Step */}
      {step === 3 && (
        <Card className="w-full max-w-md bg-black/60 backdrop-blur-2xl border-white/10 shadow-2xl animate-in zoom-in-95 duration-500">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-black italic uppercase text-white tracking-tighter">Plano Pro</CardTitle>
            <CardDescription className="text-primary font-black uppercase text-[10px] tracking-widest">Gateway de Pagamento Integrado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20 text-center">
              <p className="text-zinc-400 text-xs uppercase font-bold mb-1">Total a Pagar</p>
              <p className="text-4xl font-black text-white italic tracking-tighter">R$ 149,90<span className="text-sm font-normal text-zinc-500 ml-1">/mês</span></p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-20 flex flex-col gap-2 border-white/10 bg-white/5 hover:bg-primary/10 hover:border-primary/40 group">
                <CreditCard className="w-6 h-6 text-zinc-500 group-hover:text-primary" />
                <span className="text-[10px] font-black uppercase text-white">Cartão</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2 border-white/10 bg-white/5 hover:bg-primary/10 hover:border-primary/40 group">
                <Zap className="w-6 h-6 text-zinc-500 group-hover:text-primary" />
                <span className="text-[10px] font-black uppercase text-white">PIX</span>
              </Button>
            </div>
            <Button className="w-full h-14 bg-primary text-black font-black uppercase italic hover:scale-[1.02] transition-transform" onClick={handlePayment}>
              Finalizar Assinatura
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
