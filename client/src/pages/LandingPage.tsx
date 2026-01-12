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
    toast({ title: "Sucesso!", description: "Pagamento processado (Simulação). Bem-vindo ao Barber-Flow!" });
    setLocation("/login");
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-transparent relative overflow-hidden">
      {/* Hero Section */}
      {step === 1 && (
        <div className="max-w-4xl w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <Building2 className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-white">
            Evolua sua <span className="text-primary">Gestão</span> com o <span className="text-primary">Vanguard Flow</span>
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">
            O sistema integrado definitivo para barbearias, padarias e estabelecimentos multi-serviços.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button size="lg" onClick={() => setStep(2)} className="bg-primary text-black font-black uppercase italic px-8 h-14 text-lg hover:scale-105 transition-transform shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              Cadastrar Minha Instituição <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => setLocation("/login")} className="border-white/10 bg-white/5 text-white font-bold h-14 px-8 hover:bg-white/10">
              Acessar Painel
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-20">
            {[
              { icon: ShieldCheck, title: "Segurança Total", desc: "Dados protegidos e biometria nativa" },
              { icon: Zap, title: "Agilidade", desc: "Fluxo de caixa e comanda digital em segundos" },
              { icon: CreditCard, title: "Pagamentos", desc: "Integração total com gateways modernos" }
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm text-left">
                <feature.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-white font-black uppercase italic text-sm mb-2">{feature.title}</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">{feature.desc}</p>
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
