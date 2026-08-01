import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, X, Zap, BookOpen, Play,
  CheckCircle2, Timer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTour } from "./TourContext";
import type { TourStep } from "./types";
import { quickSteps, detailedSteps } from "./steps";

// ─── Spotlight rect ───────────────────────────────────────────────────────────

interface SpotRect {
  top: number;
  left: number;
  width: number;
  height: number;
  borderRadius: number;
}

function getRect(target: string, padding: number): SpotRect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top - padding,
    left: r.left - padding,
    width: r.width + padding * 2,
    height: r.height + padding * 2,
    borderRadius: 16,
  };
}

// ─── Tooltip position ─────────────────────────────────────────────────────────

function tooltipSide(rect: SpotRect, preferred?: TourStep["position"]): "top" | "bottom" {
  if (preferred === "top") return "top";
  if (preferred === "bottom") return "bottom";
  // auto: prefer bottom, fallback top if near bottom of viewport
  const spaceBelow = window.innerHeight - (rect.top + rect.height);
  return spaceBelow >= 220 ? "bottom" : "top";
}

// ─── Mode-selection card (shown when mode is null) ────────────────────────────

function ModeSelectCard({ isFirstTime, onSelect, onClose }: {
  isFirstTime: boolean;
  onSelect: (mode: "quick" | "detailed") => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      key="mode-select"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)", pointerEvents: "auto" }}
    >
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 20 }}
      transition={{ type: "spring", damping: 22, stiffness: 280 }}
      className="w-full max-w-md"
      style={{ pointerEvents: "auto" }}
    >
      <div
        className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl"
        style={{ pointerEvents: "auto" }}
      >
        {/* Glow bar */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Close — only if not first time */}
        {!isFirstTime && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.3em]">
              <Zap className="w-3 h-3" />
              {isFirstTime ? "Primeiro Acesso — Obrigatório" : "Modo Tutorial"}
            </div>
            <h2 className="text-2xl font-black uppercase text-white tracking-tighter italic">
              Como deseja <span className="text-primary">aprender</span>?
            </h2>
            <p className="text-zinc-500 text-sm font-medium leading-relaxed">
              {isFirstTime
                ? "Escolha como quer conhecer o sistema antes de começar a usar."
                : "Escolha o estilo de tour para revisar a plataforma."}
            </p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => onSelect("quick")}
              className="group relative p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
            >
              <Play className="w-7 h-7 text-primary mb-3 drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]" />
              <p className="text-white font-black uppercase text-base tracking-tighter italic mb-1">Tutorial Rápido</p>
              <p className="text-zinc-500 text-xs leading-relaxed">Visão geral dos módulos principais em poucos passos.</p>
              <div className="mt-3 flex items-center gap-1 text-primary text-[10px] font-black uppercase tracking-widest">
                <Timer className="w-3 h-3" /> ~2 min · {quickSteps.length} passos
              </div>
            </button>

            <button
              onClick={() => onSelect("detailed")}
              className="group relative p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/50 hover:bg-amber-400/5 transition-all text-left"
            >
              <BookOpen className="w-7 h-7 text-amber-400 mb-3 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
              <p className="text-white font-black uppercase text-base tracking-tighter italic mb-1">Tutorial Detalhado</p>
              <p className="text-zinc-500 text-xs leading-relaxed">Guia completo de todas as funções e dicas avançadas.</p>
              <div className="mt-3 flex items-center gap-1 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                <Timer className="w-3 h-3" /> ~5 min · {detailedSteps.length} passos
              </div>
            </button>
          </div>

          {isFirstTime && (
            <p className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
              Selecione uma opção para continuar
            </p>
          )}
        </div>
      </div>
    </motion.div>
  </motion.div>
  );
}

// ─── Spotlight + tooltip ──────────────────────────────────────────────────────

