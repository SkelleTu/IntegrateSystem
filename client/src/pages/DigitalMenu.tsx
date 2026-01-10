import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Category, MenuItem, Ticket } from "@shared/schema";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Utensils, Info, QrCode } from "lucide-react";
import { useState, useEffect } from "react";

const ItemCard = ({ item }: { item: MenuItem }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="h-full"
  >
    <Card className="bg-zinc-900/30 border-zinc-800/50 hover:border-primary/40 transition-all duration-300 overflow-hidden group h-full backdrop-blur-sm">
      <CardContent className="p-0 flex flex-col sm:flex-row h-full">
        <div className="w-full sm:w-44 lg:w-56 h-48 sm:h-full relative overflow-hidden flex-shrink-0 border-b sm:border-b-0 sm:border-r border-zinc-800/50">
          <img 
            src={item.imageUrl} 
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src.startsWith('attached_assets/')) {
                target.src = '/' + target.src;
              }
            }}
          />
        </div>
        <div className="flex-1 p-5 md:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2 sm:gap-4">
              <h3 className="font-black italic text-lg lg:text-2xl text-white uppercase tracking-tighter line-clamp-1 group-hover:text-primary transition-colors">{item.name}</h3>
              <div className="bg-primary/10 px-3 py-1 border border-primary/20 rounded-sm shadow-[0_0_10px_rgba(0,255,102,0.1)]">
                <span className="text-primary font-black text-sm lg:text-base italic">
                  R$ {(item.price / 100).toFixed(2)}
                </span>
              </div>
            </div>
            <p className="text-xs lg:text-sm text-white/60 line-clamp-3 font-medium leading-relaxed mb-4">
              {item.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {item.tags?.map(tag => (
              <span key={tag} className="text-[9px] lg:text-[10px] font-black text-white/40 uppercase tracking-widest border border-zinc-800 px-2 py-0.5 rounded-sm group-hover:border-primary/20 group-hover:text-white/60 transition-colors">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default function DigitalMenu() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: menuItems, isLoading: loadingItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"]
  });

  const { data: categories, isLoading: loadingCats } = useQuery<Category[]>({
    queryKey: ["/api/categories"]
  });

  const bakeryCategories = categories?.filter(c => 
    !c.name.toLowerCase().includes("cabelo") && 
    !c.name.toLowerCase().includes("barba")
  ) || [];

  const [ticketNumber, setTicketNumber] = useState<string>("");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  useEffect(() => {
    const pollInterval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/state"] });
    }, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    const savedTicket = localStorage.getItem("activeTicketNumber");
    if (savedTicket) {
      setTicketNumber(savedTicket);
      const verify = async () => {
        try {
          const res = await fetch(`/api/tickets/${savedTicket}`);
          if (res.ok) {
            const data = await res.json();
            setTicket(data);
          }
        } catch (e) {}
      };
      verify();
    }
  }, []);

  const handleCreateTicket = async () => {
    setIsCreatingTicket(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: null, status: "pending", items: [] }) 
      });
      if (res.ok) {
        const data = await res.json();
        setTicket(data);
        localStorage.setItem("activeTicketNumber", data.ticketNumber.toString());
        toast({
          title: "Comanda Gerada",
          description: `Sua comanda é a #${data.ticketNumber}`,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao gerar comanda.",
      });
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const verifyTicket = async () => {
    if (!ticketNumber) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/tickets/${ticketNumber}`);
      if (res.ok) {
        const data = await res.json();
        setTicket(data);
        toast({
          title: "Comanda vinculada",
          description: `Comanda #${ticketNumber} encontrada.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Comanda não encontrada. Verifique o número.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao conectar com o servidor.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (loadingItems || loadingCats) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col selection:bg-primary selection:text-black">
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <header className="max-w-[1800px] w-full mx-auto p-5 md:p-10 flex flex-col sm:flex-row items-center justify-between z-10 gap-6">
        <div className="flex items-center gap-4 md:gap-8">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation("/")}
            className="text-white hover:text-primary transition-all rounded-full hover:bg-primary/5 w-12 h-12"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white uppercase leading-none">
              BAKE<span className="text-primary">RY</span>
            </h1>
            <div className="h-1 w-12 bg-primary/40 mt-1 shadow-[0_0_10px_rgba(0,255,102,0.3)]" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          {!ticket ? (
            <div className="flex flex-col xs:flex-row items-center gap-3">
              <Button 
                onClick={handleCreateTicket}
                disabled={isCreatingTicket}
                className="h-12 px-8 bg-primary text-black font-black italic uppercase text-xs md:text-sm hover:bg-white transition-all shadow-[0_0_20px_rgba(0,255,102,0.2)] rounded-sm"
              >
                {isCreatingTicket ? <Loader2 className="h-5 w-5 animate-spin" /> : "Gerar Comanda Digital"}
              </Button>
              <div className="flex items-center gap-2 bg-zinc-900/50 p-1.5 pl-4 border border-zinc-800 rounded-sm backdrop-blur-md">
                <Input
                  placeholder="Nº Comanda"
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  className="w-24 h-9 bg-transparent border-0 focus-visible:ring-0 text-sm font-black text-white italic"
                />
                <Button 
                  size="sm" 
                  onClick={verifyTicket}
                  disabled={isVerifying}
                  className="h-9 px-4 font-black italic uppercase text-[10px] text-black bg-primary/80 hover:bg-primary rounded-sm transition-all"
                >
                  {isVerifying ? <Loader2 className="h-3 w-3 animate-spin" /> : "Vincular"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-primary/10 px-5 py-2.5 border border-primary/20 rounded-sm shadow-[0_0_15px_rgba(0,255,102,0.1)]">
              <QrCode className="h-5 w-5 text-primary" />
              <span className="text-sm font-black uppercase italic tracking-tighter text-white">Comanda Digital #{ticket.ticketNumber}</span>
            </div>
          )}
          <div className="hidden lg:block ml-4 border-l border-zinc-800 pl-6">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Artesanal & Premium Experience</p>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] w-full mx-auto px-5 md:px-10 pb-24 z-10 flex-1">
        <div className="space-y-16 md:space-y-24">
          {bakeryCategories.map((category) => {
            const items = menuItems?.filter(item => 
              Number(item.categoryId) === Number(category.id)
            ) || [];

            if (items.length === 0) return null;

            return (
              <section key={category.id} className="space-y-10">
                <div className="flex items-center justify-between gap-6">
                  <h2 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter text-white border-l-4 border-primary pl-5">
                    {category.name}
                  </h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent hidden sm:block" />
                  <span className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">{items.length} OPÇÕES</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 md:gap-8">
                  <AnimatePresence mode="popLayout">
                    {items.map((item) => (
                      <ItemCard key={item.id} item={item} />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            );
          })}
        </div>
      </main>
      
      <footer className="w-full p-10 text-center border-t border-zinc-900 z-10">
        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Premium Digital Menu System v2.0</p>
      </footer>
    </div>
  );
}
