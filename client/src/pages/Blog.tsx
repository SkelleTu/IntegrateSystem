import { Calendar, ArrowRight } from "lucide-react";

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
    <div className="min-h-screen w-full bg-black text-white pt-32 pb-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-24 space-y-4">
          <p className="text-primary font-black italic uppercase tracking-[0.3em] text-xs">Aura Intel</p>
          <h1 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter">
            Blog & <span className="text-primary">Insights</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {posts.map((post, i) => (
            <div key={i} className="group cursor-pointer">
              <div className="relative aspect-[16/10] rounded-[2rem] overflow-hidden mb-6">
                <img 
                  src={post.image} 
                  alt={post.title}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute top-4 left-4 bg-primary text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full italic">
                  {post.category}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  <Calendar className="w-3 h-3" /> {post.date}
                </div>
                <h3 className="text-xl font-black uppercase italic leading-tight group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                <div className="flex items-center gap-2 text-xs font-black italic uppercase text-primary">
                  Ler Artigo <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
