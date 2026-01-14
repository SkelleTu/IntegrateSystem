import { Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import auraLogo from "@assets/AURA_1768346008566.png";
import contactBg from "@assets/generated_images/abstract_connection_network_with_glowing_communication_nodes..png";

export default function Contact() {
  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 blur-[2px] scale-105"
        style={{ backgroundImage: `url(${contactBg})`, backgroundSize: 'cover' }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />

      <main className="relative z-10 pt-32 pb-20 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-start">
          <div className="space-y-12">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter">
                Fale com a <span className="text-primary">Elite</span>
              </h1>
              <p className="text-zinc-500 text-lg font-medium leading-relaxed">
                Nossa equipe de especialistas está pronta para acelerar seu negócio. Resposta garantida em até 2 horas.
              </p>
            </div>

            <div className="space-y-8">
              {[
                { icon: Mail, label: "E-mail Corporativo", value: "vfdiogoseg@outlook.com" },
                { icon: Phone, label: "Suporte Técnico", value: "(19) 99723-8298" },
                { icon: MapPin, label: "Headquarters", value: "São Paulo, SP - Brasil" }
              ].map((item, i) => (
                <div key={i} className="flex gap-6 items-center group transition-all">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-primary/40 transition-all">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em]">{item.label}</p>
                    <p className="font-bold text-zinc-300 group-hover:text-white transition-colors">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] backdrop-blur-3xl space-y-8 relative group hover:border-primary/20 transition-all">
            <h3 className="text-2xl font-black uppercase text-primary">Envie uma Mensagem</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-2">Nome Completo</label>
                <Input className="bg-white/10 border-white/10 h-14 rounded-2xl focus:border-primary/50 text-white font-bold" placeholder="SEU NOME" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-2">E-mail</label>
                <Input className="bg-white/10 border-white/10 h-14 rounded-2xl focus:border-primary/50 text-white font-bold" placeholder="EMAIL@EXEMPLO.COM" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-2">Mensagem</label>
                <Textarea className="bg-white/10 border-white/10 rounded-2xl focus:border-primary/50 text-white font-bold min-h-[150px]" placeholder="COMO PODEMOS AJUDAR?" />
              </div>
              <Button className="w-full h-16 bg-primary text-white font-black uppercase text-lg rounded-2xl hover:scale-105 transition-transform shadow-[0_0_30px_rgba(0,229,255,0.4)]">
                Enviar Requisição <Send className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-16 px-6 bg-black/80 backdrop-blur-lg mt-20">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-12">
          <div className="flex flex-col items-center gap-4 group transition-all">
            <img src={auraLogo} alt="Aura Logo" className="h-10 w-auto drop-shadow-[0_0_15px_rgba(0,229,255,0.3)]" />
            <span className="font-black text-sm tracking-widest text-zinc-500 uppercase">Aura System © 2026</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-12">
            <a href="/privacy" className="group flex flex-col items-center gap-2 text-zinc-400 hover:text-primary transition-all duration-300">
              <span className="text-xs font-black uppercase tracking-[0.4em] mb-1">Privacidade</span>
              <div className="h-0.5 w-0 group-hover:w-full bg-primary transition-all duration-500 shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
            </a>
            <a href="/terms" className="group flex flex-col items-center gap-2 text-zinc-400 hover:text-primary transition-all duration-300">
              <span className="text-xs font-black uppercase tracking-[0.4em] mb-1">Termos</span>
              <div className="h-0.5 w-0 group-hover:w-full bg-primary transition-all duration-500 shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
