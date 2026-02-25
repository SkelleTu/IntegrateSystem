import { useLocation } from "wouter";
import { Scissors, User, UserCheck, ShieldCheck, ArrowLeft, ChevronLeft, ChevronRight, Search, Plus, Trash2, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Ticket, MenuItem } from "@shared/schema";

export default function BarberHome() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [searchTicket, setSearchTicket] = useState("");
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);

  const { data: menuItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"]
  });

  const { data: queueState } = useQuery<any>({
    queryKey: ["/api/queue/state"]
  });

  const updateTicketItems = useMutation({
    mutationFn: async ({ ticketId, items }: { ticketId: number, items: string[] }) => {
      const res = await apiRequest("POST", `/api/tickets/${ticketId}/items`, { items });
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentTicket(data);
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Comanda Atualizada" });
    }
  });

  const fetchTicket = async (number: number) => {
    try {
      const res = await fetch(`/api/tickets/${number}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentTicket(data);
      } else {
        setCurrentTicket(null);
      }
    } catch (e) {
      setCurrentTicket(null);
    }
  };

  useEffect(() => {
    const pollInterval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue/state"] });
      if (currentTicket) {
        fetchTicket(currentTicket.ticketNumber);
      }
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [currentTicket]);

  useEffect(() => {
    if (queueState?.servingNumber) {
      fetchTicket(queueState.servingNumber);
    }
  }, [queueState?.servingNumber]);

  const handleSearch = () => {
    if (searchTicket) {
      fetchTicket(Number(searchTicket));
    }
  };

  const navigateQueue = async (direction: 'next' | 'prev') => {
    const endpoint = direction === 'next' ? "/api/queue/next" : "/api/queue/prev";
    const res = await apiRequest("POST", endpoint);
    const newState = await res.json();
    queryClient.setQueryData(["/api/queue/state"], newState);
    fetchTicket(newState.servingNumber);
  };

  const addItemToTicket = (item: MenuItem) => {
    if (!currentTicket) return;
    const items = [...(currentTicket.items || []), JSON.stringify({ id: item.id, name: item.name, price: item.price })];
    updateTicketItems.mutate({ ticketId: currentTicket.id, items });
  };

  const removeItemFromTicket = (index: number) => {
    if (!currentTicket || !currentTicket.items) return;
    const items = [...currentTicket.items];
    items.splice(index, 1);
    updateTicketItems.mutate({ ticketId: currentTicket.id, items });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center pt-10 px-6 relative overflow-hidden font-body">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[50%] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08)_0%,transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-6xl flex items-center justify-between mb-8 z-20">
        <button 
          onClick={() => setLocation("/app")}
          className="flex items-center gap-2 text-white/60 hover:text-primary transition-colors group"
        >
          <div className="p-2 rounded-full glass group-hover:bg-primary/10 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span className="font-medium uppercase tracking-widest text-xs">Voltar</span>
        </button>

        <div className="flex items-center gap-4 bg-zinc-900/50 p-2 border border-zinc-800 rounded-2xl backdrop-blur-md">
          <div className="flex items-center gap-1 border-r border-zinc-800 pr-2">
            <Button variant="ghost" size="icon" onClick={() => navigateQueue('prev')} className="h-8 w-8 text-zinc-400">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 flex flex-col items-center justify-center">
               <span className="text-[10px] text-zinc-500 uppercase font-black">Chamando</span>
               <span className="text-xl font-black text-primary">{queueState?.servingNumber || 0}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigateQueue('next')} className="h-8 w-8 text-zinc-400">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar Nº..."
              value={searchTicket}
              onChange={(e) => setSearchTicket(e.target.value)}
              className="w-24 h-8 bg-transparent border-0 focus-visible:ring-0 text-xs font-bold"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button size="icon" variant="ghost" onClick={handleSearch} className="h-8 w-8 text-primary">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-6xl z-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/12 p-6 rounded-3xl border-white/15">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">Detalhes da Comanda</h2>
              {currentTicket && (
                <div className="bg-primary/20 px-4 py-1 border border-primary/30 rounded-full">
                  <span className="text-xs font-black text-primary uppercase">#{currentTicket.ticketNumber}</span>
                </div>
              )}
            </div>

            {currentTicket ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                   <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Scissors className="w-6 h-6 text-primary" />
                   </div>
                   <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Serviço Solicitado</p>
                      <p className="text-white font-black italic uppercase">
                        {menuItems?.find(m => m.id === currentTicket.serviceId)?.name || "Nenhum serviço pré-selecionado"}
                      </p>
                   </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold px-1">Itens Adicionados</p>
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {currentTicket.items && currentTicket.items.length > 0 ? (
                      currentTicket.items.map((itemStr, idx) => {
                        const item = JSON.parse(itemStr);
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                            <span className="text-sm font-medium text-white">{item.name}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-bold text-primary">R$ {(item.price/100).toFixed(2)}</span>
                              <Button variant="ghost" size="icon" onClick={() => removeItemFromTicket(idx)} className="h-8 w-8 text-zinc-500 hover:text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-10 text-zinc-600 italic text-sm">Nenhum item adicionado</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-zinc-500">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Nenhuma comanda ativa selecionada</p>
              </div>
            )}
          </div>

          <div className="bg-white/12 p-6 rounded-3xl border-white/15">
            <h2 className="text-xl font-black italic uppercase text-white tracking-tighter mb-4">Adicionar Produtos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
               {menuItems?.slice(0, 15).map(item => (
                 <Button 
                   key={item.id} 
                   variant="outline" 
                   onClick={() => addItemToTicket(item)}
                   className="h-auto flex flex-col items-center justify-center p-3 bg-zinc-900/40 border-zinc-800 hover:border-primary/50 group text-center relative rounded-2xl min-h-[100px]"
                 >
                   <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                     {item.name.toLowerCase().includes('corte') || item.name.toLowerCase().includes('barba') ? <Scissors className="w-5 h-5 text-zinc-400 group-hover:text-primary" /> : 
                      item.name.toLowerCase().includes('cafe') || item.name.toLowerCase().includes('latte') || item.name.toLowerCase().includes('capuccino') ? <ShoppingBag className="w-5 h-5 text-zinc-400 group-hover:text-primary" /> :
                      <Plus className="w-5 h-5 text-zinc-400 group-hover:text-primary" />}
                   </div>
                   <span className="text-[11px] font-bold uppercase text-zinc-100 group-hover:text-primary transition-colors leading-tight line-clamp-2 px-1">{item.name}</span>
                   <span className="text-[10px] text-primary font-black mt-1">R$ {(item.price/100).toFixed(2)}</span>
                   <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Plus className="w-3 h-3 text-primary" />
                   </div>
                 </Button>
               ))}
            </div>
            <Button variant="ghost" className="text-primary text-xs font-bold mt-4" onClick={() => setLocation("/barber-queue")}>Ver Todos os Serviços</Button>
          </div>
        </div>

        <div className="space-y-6">
             <div 
               onClick={() => setLocation("/barber-queue")}
               className="bg-white/12 hover:bg-white/20 transition-all duration-500 rounded-3xl p-8 flex flex-col items-center text-center cursor-pointer group border-white/15"
             >
             <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
               <User className="w-8 h-8 text-primary" strokeWidth={1.5} />
             </div>
             <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Novo Cliente</h2>
             <p className="text-white/60 text-sm opacity-70">Emitir senha e escolher serviço</p>
           </div>
           
           <div className="bg-white/12 p-6 rounded-3xl border-white/15">
              <h3 className="text-sm font-black uppercase text-white/40 mb-4 tracking-widest">Acesso Rápido</h3>
              <div className="space-y-2">
                 <Button onClick={() => setLocation("/login?role=barber")} variant="ghost" className="w-full justify-start gap-3 text-white/60 hover:text-primary rounded-xl">
                   <UserCheck className="w-4 h-4" /> <span>Login Barbeiro</span>
                 </Button>
                 <Button onClick={() => setLocation("/login?role=admin")} variant="ghost" className="w-full justify-start gap-3 text-white/60 hover:text-primary rounded-xl">
                   <ShieldCheck className="w-4 h-4" /> <span>Dashboard Admin</span>
                 </Button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
