import { FileText, Scale, Zap, ShieldAlert } from "lucide-react";

export default function TermsOfService() {
  const terms = [
    {
      title: "Licença de Uso",
      content: "Ao assinar o Aura, sua instituição recebe uma licença de uso intransferível e limitada para operar nosso ecossistema de gestão. O uso indevido da plataforma ou tentativa de engenharia reversa resultará em suspensão imediata.",
      icon: Zap
    },
    {
      title: "Responsabilidades",
      content: "O Aura é uma ferramenta de produtividade. A precisão dos dados inseridos e o cumprimento das obrigações fiscais locais são de responsabilidade exclusiva da instituição contratante.",
      icon: Scale
    },
    {
      title: "Disponibilidade",
      content: "Nossa meta é 99.9% de uptime. Manutenções programadas serão comunicadas com antecedência para minimizar o impacto na sua operação de elite.",
      icon: FileText
    },
    {
      title: "Cancelamento",
      content: "A assinatura pode ser cancelada a qualquer momento através do painel administrativo. Não haverá reembolso proporcional para o ciclo de faturamento atual.",
      icon: ShieldAlert
    }
  ];

  return (
    <div className="min-h-screen w-full bg-black text-white pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-20 space-y-6">
          <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter">
            Termos de <span className="text-primary">Serviço</span>
          </h1>
          <p className="text-zinc-500 text-lg font-medium">As regras que regem o ecossistema de gestão mais avançado do mercado.</p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {terms.map((t, i) => (
            <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col md:flex-row gap-8 items-start">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <t.icon className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase text-primary">{t.title}</h2>
                <p className="text-zinc-400 leading-relaxed font-medium">{t.content}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 p-12 rounded-[3rem] bg-primary/5 border border-primary/20 text-center">
          <p className="text-zinc-500 text-sm font-medium">Ao utilizar o Aura System, você concorda integralmente com estes termos de operação. Janeiro, 2026.</p>
        </div>
      </div>
    </div>
  );
}
