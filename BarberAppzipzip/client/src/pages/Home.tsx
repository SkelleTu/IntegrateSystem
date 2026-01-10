import { useLocation } from "wouter";
import { Scissors, Croissant, UtensilsCrossed, ClipboardList, Clock, Star, Shield, ArrowRight, Landmark, BarChart3, Search, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { MenuItem, Category } from "@shared/schema";
import { NeonCard } from "@/components/NeonCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

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

  const { data: menuItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"]
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"]
  });

  const barberItems = menuItems?.filter(item => {
    const cat = categories?.find(c => c.id === item.categoryId);
    return cat?.name.toLowerCase().includes("cabelo") || cat?.name.toLowerCase().includes("barba");
  }) || [];

  const isFinanceLocked = user?.role !== "admin";
  const isInventoryLocked = user?.role !== "admin";

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center p-4 md:p-8 lg:p-12 relative overflow-x-hidden font-body max-w-[2560px] mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center z-10 mb-8 md:mb-24 mt-4 md:mt-12"
      >
        <div className="inline-block px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-md mb-4 md:mb-8">
          <p className="text-primary text-[8px] md:text-xs tracking-[0.4em] font-bold uppercase">
            Plataforma Multi-Serviços
          </p>
        </div>
        <h1 className="text-3xl sm:text-6xl md:text-8xl lg:text-9xl xl:text-[12rem] font-black mb-4 md:mb-6 tracking-tighter text-white italic leading-none uppercase">
          BEM-VINDO
        </h1>
        <p className="text-white/60 text-xs sm:text-base md:text-xl font-medium tracking-tight opacity-90 max-w-lg mx-auto leading-relaxed px-4">
          Selecione o estabelecimento para iniciar seu atendimento personalizado.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-10 w-full max-w-[2200px] z-10 mb-12 md:mb-20 px-2 md:px-4 auto-rows-fr">
        <motion.div
          whileHover={{ y: -8, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleNavigation("/barber-queue")}
          className="group relative h-full flex"
        >
          <div className="absolute -inset-1 bg-gradient-to-b from-primary/10 to-transparent rounded-[1.5rem] md:rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition duration-700" />
          <div className="relative bg-white/15 backdrop-blur-[4px] rounded-[1.5rem] md:rounded-[2rem] p-4 sm:p-6 md:p-16 flex flex-col items-center text-center cursor-pointer border border-white/20 hover:border-primary/40 transition-all duration-700 w-full h-full justify-center shadow-none">
            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-32 md:h-32 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center mb-4 md:mb-8 group-hover:bg-primary/10 group-hover:border-primary/40 transition-all duration-500 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <Scissors className="w-6 h-6 sm:w-8 sm:h-8 md:w-16 md:h-16 text-primary" strokeWidth={1.2} />
            </div>
            <h2 className="text-lg sm:text-xl md:text-5xl font-black text-white mb-2 md:mb-4 uppercase tracking-tighter italic">Barbearia</h2>
            <div className="h-0.5 sm:h-1 w-8 sm:w-10 md:w-12 bg-primary/30 rounded-full mb-3 md:mb-6 group-hover:w-20 group-hover:bg-primary transition-all duration-500" />
            <p className="text-[8px] sm:text-[10px] md:text-base opacity-60 font-medium text-white">Corte, Barba & Estilo Premium</p>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -8, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleNavigation("/menu?type=bakery")}
          className="group relative h-full flex"
        >
          <div className="absolute -inset-1 bg-gradient-to-b from-primary/10 to-transparent rounded-[1.5rem] md:rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition duration-700" />
          <div className="relative bg-white/15 backdrop-blur-[4px] rounded-[1.5rem] md:rounded-[2rem] p-4 sm:p-6 md:p-16 flex flex-col items-center text-center cursor-pointer border border-white/20 hover:border-primary/40 transition-all duration-700 w-full h-full justify-center shadow-none">
            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-32 md:h-32 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center mb-4 md:mb-8 group-hover:bg-primary/10 group-hover:border-primary/40 transition-all duration-500 shadow-[0_0_30px_rgba(var(--primary),0.1)]">
              <Croissant className="w-6 h-6 sm:w-8 sm:h-8 md:w-16 md:h-16 text-primary" strokeWidth={1.2} />
            </div>
            <h2 className="text-lg sm:text-xl md:text-5xl font-black text-white mb-2 md:mb-4 uppercase tracking-tighter italic">Padaria</h2>
            <div className="h-0.5 sm:h-1 w-8 sm:w-10 md:w-12 bg-primary/30 rounded-full mb-3 md:mb-6 group-hover:w-20 group-hover:bg-primary transition-all duration-500" />
            <p className="text-[8px] sm:text-[10px] md:text-base opacity-60 font-medium text-white">Sabor, Tradição & Confeitaria</p>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -8, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleNavigation("/caixa")}
          className="group relative h-full flex"
        >
          <div className="absolute -inset-1 bg-gradient-to-b from-primary/10 to-transparent rounded-[1.5rem] md:rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition duration-700" />
          <div className="relative bg-white/15 backdrop-blur-[4px] rounded-[1.5rem] md:rounded-[2rem] p-4 sm:p-6 md:p-16 flex flex-col items-center text-center cursor-pointer border border-white/20 hover:border-primary/40 transition-all duration-700 w-full h-full justify-center shadow-none">
            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-32 md:h-32 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center mb-4 md:mb-8 group-hover:bg-primary/10 group-hover:border-primary/40 transition-all duration-500 shadow-[0_0_30px_rgba(var(--primary),0.1)]">
              <ClipboardList className="w-6 h-6 sm:w-8 sm:h-8 md:w-16 md:h-16 text-primary" strokeWidth={1.2} />
            </div>
            <h2 className="text-lg sm:text-xl md:text-5xl font-black text-white mb-2 md:mb-4 uppercase tracking-tighter italic">Caixa</h2>
            <div className="h-0.5 sm:h-1 w-8 sm:w-10 md:w-12 bg-primary/30 rounded-full mb-3 md:mb-6 group-hover:w-20 group-hover:bg-primary transition-all duration-500" />
            <p className="text-[8px] sm:text-[10px] md:text-base opacity-60 font-medium text-white">Gestão & Vendas</p>
          </div>
        </motion.div>

        <motion.div
          whileHover={isFinanceLocked ? {} : { y: -8, scale: 1.02 }}
          whileTap={isFinanceLocked ? {} : { scale: 0.98 }}
          onClick={() => handleNavigation("/financeiro", true)}
          className={`group relative h-full flex ${isFinanceLocked ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
        >
          <div className="absolute -inset-1 bg-gradient-to-b from-primary/20 to-transparent rounded-[1.5rem] md:rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition duration-500" />
          <div className={`relative bg-white/15 backdrop-blur-[4px] rounded-[1.5rem] md:rounded-[2rem] p-4 sm:p-6 md:p-16 flex flex-col items-center text-center border border-white/20 transition-all duration-500 w-full h-full justify-center shadow-none ${isFinanceLocked ? "" : "cursor-pointer hover:border-primary/50"}`}>
            {isFinanceLocked && <Lock className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6 text-white/40" />}
            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-32 md:h-32 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center mb-4 md:mb-8 group-hover:bg-primary/10 group-hover:border-primary/40 transition-all duration-500 shadow-[0_0_30px_rgba(var(--primary),0.1)]">
              <Landmark className="w-6 h-6 sm:w-8 sm:h-8 md:w-16 md:h-16 text-primary" strokeWidth={1.2} />
            </div>
            <h2 className="text-lg sm:text-xl md:text-5xl font-black text-white mb-2 md:mb-4 uppercase tracking-tighter italic">Financeiro</h2>
            <div className="h-0.5 sm:h-1 w-8 sm:w-10 md:w-12 bg-primary/30 rounded-full mb-3 md:mb-6 group-hover:w-20 group-hover:bg-primary transition-all duration-500" />
            <p className="text-[8px] sm:text-[10px] md:text-base opacity-60 font-medium text-white">Controle de Gastos</p>
          </div>
        </motion.div>

        <motion.div
          whileHover={isInventoryLocked ? {} : { y: -8, scale: 1.02 }}
          whileTap={isInventoryLocked ? {} : { scale: 0.98 }}
          onClick={() => handleNavigation("/inventory", true)}
          className={`group relative h-full flex ${isInventoryLocked ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
        >
          <div className="absolute -inset-1 bg-gradient-to-b from-primary/20 to-transparent rounded-[1.5rem] md:rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition duration-500" />
          <div className={`relative bg-white/15 backdrop-blur-[4px] rounded-[1.5rem] md:rounded-[2rem] p-4 sm:p-6 md:p-16 flex flex-col items-center text-center border border-white/20 transition-all duration-500 w-full h-full justify-center shadow-none ${isInventoryLocked ? "" : "cursor-pointer hover:border-primary/50"}`}>
            {isInventoryLocked && <Lock className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6 text-white/40" />}
            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-32 md:h-32 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center mb-4 md:mb-8 group-hover:bg-primary/10 group-hover:border-primary/40 transition-all duration-500 shadow-[0_0_30px_rgba(var(--primary),0.1)]">
              <Search className="w-6 h-6 sm:w-8 sm:h-8 md:w-16 md:h-16 text-primary" strokeWidth={1.2} />
            </div>
            <h2 className="text-lg sm:text-xl md:text-5xl font-black text-white mb-2 md:mb-4 uppercase tracking-tighter italic">Estoque</h2>
            <div className="h-0.5 sm:h-1 w-8 sm:w-10 md:w-12 bg-primary/30 rounded-full mb-3 md:mb-6 group-hover:w-20 group-hover:bg-primary transition-all duration-500" />
            <p className="text-[8px] sm:text-[10px] md:text-base opacity-60 font-medium text-white">Gestão de Mercadorias</p>
          </div>
        </motion.div>
      </div>

      {/* Benefits Section */}
      <section className="w-full max-w-7xl z-10 grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12 py-16 border-y border-white/5 mb-20 px-4">
        <div className="text-center">
          <Clock className="w-10 h-10 md:w-14 md:h-14 text-primary mx-auto mb-6" strokeWidth={1.5} />
          <h3 className="text-lg md:text-xl font-black text-white uppercase mb-2 italic">Sem Filas</h3>
          <p className="text-white/60 text-sm md:text-base font-medium">Gerencie seu tempo com nossa fila virtual inteligente.</p>
        </div>
        <div className="text-center">
          <Star className="w-10 h-10 md:w-14 md:h-14 text-primary mx-auto mb-6" strokeWidth={1.5} />
          <h3 className="text-lg md:text-xl font-black text-white uppercase mb-2 italic">Qualidade Premium</h3>
          <p className="text-white/60 text-sm md:text-base font-medium">Profissionais qualificados e produtos de elite.</p>
        </div>
        <div className="text-center">
          <Shield className="w-10 h-10 md:w-14 md:h-14 text-primary mx-auto mb-6" strokeWidth={1.5} />
          <h3 className="text-lg md:text-xl font-black text-white uppercase mb-2 italic">Tradição</h3>
          <p className="text-white/60 text-sm md:text-base font-medium">O ambiente clássico com tecnologia moderna.</p>
        </div>
      </section>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-[10px] md:text-xs tracking-[0.4em] text-white/40 uppercase font-black opacity-30 mt-auto pb-8"
      >
        Premium System v2.0
      </motion.div>
    </div>
  );
}
