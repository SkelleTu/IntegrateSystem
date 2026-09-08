import { useLocation } from "wouter";
import luxuryBg from "@assets/stock_images/professional_busines_cc21c314.jpg";
import auraLogo from "@assets/AURA_1768346008566.png";
import {
  ClipboardList, Landmark, Search, Lock,
  Clock, Star, Shield, Download, BookOpen, Power,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { MenuItem, Category } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTour } from "@/components/tour/TourContext";

function getTutorialKey(userId: number | string) {
  return `aura_tutorial_done_${userId}`;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth() as any;
  const { toast } = useToast();
  const { active, openModeSelect, stop } = useTour();

  // ── First-time detection ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const key = getTutorialKey(user.id);
    const done = localStorage.getItem(key);
    if (!done) {
      // Mark as seen immediately so it won't auto-open again on next visit
      localStorage.setItem(key, "1");
      // Slight delay so the dashboard renders first
      const t = setTimeout(() => openModeSelect(true), 600);
      return () => clearTimeout(t);
    }
  }, [user]);          // eslint-disable-line react-hooks/exhaustive-deps

  const handleNavigation = (url: string, adminOnly?: boolean) => {
    if (!user) { setLocation("/login"); return; }
    if (adminOnly && user?.role !== "admin") {
      toast({ title: "Acesso Negado", description: "Restrito ao proprietário.", variant: "destructive" });
      return;
    }
    setLocation(url);
  };

  const downloadWindowsApp = () => {
    const link = document.createElement("a");
    link.href = "/downloads/AuraSystem.exe";
    link.download = "AuraSystem.exe";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Download Iniciado", description: "Instalador Aura System para Windows." });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const menuItemsQuery = useQuery<MenuItem[]>({ queryKey: ["/api/menu-items"] });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const categoriesQuery = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const isFinanceLocked  = user?.role !== "admin";
  const isInventoryLocked = user?.role !== "admin";

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center p-4 md:p-8 lg:p-12 relative overflow-x-hidden font-body max-w-[2560px] mx-auto pt-20 md:pt-28">

      {/* ── Backgrounds ─────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 z-[-2] opacity-40 blur-[2px] bg-fixed bg-center bg-cover"
        style={{ backgroundImage: `url(${luxuryBg})`, backgroundPosition: "center 20%" }}
      />
      <div className="absolute inset-0 z-[-1] bg-gradient-to-b from-black/40 via-transparent to-black/60" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div
        data-tour="dashboard-header"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 mb-8 md:mb-16 mt-4 md:mt-8 w-full max-w-[1400px]"
      >
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:justify-center sm:text-left sm:gap-8 lg:gap-12">
          <div className="shrink-0 pointer-events-none select-none mb-4 sm:mb-0">
            <img
              src={auraLogo}
              alt="Aura"
              className="w-24 sm:w-36 md:w-48 lg:w-[240px] xl:w-[276px] h-auto drop-shadow-[0_0_40px_rgba(0,229,255,0.25)] opacity-90"
            />
          </div>
          <div className="relative z-10">
            <div className="inline-block px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-md mb-3 md:mb-5">
              <p className="text-primary text-[10px] md:text-xs tracking-[0.4em] font-bold uppercase">
                Plataforma Multi-Serviços
              </p>
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-black mb-3 tracking-tighter text-white italic leading-none uppercase">
              BEM-VINDO
            </h1>
            <p className="text-white/60 text-sm sm:text-base md:text-lg font-medium tracking-tight opacity-90 max-w-lg leading-relaxed">
              Selecione o módulo para iniciar seu atendimento personalizado.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Module cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-[1400px] z-10 mb-12 md:mb-20 px-2 auto-rows-fr justify-center mx-auto">
        {[
          { id: "caixa",      title: "Caixa",      icon: ClipboardList, path: "/caixa",     desc: "Gestão & Vendas",       locked: false,             admin: false, tourId: "card-caixa" },
          { id: "financeiro", title: "Financeiro",  icon: Landmark,      path: "/financeiro", desc: "Controle de Gastos",   locked: isFinanceLocked,   admin: true,  tourId: "card-financeiro" },
          { id: "estoque",    title: "Estoque",     icon: Search,        path: "/inventory",  desc: "Gestão de Mercadorias",locked: isInventoryLocked, admin: true,  tourId: "card-estoque" },
        ].map((item) => (
          <motion.div
            key={item.id}
            data-tour={item.tourId}
            whileHover={item.locked ? {} : { y: -5, scale: 1.02 }}
            whileTap={item.locked ? {} : { scale: 0.98 }}
            onClick={() => handleNavigation(item.path, item.admin)}
            className={`group relative h-full flex ${item.locked ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
          >
            <div className="absolute -inset-1 bg-gradient-to-b from-primary/10 to-transparent rounded-[1.5rem] blur-xl opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className={`relative bg-white/10 backdrop-blur-xl rounded-[1.5rem] p-6 md:p-8 flex flex-col items-center text-center border border-white/10 transition-all duration-500 w-full h-full justify-center shadow-none ${item.locked ? "" : "cursor-pointer hover:border-primary/40"}`}>
              {item.locked && <Lock className="absolute top-4 right-4 w-4 h-4 text-white/40" />}
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:border-primary/40 transition-all duration-500">
                <item.icon className="w-8 h-8 md:w-10 md:h-10 text-primary" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white mb-2 uppercase tracking-tighter italic">{item.title}</h2>
              <div className="h-1 w-10 bg-primary/30 rounded-full mb-3 group-hover:w-16 group-hover:bg-primary transition-all duration-500" />
              <p className="text-xs md:text-sm opacity-60 font-medium text-white leading-tight">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Benefits ────────────────────────────────────────────────────── */}
      <section
        data-tour="benefits-section"
        className="w-full max-w-7xl z-10 grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12 py-12 border-y border-white/5 mb-16 px-4"
      >
        {[
          { icon: Clock,  title: "Sem Filas",        desc: "Gerencie seu tempo com nossa fila virtual inteligente." },
          { icon: Star,   title: "Qualidade Premium", desc: "Profissionais qualificados e produtos de elite." },
          { icon: Shield, title: "Tradição",          desc: "O ambiente clássico com tecnologia moderna." },
        ].map((b, i) => (
          <div key={i} className="text-center">
            <b.icon className="w-10 h-10 md:w-12 md:h-12 text-primary mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="text-lg md:text-xl font-black text-white uppercase mb-2 italic">{b.title}</h3>
            <p className="text-white/60 text-xs md:text-sm font-medium">{b.desc}</p>
          </div>
        ))}
      </section>

      {/* ── Footer area — download + tutorial toggle ─────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col items-center gap-6 pb-8 z-10"
      >
        {/* Download */}
        <Button
          data-tour="download-btn"
          variant="outline"
          size="sm"
          className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-white/60"
          onClick={downloadWindowsApp}
        >
          <Download className="h-4 w-4" />
          Baixar Aura System (Windows)
        </Button>

        {/* ── Tutorial toggle ─────────────────────────────────────────── */}
        <div
          data-tour="tour-toggle"
          className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/30 transition-all group"
        >
          <BookOpen className="w-4 h-4 text-zinc-500 group-hover:text-primary transition-colors" />
          <span className="text-[11px] font-black uppercase tracking-widest text-white/40 group-hover:text-white/60 transition-colors">
            Modo Tutorial
          </span>
          {/* Toggle switch */}
          <button
            onClick={() => active ? stop() : openModeSelect(false)}
            className={`relative w-10 h-5 rounded-full transition-all duration-300 focus:outline-none ${
              active ? "bg-primary shadow-[0_0_12px_rgba(0,229,255,0.5)]" : "bg-white/10"
            }`}
            aria-label="Ativar ou desativar tutorial"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${
                active ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <Power className={`w-3.5 h-3.5 transition-colors ${active ? "text-primary" : "text-zinc-700"}`} />
        </div>

        <div className="text-[10px] md:text-xs tracking-[0.4em] text-white/40 uppercase font-black opacity-30">
          Aura Premium System v2.0
        </div>
      </motion.div>
    </div>
  );
}
