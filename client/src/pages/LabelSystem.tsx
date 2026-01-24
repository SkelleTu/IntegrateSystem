import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Printer, 
  Scale, 
  Wifi, 
  WifiOff, 
  Package, 
  Calculator, 
  Download, 
  Zap, 
  Cpu, 
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  History,
  Settings,
  Monitor,
  Plus,
  Trash2,
  RefreshCw
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
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
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto min-h-screen bg-transparent">
      {/* Hero Section Sensacional */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-primary/20 bg-black/40 backdrop-blur-xl p-8 md:p-12 mb-12 group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/5 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.3em]">
              <Zap className="w-3 h-3" /> Tecnologia de Ponta
            </div>
            <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-white leading-none">
              Aura <span className="text-primary drop-shadow-[0_0_15px_rgba(0,229,255,0.5)]">Printer</span>
            </h1>
            <p className="text-zinc-400 text-lg md:text-xl font-medium max-w-xl leading-relaxed">
              O <span className="text-white font-bold">Aura Label Gateway</span> é a ponte definitiva entre a inteligência da nuvem e a precisão do seu hardware. Velocidade instantânea, precisão cirúrgica.
            </p>
            <div className="flex flex-wrap gap-4 pt-4 justify-center md:justify-start">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-white/60 text-[10px] font-black uppercase">Conexão Segura</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <Cpu className="w-4 h-4 text-primary" />
                <span className="text-white/60 text-[10px] font-black uppercase">Zero Latência</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 bg-white/5 p-8 rounded-[2rem] border border-white/10 backdrop-blur-md hover:border-primary/40 transition-all duration-500">
            <div className="w-24 h-24 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shadow-[0_0_30px_rgba(0,229,255,0.2)]">
              <Download className="w-10 h-10 text-primary animate-bounce" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-white font-black uppercase tracking-tighter text-xl">Download v1.0</h3>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Windows x64 Executable</p>
            </div>
            <Button 
              size="lg"
              className="bg-primary hover:bg-primary/90 text-black font-black uppercase px-8 py-6 text-lg rounded-2xl shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:scale-105 transition-all"
              onClick={() => window.open("/attached_assets/dist_windows/AuraPrinter.exe", "_blank")}
            >
              BAIXAR AGORA
            </Button>
          </div>
        </div>
      </div>

      {/* Como Funciona Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
        {[
          { 
            step: "01", 
            title: "DOWNLOAD & START", 
            desc: "Baixe o Aura Printer e execute no seu Windows. Ele é leve, portátil e não precisa de instalação complexa.",
            icon: Download 
          },
          { 
            step: "02", 
            title: "CLOUD SYNC", 
            desc: "O app se conecta instantaneamente ao servidor via WebSockets, criando um túnel de comunicação ultra-seguro.",
            icon: Zap 
          },
          { 
            step: "03", 
            title: "MAGIC PRINT", 
            desc: "Ao clicar em imprimir no Aura Web, o comando viaja pela nuvem e sai direto na sua impressora física.",
            icon: Printer 
          }
        ].map((item, i) => (
          <div key={i} className="p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:border-primary/30 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 text-6xl font-black text-white/5 italic group-hover:text-primary/10 transition-colors">
              {item.step}
            </div>
            <item.icon className="w-12 h-12 text-primary mb-6 drop-shadow-[0_0_10px_rgba(0,229,255,0.4)]" />
            <h3 className="text-white font-black uppercase text-xl mb-3 tracking-tighter">{item.title}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed font-medium">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Status Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-800/20 p-6 rounded-2xl border border-white/10 backdrop-blur-sm gap-6 mt-12">
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
