import { useState } from "react";
import { useLogin } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = useLogin();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login.mutateAsync({ username, password });
      setLocation("/app");
    } catch (err: any) {
      setError("Credenciais inválidas. Tente novamente.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent p-4 sm:p-6 lg:p-12 relative overflow-hidden font-body">
      {/* Dynamic Background Highlights */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg z-10"
      >
        {/* Advanced Glassmorphism Modal */}
        <div className="relative group">
          {/* Animated Glow Border */}
          <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/50 via-primary/5 to-primary/50 rounded-[2.5rem] md:rounded-[4rem] blur-sm opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
          
            <div className="relative glass-login-card bg-white/20 p-8 md:p-16 rounded-[2.5rem] md:rounded-[4rem] border-white/20 shadow-none overflow-hidden text-white">
              {/* Inner Sheen */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />
              
              {/* Subtle Top Glow Line */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              
              <div className="flex flex-col items-center mb-12 text-center relative z-10">
                <motion.div 
                  initial={{ rotate: -10, scale: 0.8 }}
                  animate={{ rotate: 12, scale: 1 }}
                  transition={{ duration: 0.8, ease: "backOut" }}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]"
                >
                  <ShieldCheck className="w-10 h-10 md:w-12 md:h-12 text-primary" />
                </motion.div>
                <h1 className="text-4xl md:text-6xl font-black italic text-white tracking-tighter uppercase leading-none mb-3 drop-shadow-2xl">
                  OWNER<span className="text-primary drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">ACCESS</span>
                </h1>
                <div className="flex items-center gap-3">
                  <div className="h-[1px] w-4 bg-primary/30" />
                  <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.5em] text-white/40">Terminal v2.0</p>
                  <div className="h-[1px] w-4 bg-primary/30" />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                <div className="space-y-3">
                  <Label htmlFor="username" className="text-[10px] uppercase font-black tracking-widest text-white pl-2">Identificação</Label>
                  <div className="relative group/input">
                    <Input 
                      id="username"
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-white/10 border-white/20 focus:border-primary/50 h-14 md:h-16 rounded-2xl text-white font-bold placeholder:text-white/60 px-6 transition-all focus:ring-4 focus:ring-primary/5 focus:ring-offset-0"
                      placeholder="USUÁRIO"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="password" className="text-[10px] uppercase font-black tracking-widest text-white pl-2">Chave de Acesso</Label>
                  <div className="relative group/input">
                    <Input 
                      id="password"
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-white/10 border-white/20 focus:border-primary/50 h-14 md:h-16 rounded-2xl text-white font-bold tracking-[0.5em] placeholder:tracking-normal placeholder:text-white/60 px-6 transition-all focus:ring-4 focus:ring-primary/5 focus:ring-offset-0"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-red-400 text-[10px] font-bold uppercase tracking-widest text-center bg-red-500/10 py-4 rounded-xl border border-red-500/20 backdrop-blur-md"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button 
                  type="submit" 
                  disabled={login.isPending}
                  className="w-full h-14 md:h-20 bg-primary hover:bg-primary/90 text-white transition-all duration-300 font-black italic text-xl md:text-2xl rounded-2xl md:rounded-3xl shadow-[0_0_40px_-5px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_-5px_rgba(16,185,129,0.5)] group overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  {login.isPending ? <Loader2 className="h-8 w-8 animate-spin" /> : (
                    <span className="flex items-center justify-center gap-3">
                      AUTENTICAR
                    </span>
                  )}
                </Button>
                
                <div className="flex flex-col items-center gap-4 mt-8">
                  <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <p className="text-[8px] md:text-[10px] font-bold text-white/75 uppercase tracking-[0.4em]">
                      Conexão Segura Ativa
                    </p>
                  </div>
                </div>
              </form>
            </div>
        </div>
      </motion.div>
    </div>
  );
}
