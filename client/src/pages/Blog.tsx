import { Link, useLocation } from "wouter";
import { ArrowLeft, Calendar, Clock, Share2, Bookmark, ArrowRight, ShieldCheck, Zap, Globe, BarChart3 } from "lucide-react";
import auraLogo from "@assets/AURA_1768346008566.png";
import luxuryBg from "@assets/stock_images/professional_busines_cc21c314.jpg";
import { useToast } from "@/hooks/use-toast";

import { LandingFooter } from "@/components/layout/LandingFooter";

const POSTS = [
  {
    id: "seguranca-dados-enterprise",
    title: "Arquitetura de Segurança: O Padrão Enterprise em Sistemas de Gestão 2026",
    excerpt: "Uma análise técnica sobre criptografia pós-quântica e a integridade de dados em larga escala no setor de serviços.",
    date: "14 JAN 2026",
    category: "SEGURANÇA",
    readTime: "12 min",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200",
    content: `
      <h2>A Nova Fronteira da Proteção de Dados</h2>
      <p>No cenário corporativo global de 2026, a segurança de dados deixou de ser um diferencial para se tornar o alicerce de qualquer operação Enterprise. O Aura System implementa o que há de mais avançado em <strong>Criptografia de Ponta a Ponta (E2EE)</strong>, garantindo que informações institucionais permaneçam invioláveis.</p>
      
      <h3>Impacto Científico e Técnico</h3>
      <p>Estudos recentes do MIT indicam que a latência em sistemas de segurança pode custar até 3% do faturamento anual de uma empresa. Nossa arquitetura utiliza algoritmos de baixa latência que processam verificações de segurança em menos de 15ms, mantendo a fluidez operacional sem comprometer a proteção.</p>
      
      <blockquote>
        "A segurança enterprise não é sobre barreiras, é sobre visibilidade controlada." - Arquitetura Aura
      </blockquote>

      <h3>Impacto em Diferentes Setores</h3>
      <ul>
        <li><strong>Saúde:</strong> Proteção rigorosa de prontuários médicos digitais sob normas internacionais.</li>
        <li><strong>Finanças:</strong> Conciliação bancária protegida por camadas de autenticação biométrica.</li>
        <li><strong>Serviços de Luxo:</strong> Blindagem do histórico de consumo e preferências de clientes VIP.</li>
      </ul>
    `
  },
  {
    id: "tecnologia-omnichannel",
    title: "Omnichannel e a Convergência de Canais: O Fim das Barreiras no Varejo e Serviços",
    excerpt: "Como a unificação de pontos de contato físicos e digitais está gerando um aumento de 40% na retenção de clientes enterprise.",
    date: "10 JAN 2026",
    category: "TECNOLOGIA",
    readTime: "10 min",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1200",
    content: `
      <h2>A Unificação como Estratégia de Crescimento</h2>
      <p>A fragmentação de dados é o maior inimigo da eficiência. Empresas que operam com sistemas isolados perdem insights valiosos sobre o comportamento do consumidor. O Aura propõe uma <strong>Single Source of Truth (SSOT)</strong>.</p>
      
      <h3>Detalhes Operacionais</h3>
      <p>Ao integrar o estoque físico com o tablet do cliente e o dashboard financeiro, eliminamos em 98% os erros de inventário. Isso reflete diretamente no EBITDA da empresa, otimizando o capital de giro.</p>
      
      <p>A tecnologia por trás do Aura utiliza WebSockets para atualizações em tempo real, permitindo que uma venda no caixa seja refletida instantaneamente em todos os terminais da rede, independente da localização geográfica.</p>
    `
  },
  {
    id: "gestao-estoque-inteligente",
    title: "Gestão de Ativos e Estoque: Inteligência Preditiva em Ambientes de Alta Rotatividade",
    excerpt: "Modelos matemáticos aplicados à reposição automática e controle de desperdício em estabelecimentos multi-serviços.",
    date: "05 JAN 2026",
    category: "GESTÃO",
    readTime: "15 min",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200",
    content: `
      <h2>Eficiência Preditiva</h2>
      <p>Gerir estoque não é apenas contar itens; é prever a demanda baseada em dados históricos e tendências de mercado. O Aura utiliza modelos de <strong>Machine Learning</strong> para sugerir ordens de compra antes mesmo que o produto acabe.</p>
      
      <h3>Análise de Impacto</h3>
      <p>Em estabelecimentos como padarias gourmet e centros de estética, o desperdício de insumos pode reduzir a margem de lucro em até 12%. Com o controle milimétrico do Aura, nossos parceiros reportam uma redução média de 30% nas perdas por vencimento ou má utilização.</p>
    `
  }
];

