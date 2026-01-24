import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Printer, Scale, Wifi, WifiOff, Package, Calculator } from "lucide-react";
import { useState, useMemo } from "react";
import { Inventory } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function LabelSystem() {
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [bruto, setBruto] = useState("");
  const [tara, setTara] = useState("0.040");
  
  const { data: status } = useQuery<{ appConnected: boolean }>({
    queryKey: ["/api/labels/status"],
    refetchInterval: 3000
  });

  const { data: inventory = [] } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory"]
  });

  const printMutation = useMutation({
    mutationFn: async (labelData: any) => {
      const res = await apiRequest("POST", "/api/labels/print", labelData);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Impressão enviada!", description: "Aguardando confirmação do app Windows." });
    },
    onError: (err: any) => {
      toast({ title: "Erro na Impressão", description: err.message, variant: "destructive" });
    }
  });

  const pesoLiquido = Math.max(0, (parseFloat(bruto) || 0) - (parseFloat(tara) || 0));
  const total = pesoLiquido * ((selectedItem?.salePrice || 0) / 100);

  // Exemplo de nutrição (Mock para Catarina Banana)
  const nutricaoBase = {
    energia: 209,
    carbo: 39,
    proteina: 4.6,
    gordura: 3.8,
    sodio: 201,
    base: 60 // g
  };

  const fator = (pesoLiquido * 1000) / nutricaoBase.base;

  const handlePrint = () => {
    if (!selectedItem) return;
    
    const labelData = {
      produto: selectedItem.customName || "Produto",
      peso: pesoLiquido.toFixed(3),
      tara: parseFloat(tara).toFixed(3),
      precoKg: ((selectedItem.salePrice || 0) / 100).toFixed(2),
      total: total.toFixed(2),
      barcode: `20378000${Math.floor(total * 100).toString().padStart(6, '0')}000000`, // Exemplo de EAN-13 variável
      nutricao: {
        energia: Math.round(nutricaoBase.energia * fator),
        carbo: Math.round(nutricaoBase.carbo * fator),
        proteina: Math.round(nutricaoBase.proteina * fator),
        gordura: Math.round(nutricaoBase.gordura * fator),
        sodio: Math.round(nutricaoBase.sodio * fator)
      }
    };

    printMutation.mutate(labelData);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-900/50 p-6 rounded-2xl border border-white/10 backdrop-blur-xl gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">Sistema de <span className="text-primary">Etiquetas</span></h1>
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Controle Avançado SkelleTu</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          <Button 
            variant="outline" 
            className="h-12 px-6 border-purple-500/50 text-purple-500 hover:bg-purple-500/10 font-black uppercase italic tracking-widest text-sm shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all"
            onClick={() => window.open('/attached_assets/dist_windows/AuraPrinter.exe', '_blank')}
          >
            BAIXAR APP WINDOWS (.EXE)
          </Button>
          <div className="h-px w-full sm:h-12 sm:w-px bg-white/10" />
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${status?.appConnected ? 'bg-primary shadow-[0_0_10px_#00e5ff]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`} />
            <div className="flex flex-col">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${status?.appConnected ? 'text-primary' : 'text-red-500'}`}>
                Status de Conexão
              </span>
              <span className="text-white font-bold italic uppercase tracking-tighter text-sm">
                {status?.appConnected ? 'App Windows Conectado' : 'App Windows Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-zinc-900/50 border-white/10 rounded-2xl">
          <CardHeader className="border-b border-white/5 p-6">
            <CardTitle className="text-white uppercase italic text-xl font-black flex items-center gap-3">
              <Package className="w-6 h-6 text-primary" /> Seleção de Produto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20">
              {inventory.filter(i => i.itemType === 'custom').map(item => (
                <Button
                  key={item.id}
                  variant="outline"
                  className={`h-24 flex flex-col gap-1 border-white/5 transition-all ${selectedItem?.id === item.id ? 'border-primary bg-primary/10' : 'bg-black/20'}`}
                  onClick={() => setSelectedItem(item)}
                >
                  <span className="font-black uppercase italic tracking-tighter truncate w-full">{item.customName}</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">R$ {((item.salePrice || 0)/100).toFixed(2)}/Kg</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-white/10 rounded-2xl">
          <CardHeader className="border-b border-white/5 p-6">
            <CardTitle className="text-white uppercase italic text-xl font-black flex items-center gap-3">
              <Scale className="w-6 h-6 text-primary" /> Pesagem & Cálculo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Peso Bruto (Kg)</label>
              <Input
                type="number"
                step="0.001"
                value={bruto}
                onChange={e => setBruto(e.target.value)}
                className="h-16 text-3xl font-black italic bg-black border-white/10 text-primary text-center rounded-xl"
                placeholder="0.000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">TARA Embalagem (Kg)</label>
              <Input
                type="number"
                step="0.001"
                value={tara}
                onChange={e => setTara(e.target.value)}
                className="h-12 text-xl font-bold italic bg-black border-white/10 text-white/60 text-center rounded-xl"
              />
            </div>

            <div className="bg-black/40 p-6 rounded-2xl border border-primary/20 space-y-4 shadow-[0_0_30px_rgba(0,229,255,0.05)]">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Peso Líquido</span>
                <span className="text-white font-black italic text-2xl">{pesoLiquido.toFixed(3)} kg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-primary tracking-widest italic">Total a Pagar</span>
                <span className="text-primary font-black italic text-4xl shadow-primary">R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <Button
              className="w-full h-16 bg-primary hover:bg-white text-black font-black uppercase italic text-xl rounded-xl shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all flex gap-3"
              disabled={!selectedItem || !bruto || printMutation.isPending || !status?.appConnected}
              onClick={handlePrint}
            >
              {printMutation.isPending ? <Loader2 className="animate-spin" /> : (
                <>
                  <Printer className="w-6 h-6" /> IMPRIMIR ETIQUETA
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-zinc-900/50 border-white/10 rounded-2xl">
          <CardHeader className="p-6 border-b border-white/5">
            <CardTitle className="text-white uppercase italic text-lg font-black flex items-center gap-3">
              <Calculator className="w-5 h-5 text-purple-500" /> Tabela Nutricional Proporcional
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-2 gap-4">
            <div className="p-4 bg-black/40 rounded-xl border border-white/5">
              <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Valor Energético</p>
              <p className="text-white font-black italic text-xl">{Math.round(nutricaoBase.energia * fator)} kcal</p>
            </div>
            <div className="p-4 bg-black/40 rounded-xl border border-white/5">
              <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Carboidratos</p>
              <p className="text-white font-black italic text-xl">{Math.round(nutricaoBase.carbo * fator)} g</p>
            </div>
            <div className="p-4 bg-black/40 rounded-xl border border-white/5">
              <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Proteínas</p>
              <p className="text-white font-black italic text-xl">{Math.round(nutricaoBase.proteina * fator)} g</p>
            </div>
            <div className="p-4 bg-black/40 rounded-xl border border-white/5">
              <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Sódio</p>
              <p className="text-white font-black italic text-xl">{Math.round(nutricaoBase.sodio * fator)} mg</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-white/10 rounded-2xl overflow-hidden">
          <CardHeader className="p-6 border-b border-white/5 bg-white/5">
            <CardTitle className="text-white uppercase italic text-lg font-black">Monitor de Impressão</CardTitle>
          </CardHeader>
          <CardContent className="p-6 font-mono text-[10px] text-zinc-500 space-y-1">
            <p>[SYSTEM] Iniciando monitoramento...</p>
            <p className={status?.appConnected ? 'text-primary' : 'text-red-500'}>
              [WS] App Windows {status?.appConnected ? 'CONECTADO' : 'DESCONECTADO'}
            </p>
            <p>[DB] Inventário carregado: {inventory.length} itens.</p>
            {printMutation.isSuccess && <p className="text-primary">[LOG] Etiqueta enviada com sucesso às {new Date().toLocaleTimeString()}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
