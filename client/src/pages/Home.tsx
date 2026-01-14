import { useLocation, Link } from "wouter";
import { Scissors, Croissant, ClipboardList, Landmark, Search, Lock, Clock, Star, Shield, Menu, X, LogIn, UserPlus, Info, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { MenuItem, Category } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavigation = (url: string, adminOnly?: boolean) => {
    if (!user) {
      setLocation("/login");
      return;
    }
    if (adminOnly && user?.role !== "admin") {
      toast({
        title: "Acesso Negado",
        description: "Esta funcionalidade é restrita ao proprietário.",
        variant: "destructive",
      });
      return;
    }
    setLocation(url);
  };

  const menuItemsList = [
    { label: "Home", href: "/", icon: Info },
    { label: "Serviços", href: "#services", icon: Scissors },
    { label: "Contato", href: "#contact", icon: Phone },
  ];

  const authOptions = user ? [
    { label: "Sair", onClick: () => (logoutMutation as any).mutate(), icon: X, variant: "ghost" as const }
  ] : [
    { label: "Entrar", href: "/login", icon: LogIn, variant: "ghost" as const },
    { label: "Assinar", href: "/register-institution", icon: UserPlus, variant: "default" as const }
  ];

  const menuItemsQuery = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"]
  });

  const categoriesQuery = useQuery<Category[]>({
    queryKey: ["/api/categories"]
  });

  const isFinanceLocked = user?.role !== "admin";
  const isInventoryLocked = user?.role !== "admin";

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center p-4 md:p-8 lg:p-12 relative overflow-x-hidden font-body max-w-[2560px] mx-auto">
      {/* Header with Hamburger Menu */}
      <header className="w-full max-w-7xl z-50 flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.4)]">
            <span className="text-black font-black text-xl italic">A</span>
          </div>
          <span className="text-white font-black tracking-tighter italic text-xl">AURA</span>
        </div>

        {/* Combined Nav for Mobile and Desktop */}
        <div className="flex items-center gap-4">
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {menuItemsList.map((item) => (
              <Link key={item.label} href={item.href}>
                <a className="text-white/60 hover:text-primary transition-colors font-medium text-sm uppercase tracking-widest">{item.label}</a>
              </Link>
            ))}
            <div className="h-4 w-[1px] bg-white/10 mx-2" />
            {authOptions.map((opt) => (
              'href' in opt ? (
                <Link key={opt.label} href={opt.href}>
                  <Button variant={opt.variant} size="sm" className="font-bold uppercase tracking-widest text-[10px]">
                    {opt.label}
                  </Button>
                </Link>
              ) : (
                <Button key={opt.label} variant={opt.variant} size="sm" onClick={opt.onClick} className="font-bold uppercase tracking-widest text-[10px]">
                  {opt.label}
                </Button>
              )
            ))}
          </nav>

          {/* Mobile Action Section: Assinar Button + Hamburger Toggle */}
          <div className="flex md:hidden items-center gap-2">
            {!user && (
              <Link href="/register-institution">
                <Button variant="default" size="sm" className="font-bold uppercase tracking-widest text-[10px] h-9 px-4">
                  Assinar
                </Button>
              </Link>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white h-9 w-9 flex items-center justify-center" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl md:hidden flex flex-col p-8 pt-24 gap-8"
          >
            <div className="flex flex-col gap-6">
              <p className="text-primary text-[10px] tracking-[0.4em] font-bold uppercase mb-2">Navegação</p>
              {menuItemsList.map((item) => (
                <Link key={item.label} href={item.href}>
                  <a 
                    className="text-2xl font-black text-white italic flex items-center gap-4 group"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <item.icon className="text-primary group-hover:scale-110 transition-transform" />
                    {item.label}
                  </a>
                </Link>
              ))}
            </div>

            <div className="h-[1px] w-full bg-white/5" />

            <div className="flex flex-col gap-4">
              <p className="text-primary text-[10px] tracking-[0.4em] font-bold uppercase mb-2">Conta</p>
              {authOptions.map((opt) => (
                'href' in opt ? (
                  <Link key={opt.label} href={opt.href}>
                    <Button 
                      variant={opt.variant} 
                      className="w-full justify-start text-xl font-black italic h-14 px-6 gap-4"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <opt.icon className="w-6 h-6" />
                      {opt.label}
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    key={opt.label} 
                    variant={opt.variant} 
                    className="w-full justify-start text-xl font-black italic h-14 px-6 gap-4"
                    onClick={() => {
                      opt.onClick?.();
                      setIsMenuOpen(false);
                    }}
                  >
                    <opt.icon className="w-6 h-6" />
                    {opt.label}
                  </Button>
                )
              ))}
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-6 right-6 text-white h-10 w-10"
              onClick={() => setIsMenuOpen(false)}
            >
              <X className="w-8 h-8" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center z-10 mb-8 md:mb-16 mt-4 md:mt-8"
      >
        <div className="inline-block px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-md mb-4 md:mb-6">
          <p className="text-primary text-[10px] md:text-xs tracking-[0.4em] font-bold uppercase">
            Plataforma Multi-Serviços
          </p>
        </div>
        <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black mb-4 tracking-tighter text-white italic leading-none uppercase">
          BEM-VINDO
        </h1>
        <p className="text-white/60 text-sm sm:text-base md:text-lg font-medium tracking-tight opacity-90 max-w-lg mx-auto leading-relaxed px-4">
          Selecione o estabelecimento para iniciar seu atendimento personalizado.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 w-full max-w-[2200px] z-10 mb-12 md:mb-20 px-2 auto-rows-fr">
        {[
          { id: 'barber', title: 'Barbearia', icon: Scissors, path: '/barber-queue', desc: 'Corte, Barba & Estilo Premium', locked: false },
          { id: 'bakery', title: 'Padaria', icon: Croissant, path: '/menu?type=bakery', desc: 'Sabor, Tradição & Confeitaria', locked: false },
          { id: 'caixa', title: 'Caixa', icon: ClipboardList, path: '/caixa', desc: 'Gestão & Vendas', locked: false },
          { id: 'financeiro', title: 'Financeiro', icon: Landmark, path: '/financeiro', desc: 'Controle de Gastos', locked: isFinanceLocked, admin: true },
          { id: 'estoque', title: 'Estoque', icon: Search, path: '/inventory', desc: 'Gestão de Mercadorias', locked: isInventoryLocked, admin: true }
        ].map((item) => (
          <motion.div
            key={item.id}
            whileHover={item.locked ? {} : { y: -5, scale: 1.02 }}
            whileTap={item.locked ? {} : { scale: 0.98 }}
            onClick={() => handleNavigation(item.path, item.admin)}
            className={`group relative h-full flex ${item.locked ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
          >
            <div className="absolute -inset-1 bg-gradient-to-b from-primary/10 to-transparent rounded-[1.5rem] blur-xl opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className={`relative bg-white/10 backdrop-blur-xl rounded-[1.5rem] p-6 md:p-8 flex flex-col items-center text-center border border-white/10 transition-all duration-500 w-full h-full justify-center shadow-none ${item.locked ? "" : "cursor-pointer hover:border-primary/40"}`}>
              {item.locked && <Lock className="absolute top-4 right-4 w-4 h-4 text-white/40" />}
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:border-primary/40 transition-all duration-500 shadow-[0_0_20px_rgba(var(--primary),0.1)]">
                <item.icon className="w-8 h-8 md:w-10 md:h-10 text-primary" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white mb-2 uppercase tracking-tighter italic">{item.title}</h2>
              <div className="h-1 w-10 bg-primary/30 rounded-full mb-3 group-hover:w-16 group-hover:bg-primary transition-all duration-500" />
              <p className="text-xs md:text-sm opacity-60 font-medium text-white leading-tight">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <section className="w-full max-w-7xl z-10 grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12 py-12 border-y border-white/5 mb-16 px-4">
        {[
          { icon: Clock, title: 'Sem Filas', desc: 'Gerencie seu tempo com nossa fila virtual inteligente.' },
          { icon: Star, title: 'Qualidade Premium', desc: 'Profissionais qualificados e produtos de elite.' },
          { icon: Shield, title: 'Tradição', desc: 'O ambiente clássico com tecnologia moderna.' }
        ].map((benefit, i) => (
          <div key={i} className="text-center">
            <benefit.icon className="w-10 h-10 md:w-12 md:h-12 text-primary mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="text-lg md:text-xl font-black text-white uppercase mb-2 italic">{benefit.title}</h3>
            <p className="text-white/60 text-xs md:text-sm font-medium">{benefit.desc}</p>
          </div>
        ))}
      </section>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-[10px] md:text-xs tracking-[0.4em] text-white/40 uppercase font-black opacity-30 pb-8"
      >
        Aura Premium System v2.0
      </motion.div>
    </div>
  );
}
