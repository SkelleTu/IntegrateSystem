import { Zap, ShieldCheck, BarChart3, Users2, Clock, Smartphone } from "lucide-react";
import auraLogo from "@assets/AURA_1768346008566.png";
import luxuryBg from "@assets/stock_images/professional_busines_cc21c314.jpg";

import { LandingFooter } from "@/components/layout/LandingFooter";

export default function Solutions() {
  const solutions = [
    {
      icon: Zap,
      title: "Agendamento Inteligente",
      desc: "Sistema de reserva ultra-veloz que elimina conflitos e otimiza o tempo da sua equipe.",
      features: ["Sincronização em tempo real", "Lembretes via WhatsApp", "Gestão de filas"]
    },
    {
      icon: BarChart3,
      title: "BI & Dashboard",
      desc: "Análise profunda de dados para decisões estratégicas. Veja seu lucro crescer com precisão.",
      features: ["Relatórios financeiros", "Ticket médio", "Performance por profissional"]
    },
    {
      icon: ShieldCheck,
      title: "Segurança de Elite",
      desc: "Dados protegidos por criptografia militar. Sua empresa e seus clientes sempre seguros.",
      features: ["Backup automático", "LGPD compliance", "Logs de acesso"]
    },
    {
      icon: Users2,
      title: "Gestão de Equipe",
      desc: "Controle total de comissões e performance de forma automatizada e transparente.",
      features: ["Cálculo automático", "Ponto eletrônico", "Metas dinâmicas"]
    }
  ];

  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-hidden">
      {/* Background Image with Overlay - Standard Platform Style */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 blur-[4px] scale-105"
        style={{ backgroundImage: `url(${luxuryBg})`, backgroundSize: 'cover' }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />
      
      <main className="relative z-10 pt-32 pb-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-24 space-y-6">
          <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter">
            Soluções de <span className="text-primary">Próxima Geração</span>
          </h1>
          <p className="text-zinc-500 text-lg max-w-2xl mx-auto font-medium">
            Desenvolvemos ferramentas que não apenas resolvem problemas, mas criam novas oportunidades de faturamento.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {solutions.map((sol, i) => (
            <div key={i} className="p-10 rounded-[3rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all group backdrop-blur-sm">
              <sol.icon className="w-12 h-12 text-primary mb-8 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-black uppercase mb-4">{sol.title}</h3>
              <p className="text-zinc-400 mb-8 leading-relaxed font-medium">{sol.desc}</p>
              <ul className="space-y-3">
                {sol.features.map((feat, j) => (
                  <li key={j} className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <LandingFooter />
      </main>
    </div>
  );
}
