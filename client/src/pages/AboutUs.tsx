import { Building2, Users, Target, Award, ShieldCheck } from "lucide-react";
import auraLogo from "@assets/AURA_1768346008566.png";
import luxuryBg from "@assets/stock_images/professional_busines_cc21c314.jpg";

export default function AboutUs() {
  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-10"
        style={{ backgroundImage: `url(${luxuryBg})` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black via-black/90 to-black" />

      <main className="relative z-10 pt-32 pb-20 px-6 max-w-6xl mx-auto space-y-24">
        {/* Hero Section */}
        <section className="text-center space-y-8 max-w-3xl mx-auto">
          <div className="flex justify-center mb-8">
            <img src={auraLogo} alt="Aura Logo" className="w-32 md:w-48 h-auto drop-shadow-[0_0_30px_rgba(0,229,255,0.4)]" />
          </div>
          <h1 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">
            A Revolução na <span className="text-primary">Gestão de Luxo</span>
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl font-medium leading-relaxed">
            Nascemos da necessidade de elevar o padrão. O Aura não é apenas um software; é o sistema nervoso central dos estabelecimentos mais exclusivos do país.
          </p>
        </section>

        {/* Vision/Mission Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Target,
              title: "Propósito",
              desc: "Eliminar a fricção operacional para que você foque no que realmente importa: a experiência do seu cliente."
            },
            {
              icon: Users,
              title: "Comunidade",
              desc: "Uma rede exclusiva de empreendedores que não aceitam o medíocre. O Aura é o ponto comum dos líderes de mercado."
            },
            {
              icon: Award,
              title: "Excelência",
              desc: "Cada linha de código foi escrita pensando na perfeição. Estética e funcionalidade em simbiose total."
            }
          ].map((item, i) => (
            <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-primary/40 transition-all group">
              <item.icon className="w-12 h-12 text-primary mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-black uppercase italic mb-4">{item.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Story Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center border-t border-white/10 pt-24">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter">Nossa <span className="text-primary">História</span></h2>
            <div className="space-y-4 text-zinc-400 font-medium text-lg leading-relaxed">
              <p>
                O Aura surgiu em 2024, no coração tecnológico do Brasil, com uma missão clara: transformar a gestão de serviços em uma forma de arte.
              </p>
              <p>
                Observamos que os sistemas tradicionais eram lentos, feios e limitados. O mercado de alto padrão exigia algo mais. Exigia o Aura.
              </p>
              <p>
                Hoje, processamos milhões em transações e gerimos milhares de agendamentos diariamente, sempre com a mesma obsessão pela segurança e velocidade.
              </p>
            </div>
          </div>
          <div className="relative">
             <div className="absolute -inset-4 bg-primary/20 rounded-full blur-3xl animate-pulse duration-[10000ms]" />
             <div className="relative bg-white/5 border border-white/10 p-12 rounded-[3rem] backdrop-blur-3xl overflow-hidden">
                <ShieldCheck className="w-24 h-24 text-primary opacity-20 absolute top-4 right-4" />
                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-black text-primary italic">99.9%</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">Uptime<br/>Garantido</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-black text-primary italic">100%</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">Segurança<br/>Criptografada</div>
                  </div>
                </div>
             </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center pt-24 pb-12">
          <h2 className="text-2xl md:text-4xl font-black italic uppercase mb-8">Pronto para fazer parte da elite?</h2>
          <a href="/register" className="inline-flex items-center gap-3 bg-primary text-white font-black italic uppercase px-12 h-20 text-xl rounded-2xl hover:scale-105 transition-transform shadow-[0_0_50px_rgba(0,229,255,0.3)]">
            Assinar Agora <Award className="w-6 h-6" />
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 opacity-50">
          <div className="flex items-center gap-2">
            <img src={auraLogo} alt="Aura Logo" className="h-6 w-auto" />
            <span className="font-black italic text-xs tracking-tighter">AURA SYSTEM © 2026</span>
          </div>
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest">
            <a href="/privacy" className="hover:text-primary transition-colors">Privacidade</a>
            <a href="/terms" className="hover:text-primary transition-colors">Termos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