function SpotlightStep({ step, stepIndex, totalSteps, isFirstTime, onNext, onPrev, onStop }: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  isFirstTime: boolean;
  onNext: () => void;
  onPrev: () => void;
  onStop: () => void;
}) {
  const [rect, setRect] = useState<SpotRect | null>(null);
  const rafRef = useRef<number>();

  const updateRect = useCallback(() => {
    if (!step.target) { setRect(null); return; }
    const r = getRect(step.target, step.padding ?? 12);
    setRect(r);
  }, [step.target, step.padding]);

  // Scroll the target into view, then measure
  useEffect(() => {
    if (step.target) {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Wait for scroll to settle before measuring
        const t = setTimeout(() => updateRect(), 350);
        return () => clearTimeout(t);
      }
    } else {
      setRect(null);
    }
  }, [step.target, updateRect]);

  // Recompute on resize / scroll
  useEffect(() => {
    const handler = () => {
      cancelAnimationFrame(rafRef.current!);
      rafRef.current = requestAnimationFrame(updateRect);
    };
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
      cancelAnimationFrame(rafRef.current!);
    };
  }, [updateRect]);

  const isLast = stepIndex === totalSteps - 1;
  const isFirst = stepIndex === 0;

  // If no target → centered card (no spotlight)
  if (!step.target || !rect) {
    return (
      <motion.div
        key={`card-${stepIndex}`}
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 24 }}
        transition={{ type: "spring", damping: 22, stiffness: 260 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl"
          style={{ pointerEvents: "auto" }}
        >
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/15 rounded-full blur-[80px] pointer-events-none" />

          <div className="p-8 space-y-5">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">
                Passo {stepIndex + 1} de {totalSteps}
              </p>
              <h2 className="text-2xl font-black uppercase text-white tracking-tighter italic leading-tight">
                {step.title}
              </h2>
            </div>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed">{step.description}</p>
            <ProgressDots total={totalSteps} current={stepIndex} />
            <NavButtons
              isFirst={isFirst}
              isLast={isLast}
              isFirstTime={isFirstTime}
              onPrev={onPrev}
              onNext={onNext}
              onStop={onStop}
            />
          </div>
        </div>
      </motion.div>
    );
  }

  // Spotlight card
  const side = tooltipSide(rect, step.position);
  const tooltipTop = side === "bottom"
    ? rect.top + rect.height + 16
    : rect.top - 16; // position bottom edge of tooltip here

  const tooltipLeft = Math.min(
    Math.max(rect.left + rect.width / 2 - 192, 12),
    window.innerWidth - 396
  );

  return (
    <>
      {/* Dark overlay using box-shadow trick on the spotlight div */}
      <motion.div
        key={`spot-${stepIndex}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          position: "fixed",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: rect.borderRadius,
          // The massive box-shadow IS the dark overlay
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.80)",
          zIndex: 9998,
          pointerEvents: "none",
        }}
      />

      {/* Animated glowing border on the spotlight */}
      <motion.div
        key={`border-${stepIndex}`}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.3, type: "spring", damping: 20, stiffness: 250 }}
        style={{
          position: "fixed",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: rect.borderRadius,
          zIndex: 9999,
          pointerEvents: "none",
          border: "2px solid rgba(0,229,255,0.8)",
          boxShadow: "0 0 0 4px rgba(0,229,255,0.15), 0 0 24px rgba(0,229,255,0.4), inset 0 0 20px rgba(0,229,255,0.05)",
        }}
        // Subtle pulse animation via style
        className="tour-spotlight-border"
      />

      {/* Tooltip card */}
      <motion.div
        key={`tooltip-${stepIndex}`}
        initial={{ opacity: 0, y: side === "bottom" ? -10 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: side === "bottom" ? -10 : 10 }}
        transition={{ delay: 0.15, duration: 0.25, type: "spring", damping: 22 }}
        style={{
          position: "fixed",
          left: tooltipLeft,
          ...(side === "bottom"
            ? { top: tooltipTop }
            : { bottom: window.innerHeight - tooltipTop }),
          width: 384,
          zIndex: 10000,
          pointerEvents: "auto",
        }}
      >
        <div className="bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          {/* Top glow line */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          {/* Arrow pointing to spotlight */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
            style={
              side === "bottom"
                ? { top: -8, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: "8px solid rgba(0,229,255,0.3)" }
                : { bottom: -8, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid rgba(0,229,255,0.3)" }
            }
          />

          <div className="p-5 space-y-4">
            {/* Step counter */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.25em]">
                Passo {stepIndex + 1} de {totalSteps}
              </span>
              {!isFirstTime && (
                <button
                  onClick={onStop}
                  className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black uppercase text-white tracking-tighter italic leading-tight">
                {step.title}
              </h3>
              <p className="text-zinc-400 text-xs font-medium leading-relaxed">{step.description}</p>
            </div>

            <ProgressDots total={totalSteps} current={stepIndex} />

            <NavButtons
              isFirst={isFirst}
              isLast={isLast}
              isFirstTime={isFirstTime}
              onPrev={onPrev}
              onNext={onNext}
              onStop={onStop}
            />
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1 rounded-full transition-all duration-300"
          style={{
            width: i === current ? 20 : 6,
            background: i === current
              ? "rgba(0,229,255,1)"
              : i < current
              ? "rgba(0,229,255,0.3)"
              : "rgba(255,255,255,0.1)",
          }}
        />
      ))}
    </div>
  );
}

function NavButtons({ isFirst, isLast, isFirstTime, onPrev, onNext, onStop }: {
  isFirst: boolean;
  isLast: boolean;
  isFirstTime: boolean;
  onPrev: () => void;
  onNext: () => void;
  onStop: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onPrev}
        className="flex items-center gap-1 text-white/40 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
      >
        <ArrowLeft className="w-3 h-3" />
        {isFirst ? "Mudar modo" : "Anterior"}
      </button>

      <div className="flex-1" />

      {!isFirstTime && !isLast && (
        <button
          onClick={onStop}
          className="text-[10px] font-bold text-zinc-600 hover:text-zinc-400 uppercase tracking-widest transition-colors"
        >
          Pular
        </button>
      )}

      <button
        onClick={onNext}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-xs tracking-tighter transition-all ${
          isLast
            ? "bg-green-500 hover:bg-green-400 text-white shadow-[0_0_16px_rgba(74,222,128,0.5)]"
            : "bg-primary hover:bg-cyan-300 text-black shadow-[0_0_12px_rgba(0,229,255,0.4)]"
        }`}
      >
        {isLast ? (
          <><CheckCircle2 className="w-3 h-3" /> Concluir</>
        ) : (
          <>Próximo <ArrowRight className="w-3 h-3" /></>
        )}
      </button>
    </div>
  );
}

// ─── Root engine — renders via portal ────────────────────────────────────────

export function TourEngine() {
  const { active, mode, stepIndex, steps, isFirstTime, startMode, next, prev, stop } = useTour();

  if (!active) return null;

  return createPortal(
    <>
      {/* Dark backdrop (behind everything except the spotlight) */}
      <AnimatePresence>
        {active && mode && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9990,
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {mode === null ? (
          <ModeSelectCard
            key="mode-select"
            isFirstTime={isFirstTime}
            onSelect={startMode}
            onClose={stop}
          />
        ) : (
          steps[stepIndex] && (
            <SpotlightStep
              key={`step-${stepIndex}`}
              step={steps[stepIndex]}
              stepIndex={stepIndex}
              totalSteps={steps.length}
              isFirstTime={isFirstTime}
              onNext={next}
              onPrev={prev}
              onStop={stop}
            />
          )
        )}
      </AnimatePresence>

      {/* Click-blocker overlay when mode is selected (lets spotlight target be unobscured) */}
      {active && mode && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9989,
            pointerEvents: "auto",
            background: "transparent",
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </>,
    document.body
  );
}
