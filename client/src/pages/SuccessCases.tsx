import { Star, TrendingUp, Shield, Zap, BarChart3, Users } from "lucide-react";

export default function SuccessCases() {
  const metrics = [
    {
      label: "Eficiência Operacional",
      value: "+45%",
      desc: "Redução no tempo médio de atendimento e processamento de comandas.",
      icon: Zap,
    },
    {
      label: "Segurança de Dados",
      value: "99.9%",
      desc: "Uptime garantido com criptografia de nível militar para informações sensíveis.",
      icon: Shield,
    },
    {
      label: "Retenção de Clientes",
      value: "30%",
      desc: "Aumento na fidelização através de gestão inteligente de histórico e preferências.",
      icon: Users,
    },
  ];

  const pillars = [
    {
      title: "Arquitetura de Dados",
      content: "Nossa infraestrutura não apenas armazena informações, ela as protege. Cada transação é validada por protocolos de segurança rigorosos, garantindo que o núcleo do seu negócio esteja sempre blindado.",
    },
    {
      title: "Inteligência Preditiva",
      content: "O Aura analisa tendências de fluxo em tempo real, permitindo que gestores antecipem demandas e otimizem escalas de trabalho antes mesmo dos horários de pico.",
    },
    {
      title: "Integração Sem Costuras",
      content: "Do estoque ao checkout, o fluxo de informação é contínuo. A eliminação de gargalos manuais resulta em uma operação mais limpa, rápida e lucrativa.",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-black text-white pt-32 pb-20 overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-24 space-y-6">
          <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter">
            O Impacto <span className="text-primary">Aura</span>
          </h1>
          <p className="text-zinc-500 text-lg max-w-2xl mx-auto font-medium">
            Engenharia de precisão aplicada à gestão de estabelecimentos de alto padrão. Resultados mensuráveis, segurança inabalável.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
          {metrics.map((m, i) => (
            <div key={i} className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 relative group hover:border-primary/40 transition-all flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <m.icon className="w-8 h-8 text-primary" />
              </div>
              <p className="text-5xl font-black text-white mb-2">{m.value}</p>
              <p className="font-black uppercase text-primary text-sm mb-4 tracking-widest">{m.label}</p>
              <p className="text-sm text-zinc-500 font-medium leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>

        <div className="space-y-16">
          <div className="text-center">
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Fundamentos da Performance</h2>
            <div className="w-24 h-1 bg-primary mx-auto"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {pillars.map((p, i) => (
              <div key={i} className="space-y-4">
                <h3 className="text-xl font-black uppercase text-primary">{p.title}</h3>
                <p className="text-zinc-400 leading-relaxed font-medium">
                  {p.content}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-32 p-12 rounded-[3rem] bg-primary/5 border border-primary/20 relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <h2 className="text-2xl md:text-4xl font-black uppercase mb-6 tracking-tighter">Pronto para elevar o nível?</h2>
          <p className="text-zinc-400 mb-10 max-w-xl mx-auto font-medium">A transição para o Aura é o divisor de águas entre a gestão convencional e a excelência tecnológica.</p>
          <button className="bg-primary text-white font-black uppercase px-12 h-16 text-lg rounded-xl hover:scale-105 transition-transform shadow-[0_0_30px_rgba(0,229,255,0.4)]">
            SOLICITAR ACESSO
          </button>
        </div>
      </div>
    </div>
  );
}