export default function Blog() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const isPostPage = location.startsWith("/blog/");
  const postId = location.split("/").pop();
  const currentPost = POSTS.find(p => p.id === postId);

  if (isPostPage && currentPost) {
    return (
      <div className="min-h-screen w-full bg-black text-white relative flex flex-col">
        {/* Background Image with Overlay - Match Landing Page Style */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 blur-[4px] scale-105"
          style={{ backgroundImage: `url(${luxuryBg})`, backgroundSize: 'cover' }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />
        <div className="fixed top-0 left-0 w-full z-50 px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/50 backdrop-blur-md">
          <Link href="/blog" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Voltar aos Insights</span>
          </Link>
          <img src={auraLogo} alt="Aura Logo" className="h-16 md:h-20 w-auto transition-transform hover:scale-105" />
          <div className="flex gap-4">
            <Share2 
              className="w-5 h-5 text-zinc-500 hover:text-primary cursor-pointer transition-colors" 
              onClick={() => {
                navigator.share({
                  title: currentPost.title,
                  text: currentPost.excerpt,
                  url: window.location.href,
                }).catch(() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast({ title: "Link copiado!", description: "O link do artigo foi copiado para sua área de transferência." });
                });
              }}
            />
            <Bookmark 
              className="w-5 h-5 text-zinc-500 hover:text-primary cursor-pointer transition-colors" 
              onClick={() => {
                toast({ title: "Artigo Salvo", description: "Este insight foi salvo na sua biblioteca pessoal." });
              }}
            />
          </div>
        </div>

        <main className="relative z-10 pt-32 pb-20 px-6 max-w-4xl mx-auto flex-1">
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                <span>{currentPost.category}</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-zinc-500">{currentPost.date}</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-zinc-500">{currentPost.readTime} DE LEITURA</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-tight">
                {currentPost.title}
              </h1>
            </div>

            <div className="aspect-video rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,229,255,0.1)]">
              <img src={currentPost.image} alt={currentPost.title} className="w-full h-full object-cover" />
            </div>

            <div 
              className="prose prose-invert prose-zinc max-w-none prose-h2:text-white prose-h2:font-black prose-h2:uppercase prose-h2:tracking-tight prose-h3:text-primary prose-h3:font-bold prose-h3:uppercase prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:p-6 prose-blockquote:rounded-2xl prose-strong:text-primary"
              dangerouslySetInnerHTML={{ __html: currentPost.content }}
            />
          </div>
        </main>

        <footer className="border-t border-white/10 py-12 bg-zinc-950">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Gostou deste conteúdo? Comece a transformar seu negócio hoje.</p>
            <Link href="/register">
              <button className="bg-primary text-white font-black uppercase px-8 py-4 rounded-xl hover:scale-105 transition-transform shadow-[0_0_30px_rgba(0,229,255,0.4)]">
                Assinar Aura System
              </button>
            </Link>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-x-hidden">
      {/* Background Image with Overlay - Match Landing Page Style */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 blur-[4px] scale-105"
        style={{ backgroundImage: `url(${luxuryBg})`, backgroundSize: 'cover' }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <main className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-24 items-end">
          <div className="lg:col-span-8 space-y-6">
            <div className="inline-block px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-md mb-2">
              <p className="text-primary text-[10px] font-black uppercase tracking-[0.4em]">Enterprise Intelligence</p>
            </div>
            <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none">
              AURA <span className="text-primary">INSIGHTS</span>
            </h1>
            <p className="text-zinc-400 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
              Explorações profundas sobre tecnologia, segurança e modelos matemáticos de gestão aplicados ao ecossistema enterprise.
            </p>
          </div>
          <div className="lg:col-span-4 hidden lg:block">
            <div className="p-8 rounded-[2rem] border border-white/5 bg-white/5 backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-3 text-primary">
                <Globe className="w-5 h-5" />
                <span className="font-black text-[10px] uppercase tracking-widest">Global Trends 2026</span>
              </div>
              <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                Acompanhe as tendências de mercado que estão redefinindo o padrão de atendimento e eficiência operacional em todo o mundo.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {POSTS.map((post) => (
            <div 
              key={post.id} 
              onClick={() => setLocation(`/blog/${post.id}`)}
              className="group cursor-pointer flex flex-col h-full bg-zinc-950/50 border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-primary/40 transition-all duration-500"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img 
                  src={post.image} 
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-6 left-6">
                  <div className="bg-black/60 backdrop-blur-md text-primary text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-primary/20">
                    {post.category}
                  </div>
                </div>
              </div>
              
              <div className="p-8 flex flex-col flex-1 space-y-6">
                <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {post.date}</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {post.readTime}</span>
                </div>
                
                <div className="space-y-4 flex-1">
                  <h3 className="text-2xl font-black uppercase leading-tight group-hover:text-primary transition-colors duration-300">
                    {post.title}
                  </h3>
                  <p className="text-zinc-500 text-sm font-medium leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>

                <div className="pt-6 border-t border-white/5 flex items-center justify-between group/btn">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary group-hover/btn:translate-x-2 transition-transform duration-300 flex items-center gap-2">
                    Explorar Conteúdo <ArrowRight className="w-3 h-3" />
                  </span>
                  <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover/btn:border-primary/40 transition-colors">
                    <Zap className="w-3 h-3 text-zinc-500 group-hover/btn:text-primary" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Industry Focus Section */}
        <div className="mt-32 p-12 rounded-[3rem] bg-zinc-950 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5">
            <BarChart3 className="w-64 h-64 text-primary" />
          </div>
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                IMPACTO <span className="text-primary">MULTISECTOR</span>
              </h2>
              <p className="text-zinc-400 font-medium leading-relaxed">
                O Aura System não é apenas uma ferramenta; é um ecossistema de inteligência que se adapta às necessidades específicas de cada setor enterprise, desde a logística complexa até o varejo de alto padrão.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {['Logística', 'Hospitalidade', 'Varejo Luxo', 'Health & Care'].map(item => (
                  <div key={item} className="flex items-center gap-3 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                    <ShieldCheck className="w-4 h-4 text-primary" /> {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 blur-[100px] group-hover:bg-primary/30 transition-all duration-700" />
                <img src={auraLogo} alt="Aura Logo" className="h-32 w-auto relative z-10 brightness-200 grayscale" />
              </div>
            </div>
          </div>
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
            <Link href="/privacy" className="group flex flex-col items-center gap-2 text-zinc-400 hover:text-primary transition-all duration-300 cursor-pointer">
              <span className="text-xs font-black uppercase tracking-[0.4em] mb-1">Privacidade</span>
              <div className="h-0.5 w-0 group-hover:w-full bg-primary transition-all duration-500 shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
            </Link>
            <Link href="/terms" className="group flex flex-col items-center gap-2 text-zinc-400 hover:text-primary transition-all duration-300 cursor-pointer">
              <span className="text-xs font-black uppercase tracking-[0.4em] mb-1">Termos</span>
              <div className="h-0.5 w-0 group-hover:w-full bg-primary transition-all duration-500 shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
