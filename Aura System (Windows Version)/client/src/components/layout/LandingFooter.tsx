import auraLogo from "@assets/AURA_1768346008566.png";

export function LandingFooter() {
  return (
    <footer className="mt-24 w-full max-w-4xl mx-auto text-center space-y-4 border-t border-white/10 pt-12 relative z-10 pb-12">
      <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.3em]">Informações da Empresa</p>
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-zinc-400 font-medium">
        <div className="flex items-center gap-2">
          <span className="text-primary text-[10px] font-black">CPF:</span>
          <span className="text-sm">465.048.898-21</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-primary text-[10px] font-black">SUPORTE:</span>
          <span className="text-sm">(19) 99723-8298</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-primary text-[10px] font-black">AURA SYSTEM © 2026</span>
        </div>
      </div>
    </footer>
  );
}
