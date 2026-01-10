import { useQuery, useMutation } from "@tanstack/react-query";
import { MenuItem, Category, Ticket } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Plus, Minus, UserCircle, Loader2 } from "lucide-react";
import { useState } from "react";

export default function ClientCart() {
  const { toast } = useToast();
  const [ticketNumber, setTicketNumber] = useState("");
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [cart, setCart] = useState<{ id: number, name: string, price: number, quantity: number }[]>([]);

  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const findTicketMutation = useMutation({
    mutationFn: async (number: string) => {
      const res = await fetch(`/api/tickets/${number}`);
      if (!res.ok) throw new Error("Comanda não encontrada");
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentTicket(data);
      const initialItems = data.items ? data.items.map((i: string) => JSON.parse(i)) : [];
      setCart(initialItems);
      toast({ title: "Bem-vindo", description: `Comanda #${data.ticketNumber} ativa` });
    },
    onError: () => {
      toast({ title: "Erro", description: "Verifique o número da comanda", variant: "destructive" });
    }
  });

  const updateItemsMutation = useMutation({
    mutationFn: async ({ id, items }: { id: number, items: string[] }) => {
      await apiRequest("POST", `/api/tickets/${id}/items`, { items });
    },
    onSuccess: () => {
      toast({ title: "Carrinho Atualizado", description: "Itens salvos na sua comanda" });
    }
  });

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const saveCart = () => {
    if (!currentTicket) return;
    const items = cart.map(i => JSON.stringify(i));
    updateItemsMutation.mutate({ id: currentTicket.id, items });
  };

  if (!currentTicket) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-950">
        <Card className="w-full max-w-md border-primary/20 bg-zinc-900 shadow-2xl shadow-primary/10">
          <CardHeader className="text-center">
            <UserCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl font-black italic uppercase tracking-tighter text-white">Auto-Atendimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-white/40 tracking-widest">Número da Comanda</label>
              <Input 
                type="number" 
                placeholder="Ex: 123" 
                value={ticketNumber} 
                onChange={e => setTicketNumber(e.target.value)}
                className="bg-black border-white/10 text-white h-12 text-lg text-center font-bold"
              />
            </div>
            <Button 
              className="w-full h-12 font-black italic uppercase tracking-tighter text-lg text-white"
              onClick={() => findTicketMutation.mutate(ticketNumber)}
              disabled={findTicketMutation.isPending}
            >
              {findTicketMutation.isPending ? <Loader2 className="animate-spin" /> : "Iniciar Pedido"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">Escolha seus itens</h1>
            <Badge variant="outline" className="text-primary border-primary">Comanda #{currentTicket.ticketNumber}</Badge>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map(item => (
              <Card key={item.id} className="bg-zinc-900 border-white/5 overflow-hidden group hover:border-primary/50 transition-all">
                <div className="h-32 relative">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-bold uppercase italic text-sm line-clamp-1">{item.name}</h3>
                  <p className="text-primary font-black">R$ {(item.price / 100).toFixed(2)}</p>
                  <Button size="sm" className="w-full text-white" onClick={() => addToCart(item)}>
                    <Plus className="w-4 h-4 mr-1" /> Adicionar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="md:col-span-1">
          <Card className="bg-zinc-900 border-primary/20 sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 italic uppercase tracking-tighter">
                <ShoppingCart className="w-5 h-5 text-primary" /> Seu Carrinho
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-white/40 text-center py-8 italic uppercase text-xs font-bold">Vazio</p>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center border-b border-white/5 pb-3">
                      <div>
                        <p className="font-bold uppercase italic text-xs">{item.name}</p>
                        <p className="text-[10px] text-white/40">{item.quantity}x R$ {(item.price/100).toFixed(2)}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="text-red-500" onClick={() => removeFromCart(item.id)}>
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-white/10 pt-4">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs font-bold uppercase text-white/40 tracking-widest">Total</span>
                  <span className="text-2xl font-black text-primary italic">
                    R$ {(cart.reduce((sum, i) => sum + (i.price * i.quantity), 0) / 100).toFixed(2)}
                  </span>
                </div>
                <Button 
                  className="w-full h-12 font-black italic uppercase tracking-tighter text-white"
                  onClick={saveCart}
                  disabled={updateItemsMutation.isPending}
                >
                  {updateItemsMutation.isPending ? <Loader2 className="animate-spin" /> : "Confirmar Pedido"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
