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
    slug: "",
    email: "",
    plan: "pro"
  });

  const handleRegister = async () => {
    setLoading(true);
    try {
      // Stub de criação de empresa
      await apiRequest("POST", "/api/admin/enterprises", {
        name: formData.name,
        slug: formData.slug
      });
      setStep(3); // Vai para o pagamento
    } catch (err) {
      toast({ title: "Erro", description: "Falha ao registrar instituição.", variant: "destructive" });
    } finally {
      setLoading(false);
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
      )}

      {/* Register Step */}
      {step === 2 && (
        <Card className="w-full max-w-md bg-black/60 backdrop-blur-2xl border-white/10 shadow-2xl animate-in zoom-in-95 duration-500">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-black italic uppercase text-white tracking-tighter">Nova Instituição</CardTitle>
            <CardDescription className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Passo 1 de 2: Dados Básicos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Nome da Instituição</label>
              <Input 
                placeholder="Ex: Barber Shop Elite"
                className="h-12 bg-white/5 border-white/10 focus:border-primary text-white font-bold"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, "-")})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">E-mail Administrativo</label>
              <Input 
                type="email"
                placeholder="admin@suaempresa.com"
                className="h-12 bg-white/5 border-white/10 focus:border-primary text-white font-bold"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <Button 
              className="w-full h-14 bg-primary text-black font-black uppercase italic mt-4 hover:scale-[1.02] transition-transform"
              disabled={!formData.name || !formData.email || loading}
              onClick={handleRegister}
            >
              {loading ? "Processando..." : "Prosseguir para Pagamento"}
            </Button>
            <Button variant="ghost" className="w-full text-zinc-500 font-bold uppercase text-[10px]" onClick={() => setStep(1)}>
              Voltar
            </Button>
          </CardContent>
        </Card>
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
