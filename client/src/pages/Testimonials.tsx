import { Star, Quote } from "lucide-react";

export default function Testimonials() {
  const testimonials = [
    {
      name: "Marcus Vinícius",
      role: "Dono de Padaria",
      content: "O Aura mudou completamente o patamar da minha padaria. A agilidade no caixa e a segurança dos dados me dão a tranquilidade que eu nunca tive antes.",
      rating: 5
    },
    {
      name: "Ana Luísa",
      role: "Gerente de Rede de Padarias",
      content: "Gerenciar 4 unidades se tornou simples. Os relatórios em tempo real são indispensáveis para o meu crescimento.",
      rating: 5
    },
    {
      name: "Ricardo Santos",
      role: "Padeiro Master",
      content: "O sistema é intuitivo e extremamente rápido. Meus clientes elogiam a facilidade no atendimento e o profissionalismo.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen w-full bg-black text-white pt-32 pb-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-24 space-y-6">
          <h1 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter">
            Vozes da <span className="text-primary">Elite</span>
          </h1>
          <p className="text-zinc-500 text-lg max-w-2xl mx-auto font-medium">
            Quem experimenta o Aura não aceita nada menos que a perfeição tecnológica.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div key={i} className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 relative group hover:border-primary/40 transition-all">
              <Quote className="w-10 h-10 text-primary/20 absolute top-8 right-8" />
              <div className="flex gap-1 mb-6">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-primary fill-primary" />
                ))}
              </div>
              <p className="text-lg font-medium text-zinc-300 italic mb-8 leading-relaxed">"{t.content}"</p>
              <div>
                <p className="font-black uppercase text-primary italic">{t.name}</p>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
