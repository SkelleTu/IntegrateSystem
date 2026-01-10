import { useState, useMemo } from "react";
import { useServices, useCreateService, useUpdateService, useDeleteService } from "@/hooks/use-services";
import { NeonButton } from "@/components/NeonButton";
import { NeonCard } from "@/components/NeonCard";
import { Plus, Edit2, Trash2, X, ArrowLeft, Loader2, LayoutGrid, List } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertServiceSchema } from "@shared/schema";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

const serviceFormSchema = insertServiceSchema.omit({ id: true });
type ServiceFormData = z.infer<typeof serviceFormSchema>;

export default function Admin() {
  const [, setLocation] = useLocation();
  const { data: services, isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      price: 0,
      imageUrl: "",
      isActive: true,
      categoryId: 1 // Default to first category
    }
  });

  const onSubmit = (data: ServiceFormData) => {
    if (editingId) {
      updateService.mutate({ id: editingId, ...data }, {
        onSuccess: () => {
          setIsDialogOpen(false);
          resetForm();
        }
      });
    } else {
      createService.mutate(data, {
        onSuccess: () => {
          setIsDialogOpen(false);
          resetForm();
        }
      });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    form.reset({
      name: "",
      price: 0,
      imageUrl: "",
      isActive: true,
      categoryId: 1
    });
  };

  const handleEdit = (service: any) => {
    setEditingId(service.id);
    form.reset({
      name: service.name,
      price: service.price,
      imageUrl: service.imageUrl,
      isActive: service.isActive,
      categoryId: service.categoryId
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Deseja realmente excluir este serviço/produto?")) {
      deleteService.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-8 lg:p-12 space-y-8 max-w-[2400px] mx-auto overflow-x-hidden selection:bg-primary selection:text-black">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 bg-zinc-900/40 p-6 md:p-8 rounded-2xl border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:text-primary hover:bg-white/5 w-14 h-14 rounded-full"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="w-8 h-8" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-white text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">Gestão de <span className="text-primary">Serviços</span></h1>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.4em] mt-1">Configuração do Ecossistema v2.0</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'ghost'} 
              size="icon" 
              onClick={() => setViewMode('grid')}
              className="h-10 w-10 rounded-lg"
            >
              <LayoutGrid className="h-5 w-5" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'default' : 'ghost'} 
              size="icon" 
              onClick={() => setViewMode('list')}
              className="h-10 w-10 rounded-lg"
            >
              <List className="h-5 w-5" />
            </Button>
          </div>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-primary hover:bg-white text-black font-black uppercase italic h-12 px-8 rounded-xl shadow-lg transition-all">
            <Plus className="mr-2 w-5 h-5" /> Adicionar Novo
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4 opacity-50">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="font-black uppercase italic tracking-widest text-xs">Sincronizando Dados...</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 md:gap-8" 
            : "flex flex-col gap-4"
          }>
            {services?.map((service) => (
              <motion.div
                key={service.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                {viewMode === 'grid' ? (
                  <NeonCard className="flex flex-col relative group h-full bg-zinc-900/60 border-white/5 hover:border-primary/40 transition-all overflow-hidden rounded-2xl">
                    <div className="aspect-video relative overflow-hidden bg-black">
                      <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                      
                      <div className="absolute top-4 right-4 flex gap-2">
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => handleEdit(service)}
                          className="h-9 w-9 bg-black/80 border-white/10 hover:border-primary text-white hover:text-primary rounded-xl backdrop-blur-md"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => handleDelete(service.id)}
                          className="h-9 w-9 bg-black/80 border-white/10 hover:border-red-500 text-white hover:text-red-500 rounded-xl backdrop-blur-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="p-6 flex flex-col flex-1">
                      <div className="mb-6">
                        <h3 className="text-xl font-black italic text-white uppercase tracking-tighter mb-1 line-clamp-1 group-hover:text-primary transition-colors">{service.name}</h3>
                        <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest px-2 py-0 border-0 ${service.isActive ? 'text-primary' : 'text-zinc-600'}`}>
                          {service.isActive ? 'Ativo na Vitrine' : 'Indisponível'}
                        </Badge>
                      </div>
                      
                      <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-6">
                        <span className="text-2xl font-black text-white italic tracking-tighter">
                          R$ {(service.price / 100).toFixed(2)}
                        </span>
                        <span className="text-[10px] font-black text-zinc-600 uppercase">ID: {service.id}</span>
                      </div>
                    </div>
                  </NeonCard>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-zinc-900/60 border border-white/5 rounded-xl hover:border-primary/40 transition-all group">
                    <div className="flex items-center gap-6">
                      <div className="h-12 w-12 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                        <img src={service.imageUrl} className="h-full w-full object-cover opacity-80" alt="" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-white font-black italic uppercase tracking-tighter">{service.name}</h3>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Preço Sugerido: R$ {(service.price / 100).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className={`text-[9px] font-black uppercase italic ${service.isActive ? 'text-primary border-primary/20' : 'text-zinc-600 border-zinc-800'}`}>
                        {service.isActive ? 'Visível' : 'Oculto'}
                      </Badge>
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-primary" onClick={() => handleEdit(service)}><Edit2 className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-red-500" onClick={() => handleDelete(service.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setIsDialogOpen(open);
      }}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-xl rounded-2xl p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter leading-none mb-6">
              {editingId ? "Editar " : "Cadastrar "} <span className="text-primary">Serviço/Produto</span>
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 pl-1">Nome de Exibição</Label>
                  <Input 
                    {...form.register("name")}
                    className="bg-black border-white/10 h-12 rounded-xl font-bold italic"
                    placeholder="Ex: Corte Degradê"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 pl-1">Valor Unitário (Cents)</Label>
                  <Input 
                    type="number"
                    {...form.register("price", { valueAsNumber: true })}
                    className="bg-black border-white/10 h-12 rounded-xl font-black italic tracking-tighter"
                    placeholder="2500 p/ R$ 25.00"
                  />
                  <p className="text-[9px] text-zinc-600 font-bold uppercase pl-1">Multiplique o valor real por 100</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 pl-1">Link da Imagem (URL)</Label>
                  <Input 
                    {...form.register("imageUrl")}
                    className="bg-black border-white/10 h-12 rounded-xl font-medium text-xs"
                    placeholder="https://..."
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-black rounded-xl border border-white/10 mt-6">
                  <Label htmlFor="active-mode" className="text-xs font-black uppercase italic tracking-tighter">Disponível p/ Venda</Label>
                  <Switch 
                    id="active-mode" 
                    checked={form.watch("isActive")}
                    onCheckedChange={(checked) => form.setValue("isActive", checked)}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-4 pt-4">
              <Button type="button" variant="ghost" className="flex-1 h-12 font-black uppercase italic text-zinc-500 hover:text-white" onClick={() => setIsDialogOpen(false)}>CANCELAR</Button>
              <Button type="submit" className="flex-2 h-12 bg-primary text-black font-black uppercase italic shadow-lg" disabled={createService.isPending || updateService.isPending}>
                {editingId ? "SALVAR ALTERAÇÕES" : "CRIAR REGISTRO"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
