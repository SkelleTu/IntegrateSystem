import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, ArrowLeft, Scissors, Eraser } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import type { Service, Category, MenuItem } from "@shared/schema";
import { useLocation } from "wouter";

const ServiceGrid = ({ services, categories, onSelect }: { services: MenuItem[], categories: Category[], onSelect: (s: MenuItem) => void }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8 w-full max-w-[2000px]">
      {services.map((service) => {
        const category = categories.find(c => Number(c.id) === Number(service.categoryId));
        return (
          <motion.div
            key={service.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-full"
          >
            <Card 
              className="bg-zinc-900/80 border-zinc-800 hover:border-primary/50 transition-all cursor-pointer group h-full flex flex-col overflow-hidden relative shadow-2xl"
              onClick={() => onSelect(service)}
            >
              <div className="h-56 md:h-72 w-full relative">
                <img 
                  src={service.imageUrl} 
                  alt={service.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-all duration-1000"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src.startsWith('attached_assets/')) {
                      target.src = '/' + target.src;
                    }
                  }}
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                <div className="absolute top-5 right-5 bg-primary/20 backdrop-blur-xl px-4 py-1.5 rounded-full border border-primary/30 shadow-[0_0_15px_rgba(0,255,102,0.2)]">
                  <span className="text-[10px] font-black text-primary uppercase tracking-tighter italic">
                    {category?.name || "Serviço"}
                  </span>
                </div>
              </div>
              <CardContent className="p-6 md:p-8 flex-1 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-2xl md:text-3xl font-black italic text-white group-hover:text-primary transition-colors tracking-tighter uppercase mb-2 leading-none">
                    {service.name}
                  </h3>
                  <p className="text-xs md:text-sm text-white/60 line-clamp-3 mb-4 font-medium leading-relaxed">{service.description}</p>
                  <div className="h-1 w-10 bg-primary/40 group-hover:w-20 group-hover:bg-primary transition-all duration-500" />
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Investimento</span>
                    <span className="text-2xl font-black text-white italic tracking-tighter">
                      R$ {(service.price / 100).toFixed(2)}
                    </span>
                  </div>
                  <Button size="lg" className="bg-white text-black hover:bg-primary hover:text-black font-black italic px-8 rounded-none skew-x-[-12deg] transition-all shadow-xl">
                    RESERVAR
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};

export default function BarberQueue() {
  const [, setLocation] = useLocation();
  const [selectedService, setSelectedService] = useState<MenuItem | null>(null);
  const [ticketResult, setTicketResult] = useState<{ number: number } | null>(null);
  const [showQueue, setShowQueue] = useState(false);

  const { data: menuItems, isLoading: loadingItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"]
  });
  
  const { data: categories, isLoading: loadingCats } = useQuery<Category[]>({
    queryKey: ["/api/categories"]
  });

  const createTicket = useMutation({
    mutationFn: async (serviceId: number) => {
      const res = await apiRequest("POST", "/api/tickets", { serviceId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    }
  });

  useEffect(() => {
    if (ticketResult) {
      const timer = setTimeout(() => {
        setTicketResult(null);
        setLocation("/app");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [ticketResult, setLocation]);

  const barberServices = useMemo(() => {
    if (!menuItems || !categories) return [];
    return menuItems.filter(item => {
      const cat = categories.find(c => Number(c.id) === Number(item.categoryId));
      const catName = cat?.name.toLowerCase() || "";
      return catName.includes("corte") || catName.includes("cabelo") || catName.includes("barba");
    });
  }, [menuItems, categories]);

  const handleConfirm = async () => {
    if (!selectedService) return;
    try {
      const ticket = await createTicket.mutateAsync(selectedService.id);
      setTicketResult({ number: ticket.ticketNumber });
      setSelectedService(null);
      new Audio("https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3").play().catch(() => {});
    } catch (error) {
      console.error(error);
    }
  };

  if (loadingItems || loadingCats) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!showQueue && !ticketResult) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 sm:p-8 selection:bg-primary selection:text-black">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 md:p-20 rounded-[3rem] border-white/10 flex flex-col items-center text-center max-w-2xl w-full shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          <div className="w-24 h-24 md:w-40 md:h-40 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center mb-10 shadow-[0_0_50px_rgba(0,255,102,0.1)] group transition-all duration-700 hover:bg-primary/10">
            <Scissors className="w-12 h-12 md:w-20 md:h-20 text-primary transition-transform duration-700 group-hover:rotate-12" strokeWidth={1} />
          </div>
          <h1 className="text-4xl md:text-7xl font-black italic text-white uppercase tracking-tighter mb-4 leading-none">
            SKELLE<span className="text-primary">TU</span> BARBER
          </h1>
          <p className="text-white/90 font-bold uppercase tracking-[0.3em] text-[10px] md:text-xs mb-12 max-w-xs leading-relaxed opacity-100">Elevando seu estilo com tecnologia & tradição</p>
          <Button 
            onClick={() => setShowQueue(true)}
            className="w-full bg-primary text-black hover:bg-white transition-all font-black italic py-10 md:py-14 text-2xl md:text-4xl rounded-none skew-x-[-12deg] shadow-[0_15px_60px_rgba(0,255,102,0.25)] tracking-tighter uppercase"
          >
            INICIAR CHECK-IN
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/app")}
            className="mt-10 text-white/40 hover:text-primary font-black uppercase tracking-[0.4em] text-[10px] transition-colors"
          >
            VOLTAR AO PAINEL INICIAL
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center selection:bg-primary selection:text-black">
      <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
      
      <header className="w-full max-w-[2000px] p-6 md:p-12 flex flex-col sm:flex-row items-center justify-between gap-10 z-10 relative">
        <div className="flex items-center gap-6 md:gap-10">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setLocation("/app")}
            className="rounded-none border-zinc-800 hover:border-primary text-zinc-500 hover:text-primary transition-all bg-transparent w-12 h-12"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter text-white leading-none uppercase">
              SKELLE<span className="text-primary">TU</span>
            </h1>
            <p className="text-[10px] md:text-xs tracking-[0.6em] uppercase font-black text-white/40 mt-2">Grooming & Style Experience v2.0</p>
          </div>
        </div>
        <div className="flex flex-col items-end sm:items-end items-center">
          <div className="flex items-center gap-3 bg-primary/10 px-6 py-3 border border-primary/20 shadow-[0_0_20px_rgba(0,255,102,0.1)]">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-black italic tracking-[0.2em] text-primary uppercase">Em Atendimento</span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[2000px] flex-1 flex flex-col px-6 md:px-12 pb-24 z-10">
        <div className="w-full mb-12 flex flex-col sm:flex-row items-start sm:items-end justify-between border-b border-zinc-900 pb-6 gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-4xl font-black italic text-white uppercase tracking-tighter">Escolha seu Estilo</h2>
            <div className="h-1 w-20 bg-primary/50" />
          </div>
          <span className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">{barberServices.length} OPÇÕES EXCLUSIVAS</span>
        </div>

        <ServiceGrid 
          services={barberServices} 
          categories={categories || []} 
          onSelect={setSelectedService} 
        />
      </main>

      <Dialog open={!!selectedService} onOpenChange={(open) => !open && setSelectedService(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 sm:max-w-lg p-10 md:p-14 rounded-none border-t-4 border-t-primary shadow-[0_0_100px_rgba(0,0,0,0.8)]">
          <DialogHeader className="items-center text-center">
            <div className="w-20 h-20 md:w-28 md:h-28 bg-primary/10 flex items-center justify-center mb-8 border border-primary/20 rotate-45 shadow-[0_0_30px_rgba(0,255,102,0.1)]">
              <Scissors className="w-10 h-10 md:w-14 md:h-14 text-primary -rotate-45" />
            </div>
            <DialogTitle className="text-3xl md:text-5xl font-black italic text-white uppercase tracking-tighter leading-none mb-4">CONFIRMAR<br/>CHECK-IN</DialogTitle>
            <DialogDescription className="text-white/60 text-sm md:text-base font-bold mt-2 uppercase tracking-tight">
              Deseja entrar na fila para <span className="text-primary font-black italic">{selectedService?.name}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 mt-12">
            <Button variant="ghost" className="rounded-none font-black text-white/40 hover:text-white uppercase tracking-widest text-xs h-14" onClick={() => setSelectedService(null)}>CANCELAR</Button>
            <Button className="bg-primary text-black hover:bg-white transition-all font-black italic rounded-none h-14 text-lg shadow-xl" onClick={handleConfirm} disabled={createTicket.isPending}>
              {createTicket.isPending ? <Loader2 className="animate-spin" /> : "CONFIRMAR"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!ticketResult} onOpenChange={(open) => !open && setTicketResult(null)}>
        <DialogContent className="bg-black border-primary sm:max-w-xl p-0 overflow-hidden rounded-none shadow-[0_0_150px_rgba(0,255,102,0.2)]">
          <div className="p-12 md:p-20 flex flex-col items-center relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-primary neon-glow" />
            <div className="w-28 h-28 md:w-40 md:h-40 rounded-none bg-primary flex items-center justify-center mb-12 rotate-45 shadow-[0_0_70px_rgba(0,255,102,0.4)]">
              <CheckCircle2 className="w-14 h-14 md:w-20 md:h-20 text-black -rotate-45" />
            </div>
            <h2 className="text-5xl md:text-7xl font-black italic text-white mb-2 tracking-tighter uppercase leading-none text-center">CHECK-IN<br/>EFETUADO</h2>
            <p className="text-white/40 font-black uppercase tracking-[0.5em] text-[10px] md:text-xs mb-14 text-center">Aguarde sua chamada no painel</p>
            
            <div className="bg-zinc-950 border border-zinc-900 p-12 md:p-16 w-full flex flex-col items-center mb-14 relative overflow-hidden group">
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="text-[10px] md:text-xs text-white/40 uppercase font-black tracking-[0.4em] mb-6 z-10">SENHA DE ATENDIMENTO</p>
              <span className="text-[10rem] md:text-[14rem] font-black text-primary leading-none tracking-tighter z-10 drop-shadow-[0_0_30px_rgba(0,255,102,0.4)]">
                {ticketResult?.number}
              </span>
            </div>
            
            <Button onClick={() => setTicketResult(null)} className="w-full bg-white text-black hover:bg-primary font-black italic py-10 md:py-14 text-2xl md:text-3xl rounded-none transition-all shadow-2xl uppercase tracking-tighter">FINALIZAR E VOLTAR</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
