import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2, Plus, ChevronRight, Loader2, Store, Scissors,
  Coffee, UtensilsCrossed, Sparkles, ShoppingBag, Check,
} from "lucide-react";
import auraLogo from "@assets/AURA_1768346008566.png";

const BUSINESS_TYPES = [
  { value: "barbearia",    label: "Barbearia",    icon: Scissors },
  { value: "salao",        label: "Salão de Beleza", icon: Sparkles },
  { value: "restaurante",  label: "Restaurante",  icon: UtensilsCrossed },
  { value: "cafeteria",    label: "Cafeteria",    icon: Coffee },
  { value: "loja",         label: "Loja / Varejo", icon: ShoppingBag },
  { value: "outro",        label: "Outro",        icon: Store },
];

type Enterprise = {
  id: number;
  name: string;
  businessType: string | null;
  slug: string;
  status: string;
};

export default function SetupEnterprise() {
  const { data: user } = useUser();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"list" | "create">("list");
  const [form, setForm] = useState({
    name: "",
    businessType: "barbearia",
    taxId: "",
    phone: "",
    address: "",
    city: "",
    state: "",
  });

  // Buscar estabelecimentos do usuário
  const { data: enterprises = [], isLoading } = useQuery<Enterprise[]>({
    queryKey: ["/api/my-enterprises"],
    queryFn: async () => {
      const res = await fetch("/api/my-enterprises", { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao buscar estabelecimentos");
      return res.json();
    },
  });

  // Criar estabelecimento
  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/my-enterprises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Erro ao criar estabelecimento");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-enterprises"] });
      setLocation("/app");
    },
  });

  // Selecionar estabelecimento existente
  const selectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/my-enterprises/${id}/select`, {
        method: "PUT",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao selecionar estabelecimento");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setLocation("/app");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    createMutation.mutate(form);
  };

  const canCreate = enterprises.length < 5;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(0,255,102,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,102,1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <img src={auraLogo} alt="Aura" className="h-12 w-auto opacity-90" />
        </div>

        <AnimatePresence mode="wait">
          {/* ── LISTA / SELEÇÃO ────────────────────────────────────────────── */}
          {mode === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-5">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">
                  {enterprises.length === 0 ? "Crie seu Estabelecimento" : "Seus Estabelecimentos"}
                </h1>
                <p className="text-white/40 text-sm font-medium">
                  {enterprises.length === 0
                    ? "Configure seu negócio para começar a operar na plataforma."
                    : `${enterprises.length} de 5 estabelecimentos cadastrados. Selecione um para entrar.`}
                </p>
              </div>

              {/* Lista de estabelecimentos existentes */}
              {enterprises.length > 0 && (
                <div className="space-y-3 mb-6">
                  {enterprises.map((e) => {
                    const btype = BUSINESS_TYPES.find(b => b.value === e.businessType) ?? BUSINESS_TYPES[5];
                    const Icon = btype.icon;
                    return (
                      <motion.button
                        key={e.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => selectMutation.mutate(e.id)}
                        disabled={selectMutation.isPending}
                        className="w-full flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-primary/30 transition-all text-left group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-base truncate">{e.name}</p>
                          <p className="text-white/40 text-xs font-medium mt-0.5">{btype.label}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {selectMutation.isPending ? (
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-primary transition-colors" />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Botão criar novo */}
              {canCreate ? (
                <button
                  onClick={() => setMode("create")}
                  className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl border border-dashed border-white/20 hover:border-primary/40 hover:bg-primary/5 transition-all text-white/50 hover:text-primary group"
                >
                  <div className="w-10 h-10 rounded-xl border border-white/10 group-hover:border-primary/30 flex items-center justify-center transition-colors">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm uppercase tracking-widest">
                    {enterprises.length === 0 ? "Criar Estabelecimento" : "Adicionar Estabelecimento"}
                  </span>
                </button>
              ) : (
                <div className="w-full p-4 rounded-2xl border border-white/5 bg-white/[0.02] text-center text-white/30 text-xs font-bold uppercase tracking-widest">
                  Limite de 5 estabelecimentos atingido
                </div>
              )}
            </motion.div>
          )}

          {/* ── FORMULÁRIO DE CRIAÇÃO ──────────────────────────────────────── */}
          {mode === "create" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-5">
                  <Plus className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">
                  Novo Estabelecimento
                </h1>
                <p className="text-white/40 text-sm font-medium">
                  Preencha as informações do seu negócio.
                </p>
              </div>

              <form onSubmit={handleCreate} className="space-y-5">
                {/* Tipo de Negócio */}
                <div>
                  <Label className="text-[10px] uppercase font-black tracking-widest text-white/60 mb-3 block">
                    Tipo de Negócio
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {BUSINESS_TYPES.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, businessType: value }))}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                          form.businessType === value
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-white/10 bg-white/[0.03] text-white/40 hover:border-white/20 hover:text-white/60"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider leading-tight text-center">
                          {label}
                        </span>
                        {form.businessType === value && (
                          <Check className="w-3 h-3 absolute" style={{ display: "none" }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nome */}
                <div>
                  <Label className="text-[10px] uppercase font-black tracking-widest text-white/60 mb-2 block">
                    Nome do Estabelecimento *
                  </Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Barbearia do João"
                    required
                    className="bg-white/5 border-white/10 focus:border-primary/40 h-12 rounded-xl text-white placeholder:text-white/30 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* CNPJ/CPF */}
                  <div>
                    <Label className="text-[10px] uppercase font-black tracking-widest text-white/60 mb-2 block">
                      CNPJ / CPF
                    </Label>
                    <Input
                      value={form.taxId}
                      onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))}
                      placeholder="00.000.000/0001-00"
                      className="bg-white/5 border-white/10 focus:border-primary/40 h-12 rounded-xl text-white placeholder:text-white/30 font-medium"
                    />
                  </div>

                  {/* Telefone */}
                  <div>
                    <Label className="text-[10px] uppercase font-black tracking-widest text-white/60 mb-2 block">
                      Telefone
                    </Label>
                    <Input
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="(00) 00000-0000"
                      className="bg-white/5 border-white/10 focus:border-primary/40 h-12 rounded-xl text-white placeholder:text-white/30 font-medium"
                    />
                  </div>
                </div>

                {/* Endereço */}
                <div>
                  <Label className="text-[10px] uppercase font-black tracking-widest text-white/60 mb-2 block">
                    Endereço
                  </Label>
                  <Input
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Rua, número, bairro"
                    className="bg-white/5 border-white/10 focus:border-primary/40 h-12 rounded-xl text-white placeholder:text-white/30 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] uppercase font-black tracking-widest text-white/60 mb-2 block">
                      Cidade
                    </Label>
                    <Input
                      value={form.city}
                      onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                      placeholder="São Paulo"
                      className="bg-white/5 border-white/10 focus:border-primary/40 h-12 rounded-xl text-white placeholder:text-white/30 font-medium"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-black tracking-widest text-white/60 mb-2 block">
                      Estado
                    </Label>
                    <Input
                      value={form.state}
                      onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                      placeholder="SP"
                      maxLength={2}
                      className="bg-white/5 border-white/10 focus:border-primary/40 h-12 rounded-xl text-white placeholder:text-white/30 font-medium uppercase"
                    />
                  </div>
                </div>

                {/* Erro */}
                {createMutation.error && (
                  <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-bold uppercase tracking-widest text-center">
                    {(createMutation.error as Error).message}
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-3 pt-2">
                  {enterprises.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMode("list")}
                      className="flex-1 h-12 rounded-xl border-white/10 text-white/60 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest text-xs"
                    >
                      Voltar
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || !form.name.trim()}
                    className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-sm shadow-[0_0_30px_-5px_rgba(0,255,102,0.3)]"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Criar Estabelecimento"
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
