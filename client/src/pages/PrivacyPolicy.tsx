import { Shield, Lock, Eye, FileText } from "lucide-react";

export default function PrivacyPolicy() {
  const sections = [
    {
      title: "Coleta de Informações",
      content: "Coletamos apenas os dados estritamente necessários para a operação do sistema Aura, incluindo informações cadastrais da instituição e dados técnicos para autenticação biométrica via WebAuthn. Sua privacidade é nosso compromisso de elite.",
      icon: Eye
    },
    {
      title: "Segurança de Dados",
      content: "Utilizamos criptografia de ponta a ponta e armazenamento em nuvem com redundância global. Seus dados são protegidos por arquitetura de segurança multicamadas, garantindo que informações sensíveis nunca sejam expostas.",
      icon: Shield
    },
    {
      title: "Uso de Cookies",
      content: "O Aura utiliza cookies técnicos essenciais para manter a sessão ativa e garantir a performance do terminal. Não rastreamos sua navegação para fins publicitários.",
      icon: Lock
    },
    {
      title: "Seus Direitos",
      content: "Em conformidade com a LGPD, você tem direito total de acesso, correção e exclusão de seus dados a qualquer momento através do nosso canal de suporte prioritário.",
      icon: FileText
    }
  ];

  return (
    <div className="min-h-screen w-full bg-black text-white pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-20 space-y-6">
          <h1 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter">
            Política de <span className="text-primary">Privacidade</span>
          </h1>
          <p className="text-zinc-500 text-lg font-medium">Transparência total e segurança inabalável para sua instituição.</p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {sections.map((s, i) => (
            <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col md:flex-row gap-8 items-start">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic text-primary">{s.title}</h2>
                <p className="text-zinc-400 leading-relaxed font-medium">{s.content}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 p-12 rounded-[3rem] bg-primary/5 border border-primary/20 text-center">
          <p className="text-zinc-500 text-sm font-medium">Última atualização: Janeiro de 2026. O Aura reserva-se o direito de atualizar este documento para refletir melhorias contínuas em nossos protocolos de segurança.</p>
        </div>
      </div>
    </div>
  );
}
