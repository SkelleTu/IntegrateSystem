import { Calendar, ArrowRight } from "lucide-react";
import auraLogo from "@assets/AURA_1768346008566.png";
import blogBg from "@assets/generated_images/minimalist_workspace_with_professional_journalism_aesthetic_and_digital_screen..png";

export default function Blog() {
  const posts = [
    {
      title: "Como a tecnologia está moldando o futuro das barbearias",
      date: "14 JAN 2026",
      category: "TECNOLOGIA",
      image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "A importância da segurança de dados no agendamento digital",
      date: "10 JAN 2026",
      category: "SEGURANÇA",
      image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "Estratégias de fidelização de alto padrão para 2026",
      date: "05 JAN 2026",
      category: "GESTÃO",
      image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=800"
    }
  ];

  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 blur-[2px] scale-105"
        style={{ backgroundImage: `url(${blogBg})`, backgroundSize: 'cover' }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />

      <main className="relative z-10 pt-32 pb-20 px-6 max-w-6xl mx-auto">
        <div className="mb-24 space-y-4 text-center md:text-left">
          <p className="text-primary font-black uppercase tracking-[0.3em] text-xs">Aura Intel</p>
          <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter">
            Blog & <span className="text-primary">Insights</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {posts.map((post, i) => (
            <div key={i} className="group cursor-pointer bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-sm hover:border-primary/40 transition-all">
              <div className="relative aspect-[16/10] rounded-[1.5rem] overflow-hidden mb-6">
                <img 
                  src={post.image} 
                  alt={post.title}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute top-4 left-4 bg-primary text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  {post.category}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  <Calendar className="w-3 h-3" /> {post.date}
                </div>
                <h3 className="text-xl font-black uppercase leading-tight group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                <div className="flex items-center gap-2 text-xs font-black uppercase text-primary">
                  Ler Artigo <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-16 px-6 bg-black/80 backdrop-blur-lg mt-20">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-12">
          <div className="flex flex-col items-center gap-4 group transition-all">
            <img src={auraLogo} alt="Aura Logo" className="h-10 w-auto drop-shadow-[0_0_15px_rgba(0,229,255,0.3)]" />
            <span className="font-black text-sm tracking-widest text-zinc-500 uppercase">Aura System © 2026</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-12">
            <a href="/privacy" className="group flex flex-col items-center gap-2 text-zinc-400 hover:text-primary transition-all duration-300">
              <span className="text-xs font-black uppercase tracking-[0.4em] mb-1">Privacidade</span>
              <div className="h-0.5 w-0 group-hover:w-full bg-primary transition-all duration-500 shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
            </a>
            <a href="/terms" className="group flex flex-col items-center gap-2 text-zinc-400 hover:text-primary transition-all duration-300">
              <span className="text-xs font-black uppercase tracking-[0.4em] mb-1">Termos</span>
              <div className="h-0.5 w-0 group-hover:w-full bg-primary transition-all duration-500 shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
