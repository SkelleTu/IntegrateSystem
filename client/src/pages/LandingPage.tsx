import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, ArrowRight, ShieldCheck, Zap, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-transparent relative overflow-hidden">
      {/* Decorative Neon Elements with Pulse */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[4000ms]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[4000ms] delay-1000" />
      
      {/* Hero Section */}
      {step === 1 && (
        <>
        <div className="max-w-4xl w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 relative z-10">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(0,229,255,0.2)]">
              <Building2 className="w-10 h-10 text-primary animate-pulse" />
            </div>
          </div>
          <h1 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter text-white leading-none">
            AURA <span className="text-primary neon-text-blue">SYSTEM</span>
          </h1>
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
              { icon: ShieldCheck, title: "CYBER SECURITY", desc: "Arquitetura ultra-protegida para seus dados." },
              { icon: Zap, title: "INSTANT FLOW", desc: "Fluxo de caixa e comanda digital em tempo real." },
              { icon: CreditCard, title: "NEO PAYMENTS", desc: "Integração nativa com gateways globais." }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-2xl glass-panel text-left hover:border-primary/40 transition-colors group">
                <feature.icon className="w-10 h-10 text-primary mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-white font-black uppercase italic text-lg mb-3 tracking-tighter">{feature.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed font-medium">{feature.desc}</p>
              </div>
            ))}
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
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl items-start">
          <Card className="flex-1 bg-black/60 backdrop-blur-2xl border-white/10 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-3xl font-black italic uppercase text-white tracking-tighter">Cadastro Robusto</CardTitle>
              <CardDescription className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Preencha todos os campos obrigatórios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Nome da Instituição</label>
                  <Input 
                    placeholder="Ex: Barber Shop Elite"
                    className="h-12 bg-white/5 border-white/10 focus:border-primary text-white font-bold"
                    value={formData.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({...formData, name: val, slug: val.toLowerCase().replace(/ /g, "-")});
                      updateChecklist("name", val);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">CNPJ ou CPF</label>
                  <Input 
                    placeholder="00.000.000/0000-00"
                    className="h-12 bg-white/5 border-white/10 focus:border-primary text-white font-bold"
                    value={formData.taxId}
                    onChange={(e) => {
                      setFormData({...formData, taxId: e.target.value});
                      updateChecklist("taxId", e.target.value);
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">E-mail</label>
                  <Input 
                    type="email"
                    placeholder="contato@empresa.com"
                    className="h-12 bg-white/5 border-white/10 focus:border-primary text-white font-bold"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({...formData, email: e.target.value});
                      updateChecklist("email", e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Telefone</label>
                  <Input 
                    placeholder="(00) 00000-0000"
                    className="h-12 bg-white/5 border-white/10 focus:border-primary text-white font-bold"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({...formData, phone: e.target.value});
                      updateChecklist("phone", e.target.value);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Endereço Completo</label>
                <Input 
                  placeholder="Rua, Número, Bairro, Cidade, Estado"
                  className="h-12 bg-white/5 border-white/10 focus:border-primary text-white font-bold"
                  value={formData.address}
                  onChange={(e) => {
                    setFormData({...formData, address: e.target.value});
                    updateChecklist("address", e.target.value);
                  }}
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <p className="text-[10px] font-black uppercase text-primary italic">Upload de Documentos (Obrigatório)</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase text-zinc-500">Comprovante de Endereço</label>
                    <Input type="file" className="h-10 bg-white/5 border-white/10 text-[10px]" onChange={(e) => handleFileChange("addressProof", e.target.files?.[0] || null)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase text-zinc-500">RG (Frente)</label>
                    <Input type="file" className="h-10 bg-white/5 border-white/10 text-[10px]" onChange={(e) => handleFileChange("rgFront", e.target.files?.[0] || null)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase text-zinc-500">RG (Verso)</label>
                    <Input type="file" className="h-10 bg-white/5 border-white/10 text-[10px]" onChange={(e) => handleFileChange("rgBack", e.target.files?.[0] || null)} />
                  </div>
                </div>
              </div>

              <Button 
                className="w-full h-14 bg-primary text-black font-black uppercase italic mt-6"
                disabled={!checklist.name || !checklist.taxId || !checklist.email || !checklist.phone || !checklist.address || !formData.addressProof || !formData.rgFront || !formData.rgBack || loading}
                onClick={handleRegister}
              >
                {loading ? "Verificando Dados..." : "Finalizar Cadastro Passo a Passo"}
              </Button>
              <Button variant="ghost" className="w-full text-zinc-500 font-bold uppercase text-[10px]" onClick={() => setStep(1)}>
                Voltar
              </Button>
            </CardContent>
          </Card>

          <Card className="w-full md:w-80 bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl p-6">
            <CardTitle className="text-xl font-black italic uppercase text-white tracking-tighter mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> Checklist
            </CardTitle>
            <div className="space-y-4">
              {[
                { label: "Nome da Instituição", checked: checklist.name },
                { label: "Documento (CPF/CNPJ)", checked: checklist.taxId },
                { label: "E-mail de Contato", checked: checklist.email },
                { label: "Telefone de Suporte", checked: checklist.phone },
                { label: "Endereço Físico", checked: checklist.address },
                { label: "Upload de Documentos", checked: formData.addressProof && formData.rgFront && formData.rgBack },
              ].map((item, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${item.checked ? 'bg-primary/20 border border-primary/30' : 'bg-white/5 border border-white/5'}`}>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${item.checked ? 'bg-primary border-primary' : 'border-white/20'}`}>
                    {item.checked && <ShieldCheck className="w-3 h-3 text-black" />}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${item.checked ? 'text-primary' : 'text-zinc-500'}`}>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[9px] font-bold text-zinc-500 leading-relaxed uppercase">
                O sistema Aura exige verificação completa para garantir a segurança de todos os assinantes.
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
